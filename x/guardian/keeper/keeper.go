package keeper

import (
	"context"
	"fmt"
	"slices"

	"cosmossdk.io/core/store"
	"cosmossdk.io/log"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"

	"github.com/persona-chain/persona-chain/x/guardian/types"
	didtypes "github.com/persona-chain/persona-chain/x/did/types"
)

type (
	Keeper struct {
		cdc        codec.BinaryCodec
		storeService store.KVStoreService
		logger     log.Logger

		// the address capable of executing a MsgUpdateParams message. Typically, this
		// should be the x/gov module account.
		authority string

		paramstore    paramtypes.Subspace
		didKeeper     types.DidKeeper
		accountKeeper types.AccountKeeper
	}
)

func NewKeeper(
	cdc codec.BinaryCodec,
	storeService store.KVStoreService,
	ps paramtypes.Subspace,
	didKeeper types.DidKeeper,
	accountKeeper types.AccountKeeper,
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
		didKeeper:     didKeeper,
		accountKeeper: accountKeeper,
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

// SetGuardian set a specific guardian in the store
func (k Keeper) SetGuardian(ctx context.Context, guardian types.Guardian) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.GuardianKeyPrefix))
	b := k.cdc.MustMarshal(&guardian)
	store.Set(types.GuardianKey(guardian.DidId, guardian.GuardianAddress), b)
}

// GetGuardian returns a guardian from its index
func (k Keeper) GetGuardian(
	ctx context.Context,
	didId string,
	guardianAddress string,
) (val types.Guardian, found bool) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.GuardianKeyPrefix))

	b := store.Get(types.GuardianKey(didId, guardianAddress))
	if b == nil {
		return val, false
	}

	k.cdc.MustUnmarshal(b, &val)
	return val, true
}

// RemoveGuardian removes a guardian from the store
func (k Keeper) RemoveGuardian(
	ctx context.Context,
	didId string,
	guardianAddress string,
) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.GuardianKeyPrefix))
	store.Delete(types.GuardianKey(didId, guardianAddress))
}

// GetGuardiansByDid returns all guardians for a specific DID
func (k Keeper) GetGuardiansByDid(ctx context.Context, didId string) (list []types.Guardian) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.GuardianKeyPrefix))
	
	prefix := []byte(didId + "/")
	iterator := storetypes.KVStorePrefixIterator(store, prefix)

	defer iterator.Close()

	for ; iterator.Valid(); iterator.Next() {
		var val types.Guardian
		k.cdc.MustUnmarshal(iterator.Value(), &val)
		if val.Active {
			list = append(list, val)
		}
	}

	return
}

// SetRecoveryProposal set a specific recovery proposal in the store
func (k Keeper) SetRecoveryProposal(ctx context.Context, proposal types.RecoveryProposal) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.RecoveryProposalKeyPrefix))
	b := k.cdc.MustMarshal(&proposal)
	store.Set(types.RecoveryProposalKey(proposal.Id), b)
}

// GetRecoveryProposal returns a recovery proposal from its index
func (k Keeper) GetRecoveryProposal(
	ctx context.Context,
	id string,
) (val types.RecoveryProposal, found bool) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.RecoveryProposalKeyPrefix))

	b := store.Get(types.RecoveryProposalKey(id))
	if b == nil {
		return val, false
	}

	k.cdc.MustUnmarshal(b, &val)
	return val, true
}

// RemoveRecoveryProposal removes a recovery proposal from the store
func (k Keeper) RemoveRecoveryProposal(
	ctx context.Context,
	id string,
) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.RecoveryProposalKeyPrefix))
	store.Delete(types.RecoveryProposalKey(id))
}

// GetAllRecoveryProposal returns all recovery proposals
func (k Keeper) GetAllRecoveryProposal(ctx context.Context) (list []types.RecoveryProposal) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.RecoveryProposalKeyPrefix))
	iterator := storetypes.KVStorePrefixIterator(store, []byte{})

	defer iterator.Close()

	for ; iterator.Valid(); iterator.Next() {
		var val types.RecoveryProposal
		k.cdc.MustUnmarshal(iterator.Value(), &val)
		list = append(list, val)
	}

	return
}

