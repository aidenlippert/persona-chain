package keeper

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"

	"cosmossdk.io/core/store"
	"cosmossdk.io/log"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	govtypes "github.com/cosmos/cosmos-sdk/x/gov/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"

	"github.com/persona-chain/persona-chain/x/zk/types"
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
		vcKeeper   types.VcKeeper
	}
)

func NewKeeper(
	cdc codec.BinaryCodec,
	storeService store.KVStoreService,
	ps paramtypes.Subspace,
	vcKeeper types.VcKeeper,
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
		vcKeeper:      vcKeeper,
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

// SetZkProof set a specific zkProof in the store from its index
func (k Keeper) SetZkProof(ctx context.Context, zkProof types.ZkProof) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.ZkProofKeyPrefix))
	b := k.cdc.MustMarshal(&zkProof)
	store.Set(types.ZkProofKey(
		zkProof.Id,
	), b)
	
	// Set secondary indexes
	k.setZkProofByCircuit(ctx, zkProof)
}

// setZkProofByCircuit sets the secondary index for circuit ID
func (k Keeper) setZkProofByCircuit(ctx context.Context, zkProof types.ZkProof) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.ZkProofByCircuitKeyPrefix))
	store.Set(types.ZkProofByCircuitKey(zkProof.CircuitId, zkProof.Id), []byte(zkProof.Id))
}

// GetZkProof returns a zkProof from its index
func (k Keeper) GetZkProof(
	ctx context.Context,
	id string,
) (val types.ZkProof, found bool) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.ZkProofKeyPrefix))

	b := store.Get(types.ZkProofKey(
		id,
	))
	if b == nil {
		return val, false
	}

	k.cdc.MustUnmarshal(b, &val)
	return val, true
}

// RemoveZkProof removes a zkProof from the store
func (k Keeper) RemoveZkProof(
	ctx context.Context,
	id string,
) {
	// Get the record first to remove secondary indexes
	zkProof, found := k.GetZkProof(ctx, id)
	if !found {
		return
	}
	
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.ZkProofKeyPrefix))
	store.Delete(types.ZkProofKey(id))
	
	// Remove secondary indexes
	k.removeZkProofByCircuit(ctx, zkProof)
}

// removeZkProofByCircuit removes the secondary index for circuit ID
func (k Keeper) removeZkProofByCircuit(ctx context.Context, zkProof types.ZkProof) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.ZkProofByCircuitKeyPrefix))
	store.Delete(types.ZkProofByCircuitKey(zkProof.CircuitId, zkProof.Id))
}

// GetAllZkProof returns all zkProof
func (k Keeper) GetAllZkProof(ctx context.Context) (list []types.ZkProof) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.ZkProofKeyPrefix))
	iterator := storetypes.KVStorePrefixIterator(store, []byte{})

	defer iterator.Close()

	for ; iterator.Valid(); iterator.Next() {
		var val types.ZkProof
		k.cdc.MustUnmarshal(iterator.Value(), &val)
		list = append(list, val)
	}

	return
}

// GetZkProofsByCircuit returns all proofs for a specific circuit
func (k Keeper) GetZkProofsByCircuit(ctx context.Context, circuitId string) (list []types.ZkProof) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.ZkProofByCircuitKeyPrefix))
	
	prefix := []byte(circuitId + "/")
	iterator := storetypes.KVStorePrefixIterator(store, prefix)

	defer iterator.Close()

	for ; iterator.Valid(); iterator.Next() {
		proofId := string(iterator.Value())
		if zkProof, found := k.GetZkProof(ctx, proofId); found {
			list = append(list, zkProof)
		}
	}

	return
}

// SetCircuit set a specific circuit in the store from its index
func (k Keeper) SetCircuit(ctx context.Context, circuit types.Circuit) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.CircuitKeyPrefix))
	b := k.cdc.MustMarshal(&circuit)
	store.Set(types.CircuitKey(
		circuit.Id,
	), b)
}

// GetCircuit returns a circuit from its index
func (k Keeper) GetCircuit(
	ctx context.Context,
	id string,
) (val types.Circuit, found bool) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.CircuitKeyPrefix))

	b := store.Get(types.CircuitKey(
		id,
	))
	if b == nil {
		return val, false
	}

	k.cdc.MustUnmarshal(b, &val)
	return val, true
}

// RemoveCircuit removes a circuit from the store
func (k Keeper) RemoveCircuit(
	ctx context.Context,
	id string,
) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.CircuitKeyPrefix))
	store.Delete(types.CircuitKey(id))
}

// GetAllCircuit returns all circuit
func (k Keeper) GetAllCircuit(ctx context.Context) (list []types.Circuit) {
	storeAdapter := runtime.KVStoreAdapter(k.storeService.OpenKVStore(ctx))
	store := prefix.NewStore(storeAdapter, types.KeyPrefix(types.CircuitKeyPrefix))
	iterator := storetypes.KVStorePrefixIterator(store, []byte{})

	defer iterator.Close()

	for ; iterator.Valid(); iterator.Next() {
		var val types.Circuit
		k.cdc.MustUnmarshal(iterator.Value(), &val)
		list = append(list, val)
	}

	return
}

// ZkProofExists checks if a ZK proof exists
func (k Keeper) ZkProofExists(ctx context.Context, id string) bool {
	_, found := k.GetZkProof(ctx, id)
	return found
}

// CircuitExists checks if a circuit exists
func (k Keeper) CircuitExists(ctx context.Context, id string) bool {
	_, found := k.GetCircuit(ctx, id)
	return found
}

// GenerateCodeHash generates a hash for WASM code
func (k Keeper) GenerateCodeHash(wasmCode string) (string, error) {
	// Decode base64 WASM code
	wasmBytes, err := base64.StdEncoding.DecodeString(wasmCode)
	if err != nil {
		return "", fmt.Errorf("invalid base64 WASM code: %w", err)
	}
	
	// Generate SHA256 hash
	hash := sha256.Sum256(wasmBytes)
	return hex.EncodeToString(hash[:]), nil
}

// VerifyProofWithWasm simulates proof verification using WASM
// In a real implementation, this would execute the WASM verifier
func (k Keeper) VerifyProofWithWasm(ctx context.Context, circuitId string, publicInputs string, proofData string) (bool, error) {
	// Get circuit
	circuit, found := k.GetCircuit(ctx, circuitId)
	if !found {
		return false, fmt.Errorf("circuit not found: %s", circuitId)
	}
	
	if !circuit.Active {
		return false, fmt.Errorf("circuit is deactivated: %s", circuitId)
	}
	
	// In a real implementation, this would:
	// 1. Load the WASM module from circuit.WasmCodeHash
	// 2. Execute the verifier with publicInputs and proofData
	// 3. Return the verification result
	
	// For now, we'll simulate verification with basic validation
	if publicInputs == "" || proofData == "" {
		return false, nil
	}
	
	// Simulate successful verification
	// In practice, this would be the result of WASM execution
	return true, nil
}