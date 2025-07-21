package simulation

import (
	"fmt"
	"math/rand"

	"github.com/cosmos/cosmos-sdk/baseapp"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	moduletestutil "github.com/cosmos/cosmos-sdk/types/module/testutil"
	simtypes "github.com/cosmos/cosmos-sdk/types/simulation"
	"github.com/cosmos/cosmos-sdk/x/simulation"

	"github.com/persona-chain/persona-chain/x/did/keeper"
	"github.com/persona-chain/persona-chain/x/did/types"
)

// Simulation operation weights constants
const (
	OpWeightMsgCreateDid     = "op_weight_msg_create_did"
	OpWeightMsgUpdateDid     = "op_weight_msg_update_did"
	OpWeightMsgDeactivateDid = "op_weight_msg_deactivate_did"

	DefaultWeightMsgCreateDid     = 100
	DefaultWeightMsgUpdateDid     = 50
	DefaultWeightMsgDeactivateDid = 20
)

// WeightedOperations returns all the operations from the module with their respective weights
func WeightedOperations(
	appParams simtypes.AppParams,
	cdc codec.JSONCodec,
	k keeper.Keeper,
	ak types.AccountKeeper,
	bk types.BankKeeper,
) simulation.WeightedOperations {
	var (
		weightMsgCreateDid     int
		weightMsgUpdateDid     int
		weightMsgDeactivateDid int
	)

	appParams.GetOrGenerate(cdc, OpWeightMsgCreateDid, &weightMsgCreateDid, nil,
		func(_ *rand.Rand) {
			weightMsgCreateDid = DefaultWeightMsgCreateDid
		},
	)

	appParams.GetOrGenerate(cdc, OpWeightMsgUpdateDid, &weightMsgUpdateDid, nil,
		func(_ *rand.Rand) {
			weightMsgUpdateDid = DefaultWeightMsgUpdateDid
		},
	)

	appParams.GetOrGenerate(cdc, OpWeightMsgDeactivateDid, &weightMsgDeactivateDid, nil,
		func(_ *rand.Rand) {
			weightMsgDeactivateDid = DefaultWeightMsgDeactivateDid
		},
	)

	return simulation.WeightedOperations{
		simulation.NewWeightedOperation(
			weightMsgCreateDid,
			SimulateMsgCreateDid(ak, bk, k),
		),
		simulation.NewWeightedOperation(
			weightMsgUpdateDid,
			SimulateMsgUpdateDid(ak, bk, k),
		),
		simulation.NewWeightedOperation(
			weightMsgDeactivateDid,
			SimulateMsgDeactivateDid(ak, bk, k),
		),
	}
}

// SimulateMsgCreateDid generates a MsgCreateDid with random values
func SimulateMsgCreateDid(
	ak types.AccountKeeper,
	bk types.BankKeeper,
	k keeper.Keeper,
) simtypes.Operation {
	return func(r *rand.Rand, app *baseapp.BaseApp, ctx sdk.Context, accs []simtypes.Account, chainID string,
	) (simtypes.OperationMsg, []simtypes.FutureOperation, error) {
		simAccount, _ := simtypes.RandomAcc(r, accs)

		// Generate random DID
		didId := generateRandomDID(r)
		
		// Check if DID already exists
		if k.DidDocumentExists(ctx, didId) {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgCreateDid, "DID already exists"), nil, nil
		}

		// Generate random DID document
		didDocument := generateRandomDidDocument(r, didId)

		msg := &types.MsgCreateDid{
			Creator:     simAccount.Address.String(),
			Id:          didId,
			DidDocument: didDocument,
		}

		account := ak.GetAccount(ctx, simAccount.Address)
		spendable := bk.SpendableCoins(ctx, account.GetAddress())

		txCtx := simulation.OperationInput{
			R:               r,
			App:             app,
			TxGen:           moduletestutil.MakeTestEncodingConfig().TxConfig,
			Cdc:             nil,
			Msg:             msg,
			MsgType:         msg.Type(),
			Context:         ctx,
			SimAccount:      simAccount,
			AccountKeeper:   ak,
			Bankkeeper:      bk,
			ModuleName:      types.ModuleName,
			CoinsSpentInMsg: spendable,
		}

		return simulation.GenAndDeliverTxWithRandFees(txCtx)
	}
}

