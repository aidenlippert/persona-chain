package simulation

import (
	"encoding/json"
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
	"github.com/persona-chain/persona-chain/x/vc/keeper"
	"github.com/persona-chain/persona-chain/x/vc/types"
)

// Simulation operation weights constants
const (
	OpWeightMsgIssueVc  = "op_weight_msg_issue_vc"
	OpWeightMsgRevokeVc = "op_weight_msg_revoke_vc"

	DefaultWeightMsgIssueVc  = 80
	DefaultWeightMsgRevokeVc = 20
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
		weightMsgIssueVc  int
		weightMsgRevokeVc int
	)

	appParams.GetOrGenerate(cdc, OpWeightMsgIssueVc, &weightMsgIssueVc, nil,
		func(_ *rand.Rand) {
			weightMsgIssueVc = DefaultWeightMsgIssueVc
		},
	)

	appParams.GetOrGenerate(cdc, OpWeightMsgRevokeVc, &weightMsgRevokeVc, nil,
		func(_ *rand.Rand) {
			weightMsgRevokeVc = DefaultWeightMsgRevokeVc
		},
	)

	return simulation.WeightedOperations{
		simulation.NewWeightedOperation(
			weightMsgIssueVc,
			SimulateMsgIssueVc(ak, bk, k, didKeeper),
		),
		simulation.NewWeightedOperation(
			weightMsgRevokeVc,
			SimulateMsgRevokeVc(ak, bk, k),
		),
	}
}

// SimulateMsgIssueVc generates a MsgIssueVc with random values
func SimulateMsgIssueVc(
	ak types.AccountKeeper,
	bk types.BankKeeper,
	k keeper.Keeper,
	didKeeper types.DidKeeper,
) simtypes.Operation {
	return func(r *rand.Rand, app *baseapp.BaseApp, ctx sdk.Context, accs []simtypes.Account, chainID string,
	) (simtypes.OperationMsg, []simtypes.FutureOperation, error) {
		
		// Get all active DIDs to use as issuers and subjects
		allDids := didKeeper.GetAllDidDocument(ctx)
		activeDids := make([]didtypes.DidDocument, 0)
		for _, did := range allDids {
			if did.Active {
				activeDids = append(activeDids, did)
			}
		}

		if len(activeDids) < 2 {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgIssueVc, "insufficient active DIDs"), nil, nil
		}

		// Select random issuer and subject DIDs
		issuerDid := activeDids[r.Intn(len(activeDids))]
		subjectDid := activeDids[r.Intn(len(activeDids))]

		// Find the issuer account
		var issuerAccount simtypes.Account
		issuerAddr, err := sdk.AccAddressFromBech32(issuerDid.Creator)
		if err != nil {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgIssueVc, "invalid issuer address"), nil, nil
		}

		for _, acc := range accs {
			if acc.Address.Equals(issuerAddr) {
				issuerAccount = acc
				break
			}
		}

		if issuerAccount.Address.Empty() {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgIssueVc, "issuer account not found"), nil, nil
		}

		// Generate random VC data
		vcId := generateRandomVcId(r)
		credentialData := generateRandomCredentialData(r)
		credentialDataBytes, _ := json.Marshal(credentialData)

		msg := &types.MsgIssueVc{
			Creator:          issuerAccount.Address.String(),
			Id:               vcId,
			IssuerDid:        issuerDid.Id,
			SubjectDid:       subjectDid.Id,
			CredentialSchema: generateRandomSchema(r),
			CredentialData:   string(credentialDataBytes),
			Proof:            generateRandomProof(r),
			ExpiresAt:        time.Now().Add(time.Duration(r.Intn(365*24)) * time.Hour).Unix(),
		}

		account := ak.GetAccount(ctx, issuerAccount.Address)
		spendable := bk.SpendableCoins(ctx, account.GetAddress())

		txCtx := simulation.OperationInput{
			R:               r,
			App:             app,
			TxGen:           moduletestutil.MakeTestEncodingConfig().TxConfig,
			Cdc:             nil,
			Msg:             msg,
			MsgType:         msg.Type(),
			Context:         ctx,
			SimAccount:      issuerAccount,
			AccountKeeper:   ak,
			Bankkeeper:      bk,
			ModuleName:      types.ModuleName,
			CoinsSpentInMsg: spendable,
		}

		return simulation.GenAndDeliverTxWithRandFees(txCtx)
	}
}

