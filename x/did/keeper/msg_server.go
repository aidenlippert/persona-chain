package keeper

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	"github.com/persona-chain/persona-chain/x/did/types"
)

type msgServer struct {
	Keeper
}

// NewMsgServerImpl returns an implementation of the MsgServer interface
// for the provided Keeper.
func NewMsgServerImpl(keeper Keeper) types.MsgServer {
	return &msgServer{Keeper: keeper}
}

var _ types.MsgServer = msgServer{}

// Legacy handler maintained for backward compatibility
func (k msgServer) CreateDid(goCtx context.Context, msg *types.MsgCreateDid) (*types.MsgCreateDidResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Check if the value already exists
	_, isFound := k.GetDidDocument(ctx, msg.Id)
	if isFound {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "DID already exists")
	}

	var didDocument = types.DidDocument{
		Creator:     msg.Creator,
		Id:          msg.Id,
		DidDocument: msg.DidDocument,
		Active:      true,
		CreatedAt:   time.Now().Unix(),
		UpdatedAt:   time.Now().Unix(),
	}

	k.SetDidDocument(ctx, didDocument)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.TypeMsgCreateDid,
			sdk.NewAttribute("creator", msg.Creator),
			sdk.NewAttribute("id", msg.Id),
		),
	)

	return &types.MsgCreateDidResponse{}, nil
}

// Legacy handler maintained for backward compatibility
func (k msgServer) UpdateDid(goCtx context.Context, msg *types.MsgUpdateDid) (*types.MsgUpdateDidResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Check if the value exists
	valFound, isFound := k.GetDidDocument(ctx, msg.Id)
	if !isFound {
		return nil, errorsmod.Wrap(sdkerrors.ErrKeyNotFound, "DID does not exist")
	}

	// Checks if the the msg creator is the same as the current owner
	if msg.Creator != valFound.Creator {
		return nil, errorsmod.Wrap(sdkerrors.ErrUnauthorized, "incorrect owner")
	}

	// Check if DID is active
	if !valFound.Active {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "DID is deactivated")
	}

	var didDocument = types.DidDocument{
		Creator:     msg.Creator,
		Id:          msg.Id,
		DidDocument: msg.DidDocument,
		Active:      valFound.Active,
		CreatedAt:   valFound.CreatedAt,
		UpdatedAt:   time.Now().Unix(),
	}

	k.SetDidDocument(ctx, didDocument)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.TypeMsgUpdateDid,
			sdk.NewAttribute("creator", msg.Creator),
			sdk.NewAttribute("id", msg.Id),
		),
	)

	return &types.MsgUpdateDidResponse{}, nil
}

// Legacy handler maintained for backward compatibility
func (k msgServer) DeactivateDid(goCtx context.Context, msg *types.MsgDeactivateDid) (*types.MsgDeactivateDidResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Check if the value exists
	valFound, isFound := k.GetDidDocument(ctx, msg.Id)
	if !isFound {
		return nil, errorsmod.Wrap(sdkerrors.ErrKeyNotFound, "DID does not exist")
	}

	// Checks if the the msg creator is the same as the current owner
	if msg.Creator != valFound.Creator {
		return nil, errorsmod.Wrap(sdkerrors.ErrUnauthorized, "incorrect owner")
	}

	// Check if DID is already inactive
	if !valFound.Active {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "DID is already deactivated")
	}

	var didDocument = types.DidDocument{
		Creator:     valFound.Creator,
		Id:          valFound.Id,
		DidDocument: valFound.DidDocument,
		Active:      false,
		CreatedAt:   valFound.CreatedAt,
		UpdatedAt:   time.Now().Unix(),
	}

	k.SetDidDocument(ctx, didDocument)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.TypeMsgDeactivateDid,
			sdk.NewAttribute("creator", msg.Creator),
			sdk.NewAttribute("id", msg.Id),
		),
	)

	return &types.MsgDeactivateDidResponse{}, nil
}