// SimulateMsgUpdateDid generates a MsgUpdateDid with random values
func SimulateMsgUpdateDid(
	ak types.AccountKeeper,
	bk types.BankKeeper,
	k keeper.Keeper,
) simtypes.Operation {
	return func(r *rand.Rand, app *baseapp.BaseApp, ctx sdk.Context, accs []simtypes.Account, chainID string,
	) (simtypes.OperationMsg, []simtypes.FutureOperation, error) {
		// Get all existing DIDs
		allDids := k.GetAllDidDocument(ctx)
		if len(allDids) == 0 {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgUpdateDid, "no DIDs exist"), nil, nil
		}

		// Select random DID
		didDoc := allDids[r.Intn(len(allDids))]
		
		// Skip if DID is not active
		if !didDoc.Active {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgUpdateDid, "DID is not active"), nil, nil
		}

		// Find the creator account
		var simAccount simtypes.Account
		creatorAddr, err := sdk.AccAddressFromBech32(didDoc.Creator)
		if err != nil {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgUpdateDid, "invalid creator address"), nil, nil
		}

		for _, acc := range accs {
			if acc.Address.Equals(creatorAddr) {
				simAccount = acc
				break
			}
		}

		if simAccount.Address.Empty() {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgUpdateDid, "creator account not found"), nil, nil
		}

		// Generate updated DID document
		updatedDidDocument := generateRandomDidDocument(r, didDoc.Id)

		msg := &types.MsgUpdateDid{
			Creator:     simAccount.Address.String(),
			Id:          didDoc.Id,
			DidDocument: updatedDidDocument,
		}

		account := ak.GetAccount(ctx, simAccount.Address)
		spendable := bk.SpendableCoins(ctx, account.GetAddress())

		txCtx := simulation.OperationInput{
			R:               r,
			App:             app,
			TxGen:           moduletestutil.MakeTestEncodingConfig().TxConfig,
			Cdc:             nil,
			Msg:             msg,
			MsgType:         msg.Type(),
			Context:         ctx,
			SimAccount:      simAccount,
			AccountKeeper:   ak,
			Bankkeeper:      bk,
			ModuleName:      types.ModuleName,
			CoinsSpentInMsg: spendable,
		}

		return simulation.GenAndDeliverTxWithRandFees(txCtx)
	}
}

// SimulateMsgDeactivateDid generates a MsgDeactivateDid with random values
func SimulateMsgDeactivateDid(
	ak types.AccountKeeper,
	bk types.BankKeeper,
	k keeper.Keeper,
) simtypes.Operation {
	return func(r *rand.Rand, app *baseapp.BaseApp, ctx sdk.Context, accs []simtypes.Account, chainID string,
	) (simtypes.OperationMsg, []simtypes.FutureOperation, error) {
		// Get all existing active DIDs
		allDids := k.GetAllDidDocument(ctx)
		activeDids := make([]types.DidDocument, 0)
		for _, did := range allDids {
			if did.Active {
				activeDids = append(activeDids, did)
			}
		}

		if len(activeDids) == 0 {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgDeactivateDid, "no active DIDs exist"), nil, nil
		}

		// Select random active DID
		didDoc := activeDids[r.Intn(len(activeDids))]

		// Find the creator account
		var simAccount simtypes.Account
		creatorAddr, err := sdk.AccAddressFromBech32(didDoc.Creator)
		if err != nil {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgDeactivateDid, "invalid creator address"), nil, nil
		}

		for _, acc := range accs {
			if acc.Address.Equals(creatorAddr) {
				simAccount = acc
				break
			}
		}

		if simAccount.Address.Empty() {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgDeactivateDid, "creator account not found"), nil, nil
		}

		msg := &types.MsgDeactivateDid{
			Creator: simAccount.Address.String(),
			Id:      didDoc.Id,
		}

		account := ak.GetAccount(ctx, simAccount.Address)
		spendable := bk.SpendableCoins(ctx, account.GetAddress())

		txCtx := simulation.OperationInput{
			R:               r,
			App:             app,
			TxGen:           moduletestutil.MakeTestEncodingConfig().TxConfig,
			Cdc:             nil,
			Msg:             msg,
			MsgType:         msg.Type(),
			Context:         ctx,
			SimAccount:      simAccount,
			AccountKeeper:   ak,
			Bankkeeper:      bk,
			ModuleName:      types.ModuleName,
			CoinsSpentInMsg: spendable,
		}

		return simulation.GenAndDeliverTxWithRandFees(txCtx)
	}
}

// Helper functions for generating random data
func generateRandomDID(r *rand.Rand) string {
	return fmt.Sprintf("did:persona:sim%d", r.Intn(1000000))
}

func generateRandomDidDocument(r *rand.Rand, didId string) string {
	return fmt.Sprintf(`{
		"@context": ["https://www.w3.org/ns/did/v1"],
		"id": "%s",
		"verificationMethod": [{
			"id": "%s#key1",
			"type": "Ed25519VerificationKey2020",
			"controller": "%s",
			"publicKeyBase58": "%s"
		}],
		"authentication": ["%s#key1"]
	}`, didId, didId, didId, generateRandomKey(r), didId)
}

func generateRandomKey(r *rand.Rand) string {
	const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
	key := make([]byte, 44) // Base58 encoded 32-byte key
	for i := range key {
		key[i] = chars[r.Intn(len(chars))]
	}
	return string(key)
}