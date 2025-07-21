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

	didtypes "github.com/persona-chain/persona-chain/x/did/types"
	"github.com/persona-chain/persona-chain/x/guardian/keeper"
	"github.com/persona-chain/persona-chain/x/guardian/types"
)

// Simulation operation weights constants
const (
	OpWeightMsgAddGuardian      = "op_weight_msg_add_guardian"
	OpWeightMsgProposeRecovery  = "op_weight_msg_propose_recovery"
	OpWeightMsgApproveRecovery  = "op_weight_msg_approve_recovery"
	OpWeightMsgRejectRecovery   = "op_weight_msg_reject_recovery"
	OpWeightMsgExecuteRecovery  = "op_weight_msg_execute_recovery"
	OpWeightMsgRemoveGuardian   = "op_weight_msg_remove_guardian"

	DefaultWeightMsgAddGuardian      = 40
	DefaultWeightMsgProposeRecovery  = 20
	DefaultWeightMsgApproveRecovery  = 30
	DefaultWeightMsgRejectRecovery   = 15
	DefaultWeightMsgExecuteRecovery  = 10
	DefaultWeightMsgRemoveGuardian   = 10
)

// WeightedOperations returns all the operations from the module with their respective weights
func WeightedOperations(
	appParams simtypes.AppParams,
	cdc codec.JSONCodec,
	k keeper.Keeper,
	ak types.AccountKeeper,
	bk types.BankKeeper,
	didKeeper types.DidKeeper,
) simulation.WeightedOperations {
	var (
		weightMsgAddGuardian      int
		weightMsgProposeRecovery  int
		weightMsgApproveRecovery  int
		weightMsgRejectRecovery   int
		weightMsgExecuteRecovery  int
		weightMsgRemoveGuardian   int
	)

	appParams.GetOrGenerate(cdc, OpWeightMsgAddGuardian, &weightMsgAddGuardian, nil,
		func(_ *rand.Rand) {
			weightMsgAddGuardian = DefaultWeightMsgAddGuardian
		},
	)

	appParams.GetOrGenerate(cdc, OpWeightMsgProposeRecovery, &weightMsgProposeRecovery, nil,
		func(_ *rand.Rand) {
			weightMsgProposeRecovery = DefaultWeightMsgProposeRecovery
		},
	)

	appParams.GetOrGenerate(cdc, OpWeightMsgApproveRecovery, &weightMsgApproveRecovery, nil,
		func(_ *rand.Rand) {
			weightMsgApproveRecovery = DefaultWeightMsgApproveRecovery
		},
	)

	appParams.GetOrGenerate(cdc, OpWeightMsgRejectRecovery, &weightMsgRejectRecovery, nil,
		func(_ *rand.Rand) {
			weightMsgRejectRecovery = DefaultWeightMsgRejectRecovery
		},
	)

	appParams.GetOrGenerate(cdc, OpWeightMsgExecuteRecovery, &weightMsgExecuteRecovery, nil,
		func(_ *rand.Rand) {
			weightMsgExecuteRecovery = DefaultWeightMsgExecuteRecovery
		},
	)

	appParams.GetOrGenerate(cdc, OpWeightMsgRemoveGuardian, &weightMsgRemoveGuardian, nil,
		func(_ *rand.Rand) {
			weightMsgRemoveGuardian = DefaultWeightMsgRemoveGuardian
		},
	)

	return simulation.WeightedOperations{
		simulation.NewWeightedOperation(
			weightMsgAddGuardian,
			SimulateMsgAddGuardian(ak, bk, k, didKeeper),
		),
		simulation.NewWeightedOperation(
			weightMsgProposeRecovery,
			SimulateMsgProposeRecovery(ak, bk, k, didKeeper),
		),
		simulation.NewWeightedOperation(
			weightMsgApproveRecovery,
			SimulateMsgApproveRecovery(ak, bk, k),
		),
		simulation.NewWeightedOperation(
			weightMsgRejectRecovery,
			SimulateMsgRejectRecovery(ak, bk, k),
		),
		simulation.NewWeightedOperation(
			weightMsgExecuteRecovery,
			SimulateMsgExecuteRecovery(ak, bk, k),
		),
		simulation.NewWeightedOperation(
			weightMsgRemoveGuardian,
			SimulateMsgRemoveGuardian(ak, bk, k),
		),
	}
}

