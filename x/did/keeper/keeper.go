package keeper

import (
	"context"
	"fmt"
	"time"
	"strconv"
	"strings"

	"cosmossdk.io/core/store"
	"cosmossdk.io/log"
	"cosmossdk.io/store/prefix"
	storetypes "cosmossdk.io/store/types"
	"cosmossdk.io/core/comet"
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/runtime"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/errors"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	govtypes "github.com/cosmos/cosmos-sdk/x/gov/types"

	"github.com/persona-chain/persona-chain/x/did/types"
)

type (
	Keeper struct {
		cdc        codec.BinaryCodec
		storeService store.KVStoreService
		logger     log.Logger

		// the address capable of executing a MsgUpdateParams message. Typically, this
		// should be the x/gov module account.
		authority string

		paramstore paramtypes.Subspace

		accountKeeper types.AccountKeeper
		bankKeeper    types.BankKeeper
		
		// Enterprise features
		cometService  comet.Service
		hsmEnabled    bool
		auditEnabled  bool
	}
)

func NewKeeper(
	cdc codec.BinaryCodec,
	storeService store.KVStoreService,
	ps paramtypes.Subspace,
	accountKeeper types.AccountKeeper,
	bankKeeper types.BankKeeper,
	cometService comet.Service,
	hsmEnabled bool,
	auditEnabled bool,
) Keeper {
	// set KeyTable if it has not already been set
	if !ps.HasKeyTable() {
		ps = ps.WithKeyTable(types.ParamKeyTable())
	}

	return Keeper{
		cdc:           cdc,
		storeService:  storeService,
		authority:     authtypes.NewModuleAddress(govtypes.ModuleName).String(),
		paramstore:    ps,
		accountKeeper: accountKeeper,
		bankKeeper:    bankKeeper,
		cometService:  cometService,
		hsmEnabled:    hsmEnabled,
		auditEnabled:  auditEnabled,
		logger:        log.NewNopLogger(),
	}
}

func (k Keeper) GetAuthority() string {
	return k.authority
}

func (k Keeper) Logger(ctx context.Context) log.Logger {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	return k.logger.With("module", fmt.Sprintf("x/%s", types.ModuleName))
}

// SetDidDocument set a specific didDocument in the store with enterprise features
func (k Keeper) SetDidDocument(ctx context.Context, didDocument types.DIDDocument) error {
	// Validate document before storing
	if err := didDocument.Validate(); err != nil {
		return errors.Wrapf(types.ErrInvalidDID, "validation failed: %v", err)
	}
	
	// Check if document already exists for update vs create
	existing, found := k.GetDidDocument(ctx, didDocument.ID)
	if found {
		// Version control check
		if didDocument.Version <= existing.Version {
			return errors.Wrapf(types.ErrVersionConflict, "new version %d must be greater than current version %d", didDocument.Version, existing.Version)
		}
		
		// Archive previous version
		if err := k.setDocumentVersion(ctx, existing); err != nil {
			return errors.Wrapf(types.ErrVersionConflict, "failed to archive previous version: %v", err)
		}
	}
	
	// Set blockchain metadata
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	if k.cometService != nil {
		cometInfo := k.cometService.CometInfo(ctx)
		didDocument.BlockHeight = cometInfo.LastCommit.Height
		didDocument.ChainID = sdkCtx.ChainID()
	}
	
	// Update timestamps
	now := time.Now()
	didDocument.UpdatedAt = now
	didDocument.Metadata.Updated = now
	
	// Store main document
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.DIDDocumentKeyPrefix))
	b := k.cdc.MustMarshal(&didDocument)
	store.Set(types.DIDDocumentKey(didDocument.ID), b)
	
	// Store metadata for efficient queries
	if err := k.setDocumentMetadata(ctx, didDocument); err != nil {
		k.Logger(ctx).Error("Failed to store document metadata", "did", didDocument.ID, "error", err)
		// Non-fatal error, continue
	}
	
	// Store audit log
	if k.auditEnabled {
		if err := k.recordAuditLog(ctx, "document_updated", didDocument.ID, didDocument.Creator, didDocument); err != nil {
			k.Logger(ctx).Error("Failed to record audit log", "did", didDocument.ID, "error", err)
			// Non-fatal error, continue
		}
	}
	
	k.Logger(ctx).Info("DID document stored successfully", 
		"did", didDocument.ID, 
		"version", didDocument.Version,
		"creator", didDocument.Creator)
	
	return nil
}