// ========== ENTERPRISE DID MESSAGE HANDLERS ==========

// CreateDIDDocument creates a new DID document with enterprise features
func (k msgServer) CreateDIDDocument(goCtx context.Context, msg *types.MsgCreateDIDDocument) (*types.MsgCreateDIDDocumentResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate the DID document
	if err := msg.DidDocument.Validate(); err != nil {
		return nil, errorsmod.Wrapf(types.ErrInvalidDIDDocument, "validation failed: %v", err)
	}

	// Check if DID already exists
	if k.Keeper.HasDIDDocument(ctx, msg.DidDocument.Id) {
		return nil, errorsmod.Wrapf(types.ErrDIDAlreadyExists, "DID %s already exists", msg.DidDocument.Id)
	}

	// Set creation metadata
	now := time.Now()
	msg.DidDocument.Created = now.Format(time.RFC3339)
	msg.DidDocument.Updated = now.Format(time.RFC3339)
	msg.DidDocument.Version = 1

	// Set initial enterprise metadata
	if msg.DidDocument.Metadata == nil {
		msg.DidDocument.Metadata = &types.DocumentMetadata{}
	}
	msg.DidDocument.Metadata.CreatedAt = now.Unix()
	msg.DidDocument.Metadata.UpdatedAt = now.Unix()
	msg.DidDocument.Metadata.Version = 1
	msg.DidDocument.Metadata.Status = "active"
	msg.DidDocument.Metadata.CreatedBy = msg.Creator
	msg.DidDocument.Metadata.ComplianceStatus = "compliant"

	// Store the DID document
	k.Keeper.SetDIDDocument(ctx, *msg.DidDocument)

	// Create audit entry
	auditEntry := types.AuditEntry{
		Timestamp: now.Unix(),
		Action:    "create",
		Actor:     msg.Creator,
		DID:       msg.DidDocument.Id,
		Changes:   "DID document created",
		IPAddress: msg.Metadata.GetIPAddress(),
		UserAgent: msg.Metadata.GetUserAgent(),
	}
	k.Keeper.AddAuditEntry(ctx, msg.DidDocument.Id, auditEntry)

	// Emit creation event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeCreateDID,
			sdk.NewAttribute(types.AttributeKeyDID, msg.DidDocument.Id),
			sdk.NewAttribute(types.AttributeKeyCreator, msg.Creator),
			sdk.NewAttribute(types.AttributeKeyVersion, "1"),
		),
	)

	return &types.MsgCreateDIDDocumentResponse{
		Id:      msg.DidDocument.Id,
		Version: 1,
	}, nil
}

