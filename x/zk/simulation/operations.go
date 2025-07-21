package simulation

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/cosmos/cosmos-sdk/baseapp"
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	moduletestutil "github.com/cosmos/cosmos-sdk/types/module/testutil"
	simtypes "github.com/cosmos/cosmos-sdk/types/simulation"
	"github.com/cosmos/cosmos-sdk/x/simulation"

	"github.com/persona-chain/persona-chain/x/zk/keeper"
	"github.com/persona-chain/persona-chain/x/zk/types"
)

// Simulation operation weights constants
const (
	OpWeightMsgRegisterCircuit = "op_weight_msg_register_circuit"
	OpWeightMsgSubmitProof     = "op_weight_msg_submit_proof"
	OpWeightMsgDeactivateCircuit = "op_weight_msg_deactivate_circuit"

	DefaultWeightMsgRegisterCircuit = 30
	DefaultWeightMsgSubmitProof     = 60
	DefaultWeightMsgDeactivateCircuit = 10
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
		weightMsgRegisterCircuit int
		weightMsgSubmitProof     int
		weightMsgDeactivateCircuit int
	)

	appParams.GetOrGenerate(cdc, OpWeightMsgRegisterCircuit, &weightMsgRegisterCircuit, nil,
		func(_ *rand.Rand) {
			weightMsgRegisterCircuit = DefaultWeightMsgRegisterCircuit
		},
	)

	appParams.GetOrGenerate(cdc, OpWeightMsgSubmitProof, &weightMsgSubmitProof, nil,
		func(_ *rand.Rand) {
			weightMsgSubmitProof = DefaultWeightMsgSubmitProof
		},
	)

	appParams.GetOrGenerate(cdc, OpWeightMsgDeactivateCircuit, &weightMsgDeactivateCircuit, nil,
		func(_ *rand.Rand) {
			weightMsgDeactivateCircuit = DefaultWeightMsgDeactivateCircuit
		},
	)

	return simulation.WeightedOperations{
		simulation.NewWeightedOperation(
			weightMsgRegisterCircuit,
			SimulateMsgRegisterCircuit(ak, bk, k),
		),
		simulation.NewWeightedOperation(
			weightMsgSubmitProof,
			SimulateMsgSubmitProof(ak, bk, k),
		),
		simulation.NewWeightedOperation(
			weightMsgDeactivateCircuit,
			SimulateMsgDeactivateCircuit(ak, bk, k),
		),
	}
}