// SimulateMsgRevokeVc generates a MsgRevokeVc with random values
func SimulateMsgRevokeVc(
	ak types.AccountKeeper,
	bk types.BankKeeper,
	k keeper.Keeper,
) simtypes.Operation {
	return func(r *rand.Rand, app *baseapp.BaseApp, ctx sdk.Context, accs []simtypes.Account, chainID string,
	) (simtypes.OperationMsg, []simtypes.FutureOperation, error) {
		
		// Get all active VCs
		allVcs := k.GetAllVcRecord(ctx)
		activeVcs := make([]types.VcRecord, 0)
		for _, vc := range allVcs {
			if !vc.Revoked && vc.ExpiresAt > time.Now().Unix() {
				activeVcs = append(activeVcs, vc)
			}
		}

		if len(activeVcs) == 0 {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgRevokeVc, "no active VCs exist"), nil, nil
		}

		// Select random VC to revoke
		vcRecord := activeVcs[r.Intn(len(activeVcs))]

		// Find the issuer account
		var issuerAccount simtypes.Account
		issuerAddr, err := sdk.AccAddressFromBech32(vcRecord.Creator)
		if err != nil {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgRevokeVc, "invalid issuer address"), nil, nil
		}

		for _, acc := range accs {
			if acc.Address.Equals(issuerAddr) {
				issuerAccount = acc
				break
			}
		}

		if issuerAccount.Address.Empty() {
			return simtypes.NoOpMsg(types.ModuleName, types.TypeMsgRevokeVc, "issuer account not found"), nil, nil
		}

		msg := &types.MsgRevokeVc{
			Creator: issuerAccount.Address.String(),
			Id:      vcRecord.Id,
			Reason:  generateRandomRevocationReason(r),
		}

		account := ak.GetAccount(ctx, issuerAccount.Address)
		spendable := bk.SpendableCoins(ctx, account.GetAddress())

		txCtx := simulation.OperationInput{
			R:               r,
			App:             app,
			TxGen:           moduletestutil.MakeTestEncodingConfig().TxConfig,
			Cdc:             nil,
			Msg:             msg,
			MsgType:         msg.Type(),
			Context:         ctx,
			SimAccount:      issuerAccount,
			AccountKeeper:   ak,
			Bankkeeper:      bk,
			ModuleName:      types.ModuleName,
			CoinsSpentInMsg: spendable,
		}

		return simulation.GenAndDeliverTxWithRandFees(txCtx)
	}
}

// Helper functions for generating random data
func generateRandomVcId(r *rand.Rand) string {
	return fmt.Sprintf("vc:sim%d", r.Intn(1000000))
}

func generateRandomCredentialData(r *rand.Rand) map[string]interface{} {
	schemas := []map[string]interface{}{
		{
			"name":        generateRandomName(r),
			"dateOfBirth": generateRandomDate(r),
			"age":         r.Intn(80) + 18,
		},
		{
			"degree":      generateRandomDegree(r),
			"university":  generateRandomUniversity(r),
			"graduationYear": r.Intn(30) + 1990,
		},
		{
			"licenseNumber": fmt.Sprintf("LIC%d", r.Intn(100000)),
			"licenseType":   generateRandomLicenseType(r),
			"issueDate":     generateRandomDate(r),
		},
	}
	return schemas[r.Intn(len(schemas))]
}

func generateRandomSchema(r *rand.Rand) string {
	schemas := []string{
		"https://schema.org/Person",
		"https://schema.org/EducationalOccupationalCredential",
		"https://schema.org/DriversLicense",
		"https://schema.org/Permit",
	}
	return schemas[r.Intn(len(schemas))]
}

func generateRandomProof(r *rand.Rand) string {
	return fmt.Sprintf(`{"type": "Ed25519Signature2020", "proofValue": "%s"}`, generateRandomKey(r))
}

func generateRandomRevocationReason(r *rand.Rand) string {
	reasons := []string{
		"Credential expired",
		"Information changed",
		"Security breach",
		"Request by subject",
		"Administrative update",
	}
	return reasons[r.Intn(len(reasons))]
}

func generateRandomName(r *rand.Rand) string {
	firstNames := []string{"John", "Jane", "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"}
	lastNames := []string{"Doe", "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller"}
	return fmt.Sprintf("%s %s", firstNames[r.Intn(len(firstNames))], lastNames[r.Intn(len(lastNames))])
}

func generateRandomDate(r *rand.Rand) string {
	year := r.Intn(50) + 1970
	month := r.Intn(12) + 1
	day := r.Intn(28) + 1
	return fmt.Sprintf("%d-%02d-%02d", year, month, day)
}

func generateRandomDegree(r *rand.Rand) string {
	degrees := []string{"Bachelor of Science", "Bachelor of Arts", "Master of Science", "Master of Arts", "PhD"}
	return degrees[r.Intn(len(degrees))]
}

func generateRandomUniversity(r *rand.Rand) string {
	universities := []string{"MIT", "Stanford", "Harvard", "Berkeley", "Princeton", "Yale", "Columbia", "Cornell"}
	return universities[r.Intn(len(universities))]
}

func generateRandomLicenseType(r *rand.Rand) string {
	types := []string{"Driver's License", "Professional License", "Business License", "Medical License"}
	return types[r.Intn(len(types))]
}

func generateRandomKey(r *rand.Rand) string {
	const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
	key := make([]byte, 44) // Base58 encoded 32-byte key
	for i := range key {
		key[i] = chars[r.Intn(len(chars))]
	}
	return string(key)
}