// UpdateDIDDocument updates an existing DID document with version control
func (k msgServer) UpdateDIDDocument(goCtx context.Context, msg *types.MsgUpdateDIDDocument) (*types.MsgUpdateDIDDocumentResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Get existing DID document
	existingDoc, found := k.Keeper.GetDIDDocument(ctx, msg.Id)
	if !found {
		return nil, errorsmod.Wrapf(types.ErrDIDNotFound, "DID %s not found", msg.Id)
	}

	// Check if the document is deactivated
	if existingDoc.Metadata != nil && existingDoc.Metadata.Status == "deactivated" {
		return nil, errorsmod.Wrapf(types.ErrDIDDeactivated, "DID %s is deactivated", msg.Id)
	}

	// Validate controller authorization
	if !k.Keeper.IsAuthorizedController(ctx, msg.Id, msg.Controller) {
		return nil, errorsmod.Wrapf(types.ErrUnauthorized, "controller %s not authorized for DID %s", msg.Controller, msg.Id)
	}

	// Validate the updated document
	if err := msg.DidDocument.Validate(); err != nil {
		return nil, errorsmod.Wrapf(types.ErrInvalidDIDDocument, "validation failed: %v", err)
	}

	// Update version and timestamps
	now := time.Now()
	msg.DidDocument.Updated = now.Format(time.RFC3339)
	newVersion := existingDoc.Version + 1
	msg.DidDocument.Version = newVersion

	// Update enterprise metadata
	if msg.DidDocument.Metadata == nil {
		msg.DidDocument.Metadata = existingDoc.Metadata
	}
	if msg.DidDocument.Metadata != nil {
		msg.DidDocument.Metadata.UpdatedAt = now.Unix()
		msg.DidDocument.Metadata.Version = newVersion
		msg.DidDocument.Metadata.UpdatedBy = msg.Controller
	}

	// Store the updated document
	k.Keeper.SetDIDDocument(ctx, *msg.DidDocument)

	// Create audit entry
	changes, _ := json.Marshal(map[string]interface{}{
		"previous_version": existingDoc.Version,
		"new_version":      newVersion,
		"updated_fields":   msg.UpdatedFields,
	})
	auditEntry := types.AuditEntry{
		Timestamp: now.Unix(),
		Action:    "update",
		Actor:     msg.Controller,
		DID:       msg.Id,
		Changes:   string(changes),
		IPAddress: msg.Metadata.GetIPAddress(),
		UserAgent: msg.Metadata.GetUserAgent(),
	}
	k.Keeper.AddAuditEntry(ctx, msg.Id, auditEntry)

	// Emit update event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeUpdateDID,
			sdk.NewAttribute(types.AttributeKeyDID, msg.Id),
			sdk.NewAttribute(types.AttributeKeyController, msg.Controller),
			sdk.NewAttribute(types.AttributeKeyVersion, fmt.Sprintf("%d", newVersion)),
		),
	)

	return &types.MsgUpdateDIDDocumentResponse{
		Version: newVersion,
	}, nil
}

// DeactivateDIDDocument deactivates a DID document
func (k msgServer) DeactivateDIDDocument(goCtx context.Context, msg *types.MsgDeactivateDIDDocument) (*types.MsgDeactivateDIDDocumentResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Get existing DID document
	didDoc, found := k.Keeper.GetDIDDocument(ctx, msg.Id)
	if !found {
		return nil, errorsmod.Wrapf(types.ErrDIDNotFound, "DID %s not found", msg.Id)
	}

	// Check if already deactivated
	if didDoc.Metadata != nil && didDoc.Metadata.Status == "deactivated" {
		return nil, errorsmod.Wrapf(types.ErrDIDAlreadyDeactivated, "DID %s already deactivated", msg.Id)
	}

	// Validate controller authorization
	if !k.Keeper.IsAuthorizedController(ctx, msg.Id, msg.Controller) {
		return nil, errorsmod.Wrapf(types.ErrUnauthorized, "controller %s not authorized for DID %s", msg.Controller, msg.Id)
	}

	// Update document status
	now := time.Now()
	didDoc.Updated = now.Format(time.RFC3339)
	didDoc.Version++

	if didDoc.Metadata != nil {
		didDoc.Metadata.Status = "deactivated"
		didDoc.Metadata.UpdatedAt = now.Unix()
		didDoc.Metadata.UpdatedBy = msg.Controller
		didDoc.Metadata.DeactivatedAt = &now.Unix()
		didDoc.Metadata.DeactivationReason = msg.Reason
	}

	// Store the deactivated document
	k.Keeper.SetDIDDocument(ctx, didDoc)

	// Create audit entry
	auditEntry := types.AuditEntry{
		Timestamp: now.Unix(),
		Action:    "deactivate",
		Actor:     msg.Controller,
		DID:       msg.Id,
		Changes:   fmt.Sprintf("DID deactivated. Reason: %s", msg.Reason),
		IPAddress: msg.Metadata.GetIPAddress(),
		UserAgent: msg.Metadata.GetUserAgent(),
	}
	k.Keeper.AddAuditEntry(ctx, msg.Id, auditEntry)

	// Emit deactivation event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeDeactivateDID,
			sdk.NewAttribute(types.AttributeKeyDID, msg.Id),
			sdk.NewAttribute(types.AttributeKeyController, msg.Controller),
			sdk.NewAttribute(types.AttributeKeyReason, msg.Reason),
		),
	)

	return &types.MsgDeactivateDIDDocumentResponse{
		Deactivated: true,
	}, nil
}