// SetThresholdSignature set a specific threshold signature in the store
func (k Keeper) SetThresholdSignature(ctx context.Context, signature types.ThresholdSignature) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.ThresholdSignatureKeyPrefix))
	b := k.cdc.MustMarshal(&signature)
	store.Set(types.ThresholdSignatureKey(signature.ProposalId, signature.Signer), b)
}

// GetThresholdSignature returns a threshold signature from its index
func (k Keeper) GetThresholdSignature(
	ctx context.Context,
	proposalId string,
	signer string,
) (val types.ThresholdSignature, found bool) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.ThresholdSignatureKeyPrefix))

	b := store.Get(types.ThresholdSignatureKey(proposalId, signer))
	if b == nil {
		return val, false
	}

	k.cdc.MustUnmarshal(b, &val)
	return val, true
}

// GetThresholdSignaturesByProposal returns all threshold signatures for a proposal
func (k Keeper) GetThresholdSignaturesByProposal(ctx context.Context, proposalId string) (list []types.ThresholdSignature) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.ThresholdSignatureKeyPrefix))
	
	prefix := []byte(proposalId + "/")
	iterator := storetypes.KVStorePrefixIterator(store, prefix)

	defer iterator.Close()

	for ; iterator.Valid(); iterator.Next() {
		var val types.ThresholdSignature
		k.cdc.MustUnmarshal(iterator.Value(), &val)
		list = append(list, val)
	}

	return
}

// IsGuardian checks if an address is a guardian for a specific DID
func (k Keeper) IsGuardian(ctx context.Context, didId string, guardianAddress string) bool {
	guardian, found := k.GetGuardian(ctx, didId, guardianAddress)
	return found && guardian.Active
}

// HasApproved checks if a guardian has already approved a proposal
func (k Keeper) HasApproved(proposal types.RecoveryProposal, guardianAddress string) bool {
	return slices.Contains(proposal.Approvals, guardianAddress)
}

// HasRejected checks if a guardian has already rejected a proposal
func (k Keeper) HasRejected(proposal types.RecoveryProposal, guardianAddress string) bool {
	return slices.Contains(proposal.Rejections, guardianAddress)
}

// GetThreshold returns the threshold parameter
func (k Keeper) GetThreshold(ctx context.Context) uint32 {
	var params types.Params
	k.paramstore.GetParamSet(ctx, &params)
	return params.Threshold
}

// GetMaxGuardians returns the max guardians parameter
func (k Keeper) GetMaxGuardians(ctx context.Context) uint32 {
	var params types.Params
	k.paramstore.GetParamSet(ctx, &params)
	return params.MaxGuardians
}

// CheckThresholdReached checks if the threshold for approvals has been reached
func (k Keeper) CheckThresholdReached(ctx context.Context, proposal types.RecoveryProposal) bool {
	threshold := k.GetThreshold(ctx)
	return uint32(len(proposal.Approvals)) >= threshold
}

// ValidateDidExists checks if a DID document exists and is active
func (k Keeper) ValidateDidExists(ctx context.Context, didId string) error {
	didDoc, found := k.didKeeper.GetDidDocument(ctx, didId)
	if !found {
		return fmt.Errorf("DID document not found: %s", didId)
	}
	if !didDoc.Active {
		return fmt.Errorf("DID document is deactivated: %s", didId)
	}
	return nil
}

// ExecuteDidRecovery updates the DID controller after successful recovery
func (k Keeper) ExecuteDidRecovery(ctx context.Context, didId string, newController string) error {
	didDoc, found := k.didKeeper.GetDidDocument(ctx, didId)
	if !found {
		return fmt.Errorf("DID document not found: %s", didId)
	}
	
	// Update the DID controller
	didDoc.Creator = newController
	k.didKeeper.SetDidDocument(ctx, didDoc)
	
	return nil
}