// SimulateMsgAddGuardian generates a MsgAddGuardian with random values
func SimulateMsgAddGuardian(
	ak types.AccountKeeper,
	bk types.BankKeeper,
	k keeper.Keeper,
	didKeeper types.DidKeeper,
) simtypes.Operation {
	return func(r *rand.Rand, app *baseapp.BaseApp, ctx sdk.Context, accs []simtypes.Account, chainID string,
	) (simtypes.OperationMsg, []simtypes.FutureOperation, error) {
		
		// Get all active DIDs
		allDids := didKeeper.GetAllDidDocument(ctx)
		activeDids := make([]didtypes.DidDocument, 0)
		for _, did := range allDids {
			if did.Active {
				activeDids = append(activeDids, did)
			}
		}

		if len(activeDids) == 0 {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgAddGuardian, "no active DIDs exist"), nil, nil
		}

		// Select random DID to protect
		didDoc := activeDids[r.Intn(len(activeDids))]

		// Find the DID owner account
		var ownerAccount simtypes.Account
		ownerAddr, err := sdk.AccAddressFromBech32(didDoc.Creator)
		if err != nil {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgAddGuardian, "invalid owner address"), nil, nil
		}

		for _, acc := range accs {
			if acc.Address.Equals(ownerAddr) {
				ownerAccount = acc
				break
			}
		}

		if ownerAccount.Address.Empty() {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgAddGuardian, "owner account not found"), nil, nil
		}

		// Select random guardian account (different from owner)
		var guardianAccount simtypes.Account
		for i := 0; i < 10; i++ { // Try up to 10 times to find a different account
			guardianAccount, _ = simtypes.RandomAcc(r, accs)
			if !guardianAccount.Address.Equals(ownerAccount.Address) {
				break
			}
		}

		if guardianAccount.Address.Equals(ownerAccount.Address) {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgAddGuardian, "guardian same as owner"), nil, nil
		}

		// Check if guardian already exists
		if k.IsGuardian(ctx, didDoc.Id, guardianAccount.Address.String()) {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgAddGuardian, "guardian already exists"), nil, nil
		}

		msg := &types.MsgAddGuardian{
			Creator:         ownerAccount.Address.String(),
			DidId:           didDoc.Id,
			GuardianAddress: guardianAccount.Address.String(),
			PublicKey:       generateRandomGuardianKey(r),
		}

		account := ak.GetAccount(ctx, ownerAccount.Address)
		spendable := bk.SpendableCoins(ctx, account.GetAddress())

		txCtx := simulation.OperationInput{
			R:               r,
			App:             app,
			TxGen:           moduletestutil.MakeTestEncodingConfig().TxConfig,
			Cdc:             nil,
			Msg:             msg,
			MsgType:         msg.Type(),
			Context:         ctx,
			SimAccount:      ownerAccount,
			AccountKeeper:   ak,
			Bankkeeper:      bk,
			ModuleName:      types.ModuleName,
			CoinsSpentInMsg: spendable,
		}

		return simulation.GenAndDeliverTxWithRandFees(txCtx)
	}
}