// AddVerificationMethod adds a new verification method to a DID document
func (k msgServer) AddVerificationMethod(goCtx context.Context, msg *types.MsgAddVerificationMethod) (*types.MsgAddVerificationMethodResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Get existing DID document
	didDoc, found := k.Keeper.GetDIDDocument(ctx, msg.Id)
	if !found {
		return nil, errorsmod.Wrapf(types.ErrDIDNotFound, "DID %s not found", msg.Id)
	}

	// Check if the document is deactivated
	if didDoc.Metadata != nil && didDoc.Metadata.Status == "deactivated" {
		return nil, errorsmod.Wrapf(types.ErrDIDDeactivated, "DID %s is deactivated", msg.Id)
	}

	// Validate controller authorization
	if !k.Keeper.IsAuthorizedController(ctx, msg.Id, msg.Controller) {
		return nil, errorsmod.Wrapf(types.ErrUnauthorized, "controller %s not authorized for DID %s", msg.Controller, msg.Id)
	}

	// Check if verification method already exists
	for _, vm := range didDoc.VerificationMethod {
		if vm.Id == msg.VerificationMethod.Id {
			return nil, errorsmod.Wrapf(types.ErrVerificationMethodExists, "verification method %s already exists", msg.VerificationMethod.Id)
		}
	}

	// Add the verification method
	didDoc.VerificationMethod = append(didDoc.VerificationMethod, msg.VerificationMethod)

	// Update document metadata
	now := time.Now()
	didDoc.Updated = now.Format(time.RFC3339)
	didDoc.Version++

	if didDoc.Metadata != nil {
		didDoc.Metadata.UpdatedAt = now.Unix()
		didDoc.Metadata.Version = didDoc.Version
		didDoc.Metadata.UpdatedBy = msg.Controller
	}

	// Store the updated document
	k.Keeper.SetDIDDocument(ctx, didDoc)

	// Create audit entry
	changes, _ := json.Marshal(map[string]interface{}{
		"action":               "add_verification_method",
		"verification_method":  msg.VerificationMethod.Id,
		"type":                msg.VerificationMethod.Type,
	})
	auditEntry := types.AuditEntry{
		Timestamp: now.Unix(),
		Action:    "add_verification_method",
		Actor:     msg.Controller,
		DID:       msg.Id,
		Changes:   string(changes),
		IPAddress: msg.Metadata.GetIPAddress(),
		UserAgent: msg.Metadata.GetUserAgent(),
	}
	k.Keeper.AddAuditEntry(ctx, msg.Id, auditEntry)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeAddVerificationMethod,
			sdk.NewAttribute(types.AttributeKeyDID, msg.Id),
			sdk.NewAttribute(types.AttributeKeyController, msg.Controller),
			sdk.NewAttribute(types.AttributeKeyVerificationMethod, msg.VerificationMethod.Id),
		),
	)

	return &types.MsgAddVerificationMethodResponse{
		Success: true,
	}, nil
}