// SimulateMsgRegisterCircuit generates a MsgRegisterCircuit with random values
func SimulateMsgRegisterCircuit(
	ak types.AccountKeeper,
	bk types.BankKeeper,
	k keeper.Keeper,
) simtypes.Operation {
	return func(r *rand.Rand, app *baseapp.BaseApp, ctx sdk.Context, accs []simtypes.Account, chainID string,
	) (simtypes.OperationMsg, []simtypes.FutureOperation, error) {
		simAccount, _ := simtypes.RandomAcc(r, accs)

		// Generate random circuit ID
		circuitId := generateRandomCircuitId(r)
		
		// Check if circuit already exists
		if k.CircuitExists(ctx, circuitId) {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgRegisterCircuit, "circuit already exists"), nil, nil
		}

		msg := &types.MsgRegisterCircuit{
			Creator:         simAccount.Address.String(),
			Id:              circuitId,
			Name:            generateRandomCircuitName(r),
			Description:     generateRandomCircuitDescription(r),
			WasmCodeHash:    generateRandomWasmHash(r),
			VerificationKey: generateRandomVerificationKey(r),
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

// SimulateMsgSubmitProof generates a MsgSubmitProof with random values
func SimulateMsgSubmitProof(
	ak types.AccountKeeper,
	bk types.BankKeeper,
	k keeper.Keeper,
) simtypes.Operation {
	return func(r *rand.Rand, app *baseapp.BaseApp, ctx sdk.Context, accs []simtypes.Account, chainID string,
	) (simtypes.OperationMsg, []simtypes.FutureOperation, error) {
		
		// Get all active circuits
		allCircuits := k.GetAllCircuit(ctx)
		activeCircuits := make([]types.Circuit, 0)
		for _, circuit := range allCircuits {
			if circuit.Active {
				activeCircuits = append(activeCircuits, circuit)
			}
		}

		if len(activeCircuits) == 0 {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgSubmitProof, "no active circuits exist"), nil, nil
		}

		// Select random circuit
		circuit := activeCircuits[r.Intn(len(activeCircuits))]
		simAccount, _ := simtypes.RandomAcc(r, accs)

		// Generate random proof data
		proofId := generateRandomProofId(r)
		publicInputs := generateRandomPublicInputs(r)
		proofData := generateRandomProofData(r)

		msg := &types.MsgSubmitProof{
			Creator:      simAccount.Address.String(),
			Id:           proofId,
			CircuitId:    circuit.Id,
			PublicInputs: publicInputs,
			ProofData:    proofData,
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

// SimulateMsgDeactivateCircuit generates a MsgDeactivateCircuit with random values
func SimulateMsgDeactivateCircuit(
	ak types.AccountKeeper,
	bk types.BankKeeper,
	k keeper.Keeper,
) simtypes.Operation {
	return func(r *rand.Rand, app *baseapp.BaseApp, ctx sdk.Context, accs []simtypes.Account, chainID string,
	) (simtypes.OperationMsg, []simtypes.FutureOperation, error) {
		
		// Get all active circuits
		allCircuits := k.GetAllCircuit(ctx)
		activeCircuits := make([]types.Circuit, 0)
		for _, circuit := range allCircuits {
			if circuit.Active {
				activeCircuits = append(activeCircuits, circuit)
			}
		}

		if len(activeCircuits) == 0 {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgDeactivateCircuit, "no active circuits exist"), nil, nil
		}

		// Select random circuit to deactivate
		circuit := activeCircuits[r.Intn(len(activeCircuits))]

		// Find the creator account
		var creatorAccount simtypes.Account
		creatorAddr, err := sdk.AccAddressFromBech32(circuit.Creator)
		if err != nil {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgDeactivateCircuit, "invalid creator address"), nil, nil
		}

		for _, acc := range accs {
			if acc.Address.Equals(creatorAddr) {
				creatorAccount = acc
				break
			}
		}

		if creatorAccount.Address.Empty() {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgDeactivateCircuit, "creator account not found"), nil, nil
		}

		msg := &types.MsgDeactivateCircuit{
			Creator: creatorAccount.Address.String(),
			Id:      circuit.Id,
		}

		account := ak.GetAccount(ctx, creatorAccount.Address)
		spendable := bk.SpendableCoins(ctx, account.GetAddress())

		txCtx := simulation.OperationInput{
			R:               r,
			App:             app,
			TxGen:           moduletestutil.MakeTestEncodingConfig().TxConfig,
			Cdc:             nil,
			Msg:             msg,
			MsgType:         msg.Type(),
			Context:         ctx,
			SimAccount:      creatorAccount,
			AccountKeeper:   ak,
			Bankkeeper:      bk,
			ModuleName:      types.ModuleName,
			CoinsSpentInMsg: spendable,
		}

		return simulation.GenAndDeliverTxWithRandFees(txCtx)
	}
}

// Helper functions for generating random data
func generateRandomCircuitId(r *rand.Rand) string {
	return fmt.Sprintf("circuit:sim%d", r.Intn(1000000))
}

func generateRandomCircuitName(r *rand.Rand) string {
	names := []string{
		"Age Verification",
		"Identity Proof",
		"Credential Verification",
		"Range Proof",
		"Membership Proof",
		"Signature Verification",
		"Hash Preimage",
		"Zero Knowledge Login",
	}
	return names[r.Intn(len(names))]
}

func generateRandomCircuitDescription(r *rand.Rand) string {
	descriptions := []string{
		"Proves age without revealing birth date",
		"Verifies identity without exposing personal data",
		"Validates credentials while preserving privacy",
		"Demonstrates value within range without disclosure",
		"Proves membership in a set without revealing identity",
		"Verifies signature without exposing private key",
		"Proves knowledge of hash preimage",
		"Enables privacy-preserving authentication",
	}
	return descriptions[r.Intn(len(descriptions))]
}

func generateRandomWasmHash(r *rand.Rand) string {
	return fmt.Sprintf("wasm_hash_%x", r.Uint64())
}

func generateRandomVerificationKey(r *rand.Rand) string {
	return fmt.Sprintf("vk_%x", r.Uint64())
}

func generateRandomProofId(r *rand.Rand) string {
	return fmt.Sprintf("proof:sim%d", r.Intn(1000000))
}

func generateRandomPublicInputs(r *rand.Rand) string {
	// Generate random array of numbers as public inputs
	inputs := make([]int, r.Intn(5)+1)
	for i := range inputs {
		inputs[i] = r.Intn(1000)
	}
	return fmt.Sprintf("%v", inputs)
}

func generateRandomProofData(r *rand.Rand) string {
	// Generate random proof data in JSON format
	return fmt.Sprintf(`{
		"pi_a": ["%x", "%x"],
		"pi_b": [["%x", "%x"], ["%x", "%x"]],
		"pi_c": ["%x", "%x"]
	}`, r.Uint64(), r.Uint64(), r.Uint64(), r.Uint64(), r.Uint64(), r.Uint64(), r.Uint64(), r.Uint64())
}