// SimulateMsgProposeRecovery generates a MsgProposeRecovery with random values
func SimulateMsgProposeRecovery(
	ak types.AccountKeeper,
	bk types.BankKeeper,
	k keeper.Keeper,
	didKeeper types.DidKeeper,
) simtypes.Operation {
	return func(r *rand.Rand, app *baseapp.BaseApp, ctx sdk.Context, accs []simtypes.Account, chainID string,
	) (simtypes.OperationMsg, []simtypes.FutureOperation, error) {
		
		// Get all DIDs with guardians
		allDids := didKeeper.GetAllDidDocument(ctx)
		didsWithGuardians := make([]didtypes.DidDocument, 0)
		for _, did := range allDids {
			if did.Active && len(k.GetGuardiansByDid(ctx, did.Id)) > 0 {
				didsWithGuardians = append(didsWithGuardians, did)
			}
		}

		if len(didsWithGuardians) == 0 {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgProposeRecovery, "no DIDs with guardians exist"), nil, nil
		}

		// Select random DID
		didDoc := didsWithGuardians[r.Intn(len(didsWithGuardians))]
		guardians := k.GetGuardiansByDid(ctx, didDoc.Id)

		// Select random guardian
		guardian := guardians[r.Intn(len(guardians))]

		// Find the guardian account
		var guardianAccount simtypes.Account
		guardianAddr, err := sdk.AccAddressFromBech32(guardian.GuardianAddress)
		if err != nil {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgProposeRecovery, "invalid guardian address"), nil, nil
		}

		for _, acc := range accs {
			if acc.Address.Equals(guardianAddr) {
				guardianAccount = acc
				break
			}
		}

		if guardianAccount.Address.Empty() {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgProposeRecovery, "guardian account not found"), nil, nil
		}

		// Generate random new controller
		newControllerAccount, _ := simtypes.RandomAcc(r, accs)

		proposalId := generateRandomProposalId(r)

		msg := &types.MsgProposeRecovery{
			Creator:       guardianAccount.Address.String(),
			Id:            proposalId,
			DidId:         didDoc.Id,
			NewController: newControllerAccount.Address.String(),
			Reason:        generateRandomRecoveryReason(r),
		}

		account := ak.GetAccount(ctx, guardianAccount.Address)
		spendable := bk.SpendableCoins(ctx, account.GetAddress())

		txCtx := simulation.OperationInput{
			R:               r,
			App:             app,
			TxGen:           moduletestutil.MakeTestEncodingConfig().TxConfig,
			Cdc:             nil,
			Msg:             msg,
			MsgType:         msg.Type(),
			Context:         ctx,
			SimAccount:      guardianAccount,
			AccountKeeper:   ak,
			Bankkeeper:      bk,
			ModuleName:      types.ModuleName,
			CoinsSpentInMsg: spendable,
		}

		return simulation.GenAndDeliverTxWithRandFees(txCtx)
	}
}

// SimulateMsgApproveRecovery generates a MsgApproveRecovery with random values
func SimulateMsgApproveRecovery(
	ak types.AccountKeeper,
	bk types.BankKeeper,
	k keeper.Keeper,
) simtypes.Operation {
	return func(r *rand.Rand, app *baseapp.BaseApp, ctx sdk.Context, accs []simtypes.Account, chainID string,
	) (simtypes.OperationMsg, []simtypes.FutureOperation, error) {
		
		// Get all pending recovery proposals
		allProposals := k.GetAllRecoveryProposal(ctx)
		pendingProposals := make([]types.RecoveryProposal, 0)
		for _, proposal := range allProposals {
			if proposal.Status == "pending" && proposal.ExpiresAt > time.Now().Unix() {
				pendingProposals = append(pendingProposals, proposal)
			}
		}

		if len(pendingProposals) == 0 {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgApproveRecovery, "no pending proposals exist"), nil, nil
		}

		// Select random proposal
		proposal := pendingProposals[r.Intn(len(pendingProposals))]

		// Get guardians for this DID
		guardians := k.GetGuardiansByDid(ctx, proposal.DidId)
		if len(guardians) == 0 {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgApproveRecovery, "no guardians for DID"), nil, nil
		}

		// Find a guardian who hasn't voted yet
		var guardianAccount simtypes.Account
		for _, guardian := range guardians {
			if !k.HasApproved(proposal, guardian.GuardianAddress) && !k.HasRejected(proposal, guardian.GuardianAddress) {
				guardianAddr, err := sdk.AccAddressFromBech32(guardian.GuardianAddress)
				if err != nil {
					continue
				}

				for _, acc := range accs {
					if acc.Address.Equals(guardianAddr) {
						guardianAccount = acc
						break
					}
				}
				if !guardianAccount.Address.Empty() {
					break
				}
			}
		}

		if guardianAccount.Address.Empty() {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgApproveRecovery, "no eligible guardian found"), nil, nil
		}

		msg := &types.MsgApproveRecovery{
			Creator:    guardianAccount.Address.String(),
			ProposalId: proposal.Id,
		}

		account := ak.GetAccount(ctx, guardianAccount.Address)
		spendable := bk.SpendableCoins(ctx, account.GetAddress())

		txCtx := simulation.OperationInput{
			R:               r,
			App:             app,
			TxGen:           moduletestutil.MakeTestEncodingConfig().TxConfig,
			Cdc:             nil,
			Msg:             msg,
			MsgType:         msg.Type(),
			Context:         ctx,
			SimAccount:      guardianAccount,
			AccountKeeper:   ak,
			Bankkeeper:      bk,
			ModuleName:      types.ModuleName,
			CoinsSpentInMsg: spendable,
		}

		return simulation.GenAndDeliverTxWithRandFees(txCtx)
	}
}