// RevokeVerificationMethod revokes a verification method from a DID document
func (k msgServer) RevokeVerificationMethod(goCtx context.Context, msg *types.MsgRevokeVerificationMethod) (*types.MsgRevokeVerificationMethodResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Get existing DID document
	didDoc, found := k.Keeper.GetDIDDocument(ctx, msg.Id)
	if !found {
		return nil, errorsmod.Wrapf(types.ErrDIDNotFound, "DID %s not found", msg.Id)
	}

	// Check if the document is deactivated
	if didDoc.Metadata != nil && didDoc.Metadata.Status == "deactivated" {
		return nil, errorsmod.Wrapf(types.ErrDIDDeactivated, "DID %s is deactivated", msg.Id)
	}

	// Validate controller authorization
	if !k.Keeper.IsAuthorizedController(ctx, msg.Id, msg.Controller) {
		return nil, errorsmod.Wrapf(types.ErrUnauthorized, "controller %s not authorized for DID %s", msg.Controller, msg.Id)
	}

	// Find and remove the verification method
	var newVerificationMethods []*types.VerificationMethod
	found = false
	for _, vm := range didDoc.VerificationMethod {
		if vm.Id == msg.MethodId {
			found = true
			// Don't add to the new slice (effectively removing it)
		} else {
			newVerificationMethods = append(newVerificationMethods, vm)
		}
	}

	if !found {
		return nil, errorsmod.Wrapf(types.ErrVerificationMethodNotFound, "verification method %s not found", msg.MethodId)
	}

	// Update the verification methods
	didDoc.VerificationMethod = newVerificationMethods

	// Update document metadata
	now := time.Now()
	didDoc.Updated = now.Format(time.RFC3339)
	didDoc.Version++

	if didDoc.Metadata != nil {
		didDoc.Metadata.UpdatedAt = now.Unix()
		didDoc.Metadata.Version = didDoc.Version
		didDoc.Metadata.UpdatedBy = msg.Controller
	}

	// Store the updated document
	k.Keeper.SetDIDDocument(ctx, didDoc)

	// Create audit entry
	changes, _ := json.Marshal(map[string]interface{}{
		"action":               "revoke_verification_method",
		"verification_method":  msg.MethodId,
		"reason":              msg.Reason,
	})
	auditEntry := types.AuditEntry{
		Timestamp: now.Unix(),
		Action:    "revoke_verification_method",
		Actor:     msg.Controller,
		DID:       msg.Id,
		Changes:   string(changes),
		IPAddress: msg.Metadata.GetIPAddress(),
		UserAgent: msg.Metadata.GetUserAgent(),
	}
	k.Keeper.AddAuditEntry(ctx, msg.Id, auditEntry)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeRevokeVerificationMethod,
			sdk.NewAttribute(types.AttributeKeyDID, msg.Id),
			sdk.NewAttribute(types.AttributeKeyController, msg.Controller),
			sdk.NewAttribute(types.AttributeKeyVerificationMethod, msg.MethodId),
			sdk.NewAttribute(types.AttributeKeyReason, msg.Reason),
		),
	)

	return &types.MsgRevokeVerificationMethodResponse{
		Success: true,
	}, nil
}

