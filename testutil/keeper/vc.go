package keeper

import (
	"context"
	"testing"

	"cosmossdk.io/log"
	"cosmossdk.io/store"
	"cosmossdk.io/store/metrics"
	storetypes "cosmossdk.io/store/types"
	cmtproto "github.com/cometbft/cometbft/proto/tendermint/types"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/cosmos-sdk/codec"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/cosmos/cosmos-sdk/runtime"
	sdk "github.com/cosmos/cosmos-sdk/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
	"github.com/stretchr/testify/require"

	"github.com/persona-chain/persona-chain/x/vc/keeper"
	"github.com/persona-chain/persona-chain/x/vc/types"
	didtypes "github.com/persona-chain/persona-chain/x/did/types"
)

func VcKeeper(t testing.TB) (keeper.Keeper, sdk.Context) {
	storeKey := storetypes.NewKVStoreKey(types.StoreKey)
	memStoreKey := storetypes.NewMemoryStoreKey(types.MemStoreKey)

	db := dbm.NewMemDB()
	stateStore := store.NewCommitMultiStore(db, log.NewNopLogger(), metrics.NewNoOpMetrics())
	stateStore.MountStoreWithDB(storeKey, storetypes.StoreTypeIAVL, db)
	stateStore.MountStoreWithDB(memStoreKey, storetypes.StoreTypeMemory, nil)
	require.NoError(t, stateStore.LoadLatestVersion())

	registry := codectypes.NewInterfaceRegistry()
	cdc := codec.NewProtoCodec(registry)

	paramsSubspace := paramtypes.NewSubspace(cdc,
		types.Amino,
		storeKey,
		memStoreKey,
		"VcParams",
	)

	// Mock DID keeper
	didKeeper := &MockDidKeeper{}

	k := keeper.NewKeeper(
		cdc,
		runtime.NewKVStoreService(storeKey),
		paramsSubspace,
		didKeeper,
	)

	ctx := sdk.NewContext(stateStore, cmtproto.Header{}, false, log.NewNopLogger())

	// Initialize the module's params
	if err := k.SetParams(ctx, types.DefaultParams()); err != nil {
		panic(err)
	}

	return k, ctx
}

// MockDidKeeper implements the expected DID keeper interface for testing
type MockDidKeeper struct {
	activeDids map[string]bool
}

func NewMockDidKeeper() *MockDidKeeper {
	return &MockDidKeeper{
		activeDids: make(map[string]bool),
	}
}

func (m *MockDidKeeper) AddActiveDid(didId string) {
	if m.activeDids == nil {
		m.activeDids = make(map[string]bool)
	}
	m.activeDids[didId] = true
}

func (m *MockDidKeeper) GetDidDocument(ctx context.Context, didId string) (didtypes.DidDocument, bool) {
	active, exists := m.activeDids[didId]
	if !exists {
		return didtypes.DidDocument{}, false
	}
	
	return didtypes.DidDocument{
		Id:      didId,
		Active:  active,
		Creator: "cosmos1test",
	}, true
}

func (m *MockDidKeeper) SetDidDocument(ctx context.Context, didDoc didtypes.DidDocument) {
	if m.activeDids == nil {
		m.activeDids = make(map[string]bool)
	}
	m.activeDids[didDoc.Id] = didDoc.Active
}