// GetDidDocument returns a didDocument from its index with enhanced error handling
func (k Keeper) GetDidDocument(
	ctx context.Context,
	id string,
) (val types.DIDDocument, found bool) {
	// Validate DID format
	if !types.IsValidDIDFormat(id) {
		k.Logger(ctx).Debug("Invalid DID format requested", "did", id)
		return val, false
	}
	
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.DIDDocumentKeyPrefix))

	b := store.Get(types.DIDDocumentKey(id))
	if b == nil {
		return val, false
	}

	err := k.cdc.Unmarshal(b, &val)
	if err != nil {
		k.Logger(ctx).Error("Failed to unmarshal DID document", "did", id, "error", err)
		return val, false
	}
	
	// Record access audit
	if k.auditEnabled {
		if err := k.recordAuditLog(ctx, "document_accessed", id, "", map[string]interface{}{
			"timestamp": time.Now(),
			"version": val.Version,
		}); err != nil {
			k.Logger(ctx).Debug("Failed to record access audit", "did", id, "error", err)
		}
	}
	
	return val, true
}

// RemoveDidDocument removes a didDocument from the store
func (k Keeper) RemoveDidDocument(
	ctx context.Context,
	id string,

) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.DidDocumentKeyPrefix))
	store.Delete(types.DidDocumentKey(
		id,
	))
}

// GetAllDidDocument returns all didDocument with pagination and filtering
func (k Keeper) GetAllDidDocument(ctx context.Context) (list []types.DIDDocument) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.DIDDocumentKeyPrefix))
	iterator := storetypes.KVStorePrefixIterator(store, []byte{})

	defer iterator.Close()

	for ; iterator.Valid(); iterator.Next() {
		var val types.DIDDocument
		err := k.cdc.Unmarshal(iterator.Value(), &val)
		if err != nil {
			k.Logger(ctx).Error("Failed to unmarshal DID document during iteration", "error", err)
			continue
		}
		list = append(list, val)
	}

	return
}

// DidDocumentExists checks if a DID document exists
func (k Keeper) DidDocumentExists(ctx context.Context, id string) bool {
	_, found := k.GetDidDocument(ctx, id)
	return found
}

// ===== ENTERPRISE FEATURES =====

// setDocumentVersion stores a versioned copy of the document
func (k Keeper) setDocumentVersion(ctx context.Context, doc types.DIDDocument) error {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.DIDVersionKeyPrefix))
	
	versionKey := types.DIDVersionKey(doc.ID, doc.Version)
	b := k.cdc.MustMarshal(&doc)
	store.Set(versionKey, b)
	
	k.Logger(ctx).Debug("Archived document version", "did", doc.ID, "version", doc.Version)
	return nil
}

// GetDocumentVersion retrieves a specific version of a DID document
func (k Keeper) GetDocumentVersion(ctx context.Context, id string, version uint64) (types.DIDDocument, bool) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.DIDVersionKeyPrefix))
	
	versionKey := types.DIDVersionKey(id, version)
	b := store.Get(versionKey)
	if b == nil {
		return types.DIDDocument{}, false
	}
	
	var doc types.DIDDocument
	err := k.cdc.Unmarshal(b, &doc)
	if err != nil {
		k.Logger(ctx).Error("Failed to unmarshal versioned document", "did", id, "version", version, "error", err)
		return types.DIDDocument{}, false
	}
	
	return doc, true
}

// GetDocumentVersions returns all versions of a DID document
func (k Keeper) GetDocumentVersions(ctx context.Context, id string) ([]types.DIDDocument, error) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.DIDVersionKeyPrefix))
	
	prefix := types.DIDVersionPrefix(id)
	iterator := storetypes.KVStorePrefixIterator(store, prefix)
	defer iterator.Close()
	
	var versions []types.DIDDocument
	for ; iterator.Valid(); iterator.Next() {
		var doc types.DIDDocument
		err := k.cdc.Unmarshal(iterator.Value(), &doc)
		if err != nil {
			k.Logger(ctx).Error("Failed to unmarshal versioned document during iteration", "error", err)
			continue
		}
		versions = append(versions, doc)
	}
	
	return versions, nil
}