// AddService adds a new service to a DID document
func (k msgServer) AddService(goCtx context.Context, msg *types.MsgAddService) (*types.MsgAddServiceResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Get existing DID document
	didDoc, found := k.Keeper.GetDIDDocument(ctx, msg.Id)
	if !found {
		return nil, errorsmod.Wrapf(types.ErrDIDNotFound, "DID %s not found", msg.Id)
	}

	// Check if the document is deactivated
	if didDoc.Metadata != nil && didDoc.Metadata.Status == "deactivated" {
		return nil, errorsmod.Wrapf(types.ErrDIDDeactivated, "DID %s is deactivated", msg.Id)
	}

	// Validate controller authorization
	if !k.Keeper.IsAuthorizedController(ctx, msg.Id, msg.Controller) {
		return nil, errorsmod.Wrapf(types.ErrUnauthorized, "controller %s not authorized for DID %s", msg.Controller, msg.Id)
	}

	// Check if service already exists
	for _, service := range didDoc.Service {
		if service.Id == msg.Service.Id {
			return nil, errorsmod.Wrapf(types.ErrServiceExists, "service %s already exists", msg.Service.Id)
		}
	}

	// Add the service
	didDoc.Service = append(didDoc.Service, msg.Service)

	// Update document metadata
	now := time.Now()
	didDoc.Updated = now.Format(time.RFC3339)
	didDoc.Version++

	if didDoc.Metadata != nil {
		didDoc.Metadata.UpdatedAt = now.Unix()
		didDoc.Metadata.Version = didDoc.Version
		didDoc.Metadata.UpdatedBy = msg.Controller
	}

	// Store the updated document
	k.Keeper.SetDIDDocument(ctx, didDoc)

	// Create audit entry
	changes, _ := json.Marshal(map[string]interface{}{
		"action":      "add_service",
		"service_id":  msg.Service.Id,
		"service_type": msg.Service.Type,
		"endpoint":    msg.Service.ServiceEndpoint,
	})
	auditEntry := types.AuditEntry{
		Timestamp: now.Unix(),
		Action:    "add_service",
		Actor:     msg.Controller,
		DID:       msg.Id,
		Changes:   string(changes),
		IPAddress: msg.Metadata.GetIPAddress(),
		UserAgent: msg.Metadata.GetUserAgent(),
	}
	k.Keeper.AddAuditEntry(ctx, msg.Id, auditEntry)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeAddService,
			sdk.NewAttribute(types.AttributeKeyDID, msg.Id),
			sdk.NewAttribute(types.AttributeKeyController, msg.Controller),
			sdk.NewAttribute(types.AttributeKeyService, msg.Service.Id),
		),
	)

	return &types.MsgAddServiceResponse{
		Success: true,
	}, nil
}

// RemoveService removes a service from a DID document
func (k msgServer) RemoveService(goCtx context.Context, msg *types.MsgRemoveService) (*types.MsgRemoveServiceResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Get existing DID document
	didDoc, found := k.Keeper.GetDIDDocument(ctx, msg.Id)
	if !found {
		return nil, errorsmod.Wrapf(types.ErrDIDNotFound, "DID %s not found", msg.Id)
	}

	// Check if the document is deactivated
	if didDoc.Metadata != nil && didDoc.Metadata.Status == "deactivated" {
		return nil, errorsmod.Wrapf(types.ErrDIDDeactivated, "DID %s is deactivated", msg.Id)
	}

	// Validate controller authorization
	if !k.Keeper.IsAuthorizedController(ctx, msg.Id, msg.Controller) {
		return nil, errorsmod.Wrapf(types.ErrUnauthorized, "controller %s not authorized for DID %s", msg.Controller, msg.Id)
	}

	// Find and remove the service
	var newServices []*types.Service
	found = false
	for _, service := range didDoc.Service {
		if service.Id == msg.ServiceId {
			found = true
			// Don't add to the new slice (effectively removing it)
		} else {
			newServices = append(newServices, service)
		}
	}

	if !found {
		return nil, errorsmod.Wrapf(types.ErrServiceNotFound, "service %s not found", msg.ServiceId)
	}

	// Update the services
	didDoc.Service = newServices

	// Update document metadata
	now := time.Now()
	didDoc.Updated = now.Format(time.RFC3339)
	didDoc.Version++

	if didDoc.Metadata != nil {
		didDoc.Metadata.UpdatedAt = now.Unix()
		didDoc.Metadata.Version = didDoc.Version
		didDoc.Metadata.UpdatedBy = msg.Controller
	}

	// Store the updated document
	k.Keeper.SetDIDDocument(ctx, didDoc)

	// Create audit entry
	changes, _ := json.Marshal(map[string]interface{}{
		"action":     "remove_service",
		"service_id": msg.ServiceId,
		"reason":     msg.Reason,
	})
	auditEntry := types.AuditEntry{
		Timestamp: now.Unix(),
		Action:    "remove_service",
		Actor:     msg.Controller,
		DID:       msg.Id,
		Changes:   string(changes),
		IPAddress: msg.Metadata.GetIPAddress(),
		UserAgent: msg.Metadata.GetUserAgent(),
	}
	k.Keeper.AddAuditEntry(ctx, msg.Id, auditEntry)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeRemoveService,
			sdk.NewAttribute(types.AttributeKeyDID, msg.Id),
			sdk.NewAttribute(types.AttributeKeyController, msg.Controller),
			sdk.NewAttribute(types.AttributeKeyService, msg.ServiceId),
			sdk.NewAttribute(types.AttributeKeyReason, msg.Reason),
		),
	)

	return &types.MsgRemoveServiceResponse{
		Success: true,
	}, nil
}

