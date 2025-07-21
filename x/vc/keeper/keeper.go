package keeper

import (
	"context"
	"fmt"

	"cosmossdk.io/core/store"
	"cosmossdk.io/log"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"

	"github.com/persona-chain/persona-chain/x/vc/types"
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

		paramstore paramtypes.Subspace
		didKeeper  types.DidKeeper
	}
)

func NewKeeper(
	cdc codec.BinaryCodec,
	storeService store.KVStoreService,
	ps paramtypes.Subspace,
	didKeeper types.DidKeeper,
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

// SetVcRecord set a specific vcRecord in the store from its index
func (k Keeper) SetVcRecord(ctx context.Context, vcRecord types.VcRecord) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.VcRecordKeyPrefix))
	b := k.cdc.MustMarshal(&vcRecord)
	store.Set(types.VcRecordKey(
		vcRecord.Id,
	), b)
	
	// Set secondary indexes
	k.setVcRecordByIssuer(ctx, vcRecord)
	k.setVcRecordBySubject(ctx, vcRecord)
}

// setVcRecordByIssuer sets the secondary index for issuer DID
func (k Keeper) setVcRecordByIssuer(ctx context.Context, vcRecord types.VcRecord) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.VcRecordByIssuerKeyPrefix))
	store.Set(types.VcRecordByIssuerKey(vcRecord.IssuerDid, vcRecord.Id), []byte(vcRecord.Id))
}

// setVcRecordBySubject sets the secondary index for subject DID
func (k Keeper) setVcRecordBySubject(ctx context.Context, vcRecord types.VcRecord) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.VcRecordBySubjectKeyPrefix))
	store.Set(types.VcRecordBySubjectKey(vcRecord.SubjectDid, vcRecord.Id), []byte(vcRecord.Id))
}

// GetVcRecord returns a vcRecord from its index
func (k Keeper) GetVcRecord(
	ctx context.Context,
	id string,
) (val types.VcRecord, found bool) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.VcRecordKeyPrefix))

	b := store.Get(types.VcRecordKey(
		id,
	))
	if b == nil {
		return val, false
	}

	k.cdc.MustUnmarshal(b, &val)
	return val, true
}

// RemoveVcRecord removes a vcRecord from the store
func (k Keeper) RemoveVcRecord(
	ctx context.Context,
	id string,
) {
	// Get the record first to remove secondary indexes
	vcRecord, found := k.GetVcRecord(ctx, id)
	if !found {
		return
	}
	
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.VcRecordKeyPrefix))
	store.Delete(types.VcRecordKey(id))
	
	// Remove secondary indexes
	k.removeVcRecordByIssuer(ctx, vcRecord)
	k.removeVcRecordBySubject(ctx, vcRecord)
}

// removeVcRecordByIssuer removes the secondary index for issuer DID
func (k Keeper) removeVcRecordByIssuer(ctx context.Context, vcRecord types.VcRecord) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.VcRecordByIssuerKeyPrefix))
	store.Delete(types.VcRecordByIssuerKey(vcRecord.IssuerDid, vcRecord.Id))
}

// removeVcRecordBySubject removes the secondary index for subject DID
func (k Keeper) removeVcRecordBySubject(ctx context.Context, vcRecord types.VcRecord) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.VcRecordBySubjectKeyPrefix))
	store.Delete(types.VcRecordBySubjectKey(vcRecord.SubjectDid, vcRecord.Id))
}

// GetAllVcRecord returns all vcRecord
func (k Keeper) GetAllVcRecord(ctx context.Context) (list []types.VcRecord) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.VcRecordKeyPrefix))
	iterator := storetypes.KVStorePrefixIterator(store, []byte{})

	defer iterator.Close()

	for ; iterator.Valid(); iterator.Next() {
		var val types.VcRecord
		k.cdc.MustUnmarshal(iterator.Value(), &val)
		list = append(list, val)
	}

	return
}

// GetVcRecordsByIssuer returns all VCs issued by a specific DID
func (k Keeper) GetVcRecordsByIssuer(ctx context.Context, issuerDid string) (list []types.VcRecord) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.VcRecordByIssuerKeyPrefix))
	
	prefix := []byte(issuerDid + "/")
	iterator := storetypes.KVStorePrefixIterator(store, prefix)

	defer iterator.Close()

	for ; iterator.Valid(); iterator.Next() {
		vcId := string(iterator.Value())
		if vcRecord, found := k.GetVcRecord(ctx, vcId); found {
			list = append(list, vcRecord)
		}
	}

	return
}

// GetVcRecordsBySubject returns all VCs for a specific subject DID
func (k Keeper) GetVcRecordsBySubject(ctx context.Context, subjectDid string) (list []types.VcRecord) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.VcRecordBySubjectKeyPrefix))
	
	prefix := []byte(subjectDid + "/")
	iterator := storetypes.KVStorePrefixIterator(store, prefix)

	defer iterator.Close()

	for ; iterator.Valid(); iterator.Next() {
		vcId := string(iterator.Value())
		if vcRecord, found := k.GetVcRecord(ctx, vcId); found {
			list = append(list, vcRecord)
		}
	}

	return
}

// VcRecordExists checks if a VC record exists
func (k Keeper) VcRecordExists(ctx context.Context, id string) bool {
	_, found := k.GetVcRecord(ctx, id)
	return found
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