// setDocumentMetadata stores metadata for efficient queries
func (k Keeper) setDocumentMetadata(ctx context.Context, doc types.DIDDocument) error {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.DIDMetadataKeyPrefix))
	
	metadata := types.DocumentMetadata{
		ID:               doc.ID,
		Creator:          doc.Creator,
		CreatedAt:        doc.CreatedAt,
		UpdatedAt:        doc.UpdatedAt,
		Version:          doc.Version,
		State:            doc.Status.State,
		CriticalityLevel: doc.Metadata.CriticalityLevel,
		Environment:      doc.Metadata.Environment,
		OrganizationID:   doc.Metadata.OrganizationID,
		Tags:             doc.Metadata.Tags,
	}
	
	b := k.cdc.MustMarshal(&metadata)
	store.Set(types.DIDMetadataKey(doc.ID), b)
	
	return nil
}

// GetDocumentsByOrganization returns all DID documents for an organization
func (k Keeper) GetDocumentsByOrganization(ctx context.Context, orgID string) ([]types.DIDDocument, error) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.DIDMetadataKeyPrefix))
	iterator := storetypes.KVStorePrefixIterator(store, []byte{})
	defer iterator.Close()
	
	var results []types.DIDDocument
	for ; iterator.Valid(); iterator.Next() {
		var metadata types.DocumentMetadata
		err := k.cdc.Unmarshal(iterator.Value(), &metadata)
		if err != nil {
			continue
		}
		
		if metadata.OrganizationID == orgID {
			if doc, found := k.GetDidDocument(ctx, metadata.ID); found {
				results = append(results, doc)
			}
		}
	}
	
	return results, nil
}

// GetDocumentsByState returns all DID documents in a specific state
func (k Keeper) GetDocumentsByState(ctx context.Context, state types.DIDState) ([]types.DIDDocument, error) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.DIDMetadataKeyPrefix))
	iterator := storetypes.KVStorePrefixIterator(store, []byte{})
	defer iterator.Close()
	
	var results []types.DIDDocument
	for ; iterator.Valid(); iterator.Next() {
		var metadata types.DocumentMetadata
		err := k.cdc.Unmarshal(iterator.Value(), &metadata)
		if err != nil {
			continue
		}
		
		if metadata.State == state {
			if doc, found := k.GetDidDocument(ctx, metadata.ID); found {
				results = append(results, doc)
			}
		}
	}
	
	return results, nil
}