// UpdateDIDStatus updates the status of a DID document
func (k msgServer) UpdateDIDStatus(goCtx context.Context, msg *types.MsgUpdateDIDStatus) (*types.MsgUpdateDIDStatusResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Get existing DID document
	didDoc, found := k.Keeper.GetDIDDocument(ctx, msg.Id)
	if !found {
		return nil, errorsmod.Wrapf(types.ErrDIDNotFound, "DID %s not found", msg.Id)
	}

	// Validate controller authorization
	if !k.Keeper.IsAuthorizedController(ctx, msg.Id, msg.Controller) {
		return nil, errorsmod.Wrapf(types.ErrUnauthorized, "controller %s not authorized for DID %s", msg.Controller, msg.Id)
	}

	// Validate status transition
	currentStatus := "active"
	if didDoc.Metadata != nil {
		currentStatus = didDoc.Metadata.Status
	}

	if !k.Keeper.IsValidStatusTransition(ctx, currentStatus, msg.Status) {
		return nil, errorsmod.Wrapf(types.ErrInvalidStatusTransition, "invalid status transition from %s to %s", currentStatus, msg.Status)
	}

	// Update document status
	now := time.Now()
	didDoc.Updated = now.Format(time.RFC3339)
	didDoc.Version++

	if didDoc.Metadata == nil {
		didDoc.Metadata = &types.DocumentMetadata{}
	}
	didDoc.Metadata.Status = msg.Status
	didDoc.Metadata.UpdatedAt = now.Unix()
	didDoc.Metadata.Version = didDoc.Version
	didDoc.Metadata.UpdatedBy = msg.Controller

	// Store the updated document
	k.Keeper.SetDIDDocument(ctx, didDoc)

	// Create audit entry
	changes, _ := json.Marshal(map[string]interface{}{
		"action":          "update_status",
		"previous_status": currentStatus,
		"new_status":      msg.Status,
		"reason":          msg.Reason,
	})
	auditEntry := types.AuditEntry{
		Timestamp: now.Unix(),
		Action:    "update_status",
		Actor:     msg.Controller,
		DID:       msg.Id,
		Changes:   string(changes),
		IPAddress: msg.Metadata.GetIPAddress(),
		UserAgent: msg.Metadata.GetUserAgent(),
	}
	k.Keeper.AddAuditEntry(ctx, msg.Id, auditEntry)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeUpdateDIDStatus,
			sdk.NewAttribute(types.AttributeKeyDID, msg.Id),
			sdk.NewAttribute(types.AttributeKeyController, msg.Controller),
			sdk.NewAttribute(types.AttributeKeyStatus, msg.Status),
			sdk.NewAttribute(types.AttributeKeyReason, msg.Reason),
		),
	)

	return &types.MsgUpdateDIDStatusResponse{
		Success: true,
	}, nil
}