// SimulateMsgRejectRecovery generates a MsgRejectRecovery with random values
func SimulateMsgRejectRecovery(
	ak types.AccountKeeper,
	bk types.BankKeeper,
	k keeper.Keeper,
) simtypes.Operation {
	return func(r *rand.Rand, app *baseapp.BaseApp, ctx sdk.Context, accs []simtypes.Account, chainID string,
	) (simtypes.OperationMsg, []simtypes.FutureOperation, error) {
		
		// Get all pending recovery proposals
		allProposals := k.GetAllRecoveryProposal(ctx)
		pendingProposals := make([]types.RecoveryProposal, 0)
		for _, proposal := range allProposals {
			if proposal.Status == "pending" && proposal.ExpiresAt > time.Now().Unix() {
				pendingProposals = append(pendingProposals, proposal)
			}
		}

		if len(pendingProposals) == 0 {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgRejectRecovery, "no pending proposals exist"), nil, nil
		}

		// Select random proposal
		proposal := pendingProposals[r.Intn(len(pendingProposals))]

		// Get guardians for this DID
		guardians := k.GetGuardiansByDid(ctx, proposal.DidId)
		if len(guardians) == 0 {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgRejectRecovery, "no guardians for DID"), nil, nil
		}

		// Find a guardian who hasn't voted yet
		var guardianAccount simtypes.Account
		for _, guardian := range guardians {
			if !k.HasApproved(proposal, guardian.GuardianAddress) && !k.HasRejected(proposal, guardian.GuardianAddress) {
				guardianAddr, err := sdk.AccAddressFromBech32(guardian.GuardianAddress)
				if err != nil {
					continue
				}

				for _, acc := range accs {
					if acc.Address.Equals(guardianAddr) {
						guardianAccount = acc
						break
					}
				}
				if !guardianAccount.Address.Empty() {
					break
				}
			}
		}

		if guardianAccount.Address.Empty() {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgRejectRecovery, "no eligible guardian found"), nil, nil
		}

		msg := &types.MsgRejectRecovery{
			Creator:    guardianAccount.Address.String(),
			ProposalId: proposal.Id,
			Reason:     generateRandomRejectionReason(r),
		}

		account := ak.GetAccount(ctx, guardianAccount.Address)
		spendable := bk.SpendableCoins(ctx, account.GetAddress())

		txCtx := simulation.OperationInput{
			R:               r,
			App:             app,
			TxGen:           moduletestutil.MakeTestEncodingConfig().TxConfig,
			Cdc:             nil,
			Msg:             msg,
			MsgType:         msg.Type(),
			Context:         ctx,
			SimAccount:      guardianAccount,
			AccountKeeper:   ak,
			Bankkeeper:      bk,
			ModuleName:      types.ModuleName,
			CoinsSpentInMsg: spendable,
		}

		return simulation.GenAndDeliverTxWithRandFees(txCtx)
	}
}