// recordAuditLog records an audit event
func (k Keeper) recordAuditLog(ctx context.Context, action, didID, actor string, data interface{}) error {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.DIDAuditKeyPrefix))
	
	now := time.Now()
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	
	auditEntry := types.AuditEntry{
		ID:          fmt.Sprintf(\"%s-%d-%s\", didID, now.UnixNano(), action),
		DID:         didID,
		Action:      action,
		Actor:       actor,
		Timestamp:   now,
		BlockHeight: sdkCtx.BlockHeight(),
		TxHash:      fmt.Sprintf(\"%X\", sdkCtx.TxBytes()),
		Data:        data,
	}
	
	b := k.cdc.MustMarshal(&auditEntry)
	store.Set(types.DIDAuditKey(auditEntry.ID), b)
	
	return nil
}

// GetAuditLog returns audit logs for a DID
func (k Keeper) GetAuditLog(ctx context.Context, didID string, limit int) ([]types.AuditEntry, error) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.DIDAuditKeyPrefix))
	
	prefix := []byte(didID + \"-\")
	iterator := storetypes.KVStorePrefixIterator(store, prefix)
	defer iterator.Close()
	
	var entries []types.AuditEntry
	count := 0
	for ; iterator.Valid() && (limit == 0 || count < limit); iterator.Next() {
		var entry types.AuditEntry
		err := k.cdc.Unmarshal(iterator.Value(), &entry)
		if err != nil {
			k.Logger(ctx).Error(\"Failed to unmarshal audit entry\", \"error\", err)
			continue
		}
		entries = append(entries, entry)
		count++
	}
	
	return entries, nil
}

// UpdateDocumentStatus updates the status of a DID document
func (k Keeper) UpdateDocumentStatus(ctx context.Context, id string, newState types.DIDState, reason, updatedBy string) error {
	doc, found := k.GetDidDocument(ctx, id)
	if !found {
		return types.ErrDIDNotFound
	}
	
	// Validate state transition
	if !k.isValidStateTransition(doc.Status.State, newState) {
		return errors.Wrapf(types.ErrInvalidDIDState, \"invalid transition from %s to %s\", doc.Status.State, newState)
	}
	
	now := time.Now()
	doc.Status.State = newState
	doc.Status.Reason = reason
	doc.Status.UpdatedAt = now
	doc.Status.UpdatedBy = updatedBy
	doc.UpdatedAt = now
	doc.Version++
	
	// Update health check if deactivating
	if newState == types.DIDStateInactive || newState == types.DIDStateRevoked {
		doc.Status.HealthCheck.Status = \"unhealthy\"
		doc.Status.HealthCheck.LastChecked = now
		doc.Status.HealthCheck.Errors = append(doc.Status.HealthCheck.Errors, fmt.Sprintf(\"Document %s: %s\", newState, reason))
	}
	
	return k.SetDidDocument(ctx, doc)
}

// isValidStateTransition checks if a state transition is valid
func (k Keeper) isValidStateTransition(from, to types.DIDState) bool {
	// Define valid state transitions
	validTransitions := map[types.DIDState][]types.DIDState{
		types.DIDStateActive: {
			types.DIDStateInactive,
			types.DIDStateSuspended,
			types.DIDStateRevoked,
			types.DIDStateMigrating,
		},
		types.DIDStateInactive: {
			types.DIDStateActive,
			types.DIDStateRevoked,
		},
		types.DIDStateSuspended: {
			types.DIDStateActive,
			types.DIDStateRevoked,
		},
		types.DIDStateRecovering: {
			types.DIDStateActive,
			types.DIDStateRevoked,
		},
		types.DIDStateMigrating: {
			types.DIDStateActive,
			types.DIDStateRevoked,
		},
	}
	
	allowed, exists := validTransitions[from]
	if !exists {
		return false
	}
	
	for _, state := range allowed {
		if state == to {
			return true
		}
	}
	
	return false
}

// PerformHealthCheck performs a health check on a DID document
func (k Keeper) PerformHealthCheck(ctx context.Context, id string) error {
	doc, found := k.GetDidDocument(ctx, id)
	if !found {
		return types.ErrDIDNotFound
	}
	
	now := time.Now()
	var errors []string
	
	// Check document validity
	if err := doc.Validate(); err != nil {
		errors = append(errors, fmt.Sprintf(\"Validation failed: %v\", err))
	}
	
	// Check verification methods
	for _, vm := range doc.VerificationMethod {
		if vm.Revoked {
			errors = append(errors, fmt.Sprintf(\"Verification method %s is revoked\", vm.ID))
		}
		if vm.ExpiresAt != nil && vm.ExpiresAt.Before(now) {
			errors = append(errors, fmt.Sprintf(\"Verification method %s has expired\", vm.ID))
		}
	}
	
	// Check services
	for _, svc := range doc.Service {
		if svc.ServiceEndpoint == \"\" {
			errors = append(errors, fmt.Sprintf(\"Service %s has empty endpoint\", svc.ID))
		}
	}
	
	// Update health check
	status := \"healthy\"
	if len(errors) > 0 {
		status = \"unhealthy\"
	}
	
	doc.Status.HealthCheck = types.HealthCheck{
		Status:      status,
		LastChecked: now,
		Errors:      errors,
	}
	
	doc.UpdatedAt = now
	doc.Version++
	
	return k.SetDidDocument(ctx, doc)
}

// ValidateControllerAuthorization checks if an address can control a DID
func (k Keeper) ValidateControllerAuthorization(ctx context.Context, didID, controllerAddr string) error {
	doc, found := k.GetDidDocument(ctx, didID)
	if !found {
		return types.ErrDIDNotFound
	}
	
	// Check if the address is the creator
	if doc.Creator == controllerAddr {
		return nil
	}
	
	// Check if the address is in the controller list
	for _, controller := range doc.Controller {
		if controller == controllerAddr {
			return nil
		}
	}
	
	// Check verification methods for controller authorization
	for _, vm := range doc.VerificationMethod {
		if vm.Controller == controllerAddr && !vm.Revoked {
			return nil
		}
	}
	
	return types.ErrUnauthorized
}

// AddVerificationMethod adds a new verification method to a DID document
func (k Keeper) AddVerificationMethod(ctx context.Context, didID string, vm types.VerificationMethod, controllerAddr string) error {
	// Authorize the operation
	if err := k.ValidateControllerAuthorization(ctx, didID, controllerAddr); err != nil {
		return err
	}
	
	doc, found := k.GetDidDocument(ctx, didID)
	if !found {
		return types.ErrDIDNotFound
	}
	
	// Check for duplicate verification method ID
	for _, existing := range doc.VerificationMethod {
		if existing.ID == vm.ID {
			return types.ErrDuplicateVerificationMethod
		}
	}
	
	// Set creation timestamp and security level
	now := time.Now()
	vm.CreatedAt = now
	if vm.SecurityLevel == \"\" {
		vm.SecurityLevel = types.SecurityLevelStandard
	}
	
	// Add to document
	doc.VerificationMethod = append(doc.VerificationMethod, vm)
	doc.UpdatedAt = now
	doc.Version++
	
	return k.SetDidDocument(ctx, doc)
}

// RevokeVerificationMethod revokes a verification method
func (k Keeper) RevokeVerificationMethod(ctx context.Context, didID, vmID, controllerAddr string) error {
	// Authorize the operation
	if err := k.ValidateControllerAuthorization(ctx, didID, controllerAddr); err != nil {
		return err
	}
	
	doc, found := k.GetDidDocument(ctx, didID)
	if !found {
		return types.ErrDIDNotFound
	}
	
	// Find and revoke the verification method
	found = false
	now := time.Now()
	for i, vm := range doc.VerificationMethod {
		if vm.ID == vmID {
			doc.VerificationMethod[i].Revoked = true
			doc.VerificationMethod[i].RevokedAt = &now
			found = true
			break
		}
	}
	
	if !found {
		return types.ErrVerificationMethodNotFound
	}
	
	doc.UpdatedAt = now
	doc.Version++
	
	return k.SetDidDocument(ctx, doc)
}

// AddService adds a new service to a DID document
func (k Keeper) AddService(ctx context.Context, didID string, service types.Service, controllerAddr string) error {
	// Authorize the operation
	if err := k.ValidateControllerAuthorization(ctx, didID, controllerAddr); err != nil {
		return err
	}
	
	doc, found := k.GetDidDocument(ctx, didID)
	if !found {
		return types.ErrDIDNotFound
	}
	
	// Check for duplicate service ID
	for _, existing := range doc.Service {
		if existing.ID == service.ID {
			return types.ErrDuplicateService
		}
	}
	
	// Validate service
	if err := service.Validate(); err != nil {
		return errors.Wrapf(types.ErrInvalidService, \"service validation failed: %v\", err)
	}
	
	// Add to document
	doc.Service = append(doc.Service, service)
	doc.UpdatedAt = time.Now()
	doc.Version++
	
	return k.SetDidDocument(ctx, doc)
}

// RemoveService removes a service from a DID document
func (k Keeper) RemoveService(ctx context.Context, didID, serviceID, controllerAddr string) error {
	// Authorize the operation
	if err := k.ValidateControllerAuthorization(ctx, didID, controllerAddr); err != nil {
		return err
	}
	
	doc, found := k.GetDidDocument(ctx, didID)
	if !found {
		return types.ErrDIDNotFound
	}
	
	// Find and remove the service
	found = false
	for i, svc := range doc.Service {
		if svc.ID == serviceID {
			doc.Service = append(doc.Service[:i], doc.Service[i+1:]...)
			found = true
			break
		}
	}
	
	if !found {
		return types.ErrServiceNotFound
	}
	
	doc.UpdatedAt = time.Now()
	doc.Version++
	
	return k.SetDidDocument(ctx, doc)
}