// RecoverDID recovers a DID document using guardian multi-party control
func (k msgServer) RecoverDID(goCtx context.Context, msg *types.MsgRecoverDID) (*types.MsgRecoverDIDResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Get existing DID document
	didDoc, found := k.Keeper.GetDIDDocument(ctx, msg.Id)
	if !found {
		return nil, errorsmod.Wrapf(types.ErrDIDNotFound, "DID %s not found", msg.Id)
	}

	// Validate guardian signatures and threshold
	if didDoc.Metadata == nil || didDoc.Metadata.GuardianConfig == nil {
		return nil, errorsmod.Wrapf(types.ErrNoGuardianConfig, "no guardian configuration for DID %s", msg.Id)
	}

	guardianConfig := didDoc.Metadata.GuardianConfig
	if len(msg.GuardianSignatures) < int(guardianConfig.Threshold) {
		return nil, errorsmod.Wrapf(types.ErrInsufficientGuardianSignatures, "insufficient guardian signatures: %d required, %d provided", guardianConfig.Threshold, len(msg.GuardianSignatures))
	}

	// Validate each guardian signature
	validSignatures := 0
	for _, sig := range msg.GuardianSignatures {
		if k.Keeper.IsValidGuardianSignature(ctx, msg.Id, sig) {
			validSignatures++
		}
	}

	if validSignatures < int(guardianConfig.Threshold) {
		return nil, errorsmod.Wrapf(types.ErrInvalidGuardianSignatures, "invalid guardian signatures: %d valid required, %d provided", guardianConfig.Threshold, validSignatures)
	}

	// Apply recovery changes
	if msg.NewDocument != nil {
		// Validate the new document
		if err := msg.NewDocument.Validate(); err != nil {
			return nil, errorsmod.Wrapf(types.ErrInvalidDIDDocument, "validation failed: %v", err)
		}

		// Preserve essential metadata
		msg.NewDocument.Id = msg.Id
		msg.NewDocument.Created = didDoc.Created
		msg.NewDocument.Version = didDoc.Version + 1
		
		now := time.Now()
		msg.NewDocument.Updated = now.Format(time.RFC3339)

		if msg.NewDocument.Metadata == nil {
			msg.NewDocument.Metadata = didDoc.Metadata
		}
		msg.NewDocument.Metadata.UpdatedAt = now.Unix()
		msg.NewDocument.Metadata.Version = msg.NewDocument.Version
		msg.NewDocument.Metadata.UpdatedBy = "guardian-recovery"
		msg.NewDocument.Metadata.Status = "active"

		// Store the recovered document
		k.Keeper.SetDIDDocument(ctx, *msg.NewDocument)
		didDoc = *msg.NewDocument
	} else {
		// Just reactivate the existing document
		now := time.Now()
		didDoc.Updated = now.Format(time.RFC3339)
		didDoc.Version++

		if didDoc.Metadata != nil {
			didDoc.Metadata.Status = "active"
			didDoc.Metadata.UpdatedAt = now.Unix()
			didDoc.Metadata.Version = didDoc.Version
			didDoc.Metadata.UpdatedBy = "guardian-recovery"
			didDoc.Metadata.DeactivatedAt = nil
			didDoc.Metadata.DeactivationReason = ""
		}

		k.Keeper.SetDIDDocument(ctx, didDoc)
	}

	// Create audit entry
	changes, _ := json.Marshal(map[string]interface{}{
		"action":               "recover",
		"guardian_signatures":  len(msg.GuardianSignatures),
		"threshold_met":        validSignatures >= int(guardianConfig.Threshold),
		"reason":              msg.Reason,
		"new_document_provided": msg.NewDocument != nil,
	})
	auditEntry := types.AuditEntry{
		Timestamp: time.Now().Unix(),
		Action:    "recover",
		Actor:     "guardian-recovery",
		DID:       msg.Id,
		Changes:   string(changes),
		IPAddress: msg.Metadata.GetIPAddress(),
		UserAgent: msg.Metadata.GetUserAgent(),
	}
	k.Keeper.AddAuditEntry(ctx, msg.Id, auditEntry)

	// Emit recovery event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeRecoverDID,
			sdk.NewAttribute(types.AttributeKeyDID, msg.Id),
			sdk.NewAttribute(types.AttributeKeyGuardians, fmt.Sprintf("%d", validSignatures)),
			sdk.NewAttribute(types.AttributeKeyReason, msg.Reason),
		),
	)

	return &types.MsgRecoverDIDResponse{
		Success: true,
		Version: didDoc.Version,
	}, nil
}