// SimulateMsgExecuteRecovery generates a MsgExecuteRecovery with random values
func SimulateMsgExecuteRecovery(
	ak types.AccountKeeper,
	bk types.BankKeeper,
	k keeper.Keeper,
) simtypes.Operation {
	return func(r *rand.Rand, app *baseapp.BaseApp, ctx sdk.Context, accs []simtypes.Account, chainID string,
	) (simtypes.OperationMsg, []simtypes.FutureOperation, error) {
		
		// Get all approved recovery proposals
		allProposals := k.GetAllRecoveryProposal(ctx)
		approvedProposals := make([]types.RecoveryProposal, 0)
		for _, proposal := range allProposals {
			if proposal.Status == "approved" && proposal.ExecutedAt == 0 {
				approvedProposals = append(approvedProposals, proposal)
			}
		}

		if len(approvedProposals) == 0 {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgExecuteRecovery, "no approved proposals exist"), nil, nil
		}

		// Select random approved proposal
		proposal := approvedProposals[r.Intn(len(approvedProposals))]

		// Any guardian can execute an approved proposal
		guardians := k.GetGuardiansByDid(ctx, proposal.DidId)
		if len(guardians) == 0 {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgExecuteRecovery, "no guardians for DID"), nil, nil
		}

		guardian := guardians[r.Intn(len(guardians))]
		var guardianAccount simtypes.Account
		guardianAddr, err := sdk.AccAddressFromBech32(guardian.GuardianAddress)
		if err != nil {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgExecuteRecovery, "invalid guardian address"), nil, nil
		}

		for _, acc := range accs {
			if acc.Address.Equals(guardianAddr) {
				guardianAccount = acc
				break
			}
		}

		if guardianAccount.Address.Empty() {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgExecuteRecovery, "guardian account not found"), nil, nil
		}

		msg := &types.MsgExecuteRecovery{
			Creator:    guardianAccount.Address.String(),
			ProposalId: proposal.Id,
		}

		account := ak.GetAccount(ctx, guardianAccount.Address)
		spendable := bk.SpendableCoins(ctx, account.GetAddress())

		txCtx := simulation.OperationInput{
			R:               r,
			App:             app,
			TxGen:           moduletestutil.MakeTestEncodingConfig().TxConfig,
			Cdc:             nil,
			Msg:             msg,
			MsgType:         msg.Type(),
			Context:         ctx,
			SimAccount:      guardianAccount,
			AccountKeeper:   ak,
			Bankkeeper:      bk,
			ModuleName:      types.ModuleName,
			CoinsSpentInMsg: spendable,
		}

		return simulation.GenAndDeliverTxWithRandFees(txCtx)
	}
}

// SimulateMsgRemoveGuardian generates a MsgRemoveGuardian with random values
func SimulateMsgRemoveGuardian(
	ak types.AccountKeeper,
	bk types.BankKeeper,
	k keeper.Keeper,
) simtypes.Operation {
	return func(r *rand.Rand, app *baseapp.BaseApp, ctx sdk.Context, accs []simtypes.Account, chainID string,
	) (simtypes.OperationMsg, []simtypes.FutureOperation, error) {
		
		// Get all guardians
		allGuardians := k.GetAllGuardian(ctx)
		activeGuardians := make([]types.Guardian, 0)
		for _, guardian := range allGuardians {
			if guardian.Active {
				activeGuardians = append(activeGuardians, guardian)
			}
		}

		if len(activeGuardians) == 0 {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgRemoveGuardian, "no active guardians exist"), nil, nil
		}

		// Select random guardian to remove
		guardian := activeGuardians[r.Intn(len(activeGuardians))]

		// Only the DID owner can remove guardians - we need to find the DID owner
		// For simulation, we'll just use a random account that might be the owner
		simAccount, _ := simtypes.RandomAcc(r, accs)

		msg := &types.MsgRemoveGuardian{
			Creator:         simAccount.Address.String(),
			DidId:           guardian.DidId,
			GuardianAddress: guardian.GuardianAddress,
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
func generateRandomGuardianKey(r *rand.Rand) string {
	const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
	key := make([]byte, 44)
	for i := range key {
		key[i] = chars[r.Intn(len(chars))]
	}
	return string(key)
}

func generateRandomProposalId(r *rand.Rand) string {
	return fmt.Sprintf("proposal:sim%d", r.Intn(1000000))
}

func generateRandomRecoveryReason(r *rand.Rand) string {
	reasons := []string{
		"Lost private key",
		"Account compromise",
		"Device theft",
		"Security breach",
		"Key rotation",
		"Emergency access",
	}
	return reasons[r.Intn(len(reasons))]
}

func generateRandomRejectionReason(r *rand.Rand) string {
	reasons := []string{
		"Insufficient evidence",
		"Security concerns",
		"Invalid request",
		"Fraudulent attempt",
		"Procedural violation",
	}
	return reasons[r.Intn(len(reasons))]
}