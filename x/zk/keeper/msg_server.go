package keeper

import (
	"context"
	"time"

	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	"github.com/persona-chain/persona-chain/x/zk/types"
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

func (k msgServer) SubmitProof(goCtx context.Context, msg *types.MsgSubmitProof) (*types.MsgSubmitProofResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Check if the proof already exists
	_, isFound := k.GetZkProof(ctx, msg.Id)
	if isFound {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "proof already exists")
	}

	// Validate that circuit exists and is active
	circuit, found := k.GetCircuit(ctx, msg.CircuitId)
	if !found {
		return nil, errorsmod.Wrap(sdkerrors.ErrKeyNotFound, "circuit does not exist")
	}

	if !circuit.Active {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "circuit is deactivated")
	}

	// Verify the proof using WASM
	verified, err := k.VerifyProofWithWasm(ctx, msg.CircuitId, msg.PublicInputs, msg.ProofData)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	var zkProof = types.ZkProof{
		Id:               msg.Id,
		Submitter:        msg.Submitter,
		CircuitId:        msg.CircuitId,
		PublicInputs:     msg.PublicInputs,
		ProofData:        msg.ProofData,
		VerificationKey:  circuit.VerificationKey,
		Verified:         verified,
		SubmittedAt:      time.Now().Unix(),
		VerifiedAt:       0,
		VerifierContract: circuit.WasmCodeHash,
	}

	if verified {
		zkProof.VerifiedAt = time.Now().Unix()
	}

	k.SetZkProof(ctx, zkProof)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.TypeMsgSubmitProof,
			sdk.NewAttribute("submitter", msg.Submitter),
			sdk.NewAttribute("id", msg.Id),
			sdk.NewAttribute("circuit_id", msg.CircuitId),
			sdk.NewAttribute("verified", fmt.Sprintf("%t", verified)),
		),
	)

	return &types.MsgSubmitProofResponse{
		Verified: verified,
	}, nil
}

func (k msgServer) RegisterCircuit(goCtx context.Context, msg *types.MsgRegisterCircuit) (*types.MsgRegisterCircuitResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Check if the circuit already exists
	_, isFound := k.GetCircuit(ctx, msg.Id)
	if isFound {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "circuit already exists")
	}

	// Generate code hash from WASM bytecode
	codeHash, err := k.GenerateCodeHash(msg.WasmCode)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	var circuit = types.Circuit{
		Id:              msg.Id,
		Name:            msg.Name,
		Description:     msg.Description,
		WasmCodeHash:    codeHash,
		VerificationKey: msg.VerificationKey,
		Creator:         msg.Creator,
		Active:          true,
		CreatedAt:       time.Now().Unix(),
	}

	k.SetCircuit(ctx, circuit)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.TypeMsgRegisterCircuit,
			sdk.NewAttribute("creator", msg.Creator),
			sdk.NewAttribute("id", msg.Id),
			sdk.NewAttribute("name", msg.Name),
			sdk.NewAttribute("code_hash", codeHash),
		),
	)

	return &types.MsgRegisterCircuitResponse{
		CodeHash: codeHash,
	}, nil
}

func (k msgServer) DeactivateCircuit(goCtx context.Context, msg *types.MsgDeactivateCircuit) (*types.MsgDeactivateCircuitResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Check if the circuit exists
	valFound, isFound := k.GetCircuit(ctx, msg.Id)
	if !isFound {
		return nil, errorsmod.Wrap(sdkerrors.ErrKeyNotFound, "circuit does not exist")
	}

	// Checks if the the msg creator is the same as the current owner
	if msg.Creator != valFound.Creator {
		return nil, errorsmod.Wrap(sdkerrors.ErrUnauthorized, "incorrect owner")
	}

	// Check if circuit is already inactive
	if !valFound.Active {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "circuit is already deactivated")
	}

	var circuit = types.Circuit{
		Id:              valFound.Id,
		Name:            valFound.Name,
		Description:     valFound.Description,
		WasmCodeHash:    valFound.WasmCodeHash,
		VerificationKey: valFound.VerificationKey,
		Creator:         valFound.Creator,
		Active:          false,
		CreatedAt:       valFound.CreatedAt,
	}

	k.SetCircuit(ctx, circuit)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.TypeMsgDeactivateCircuit,
			sdk.NewAttribute("creator", msg.Creator),
			sdk.NewAttribute("id", msg.Id),
		),
	)

	return &types.MsgDeactivateCircuitResponse{}, nil
}