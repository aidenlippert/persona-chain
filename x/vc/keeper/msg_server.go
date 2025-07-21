package keeper

import (
	"context"
	"time"

	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	"github.com/persona-chain/persona-chain/x/vc/types"
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

func (k msgServer) IssueVc(goCtx context.Context, msg *types.MsgIssueVc) (*types.MsgIssueVcResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Check if the VC already exists
	_, isFound := k.GetVcRecord(ctx, msg.Id)
	if isFound {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "VC already exists")
	}

	// Validate that issuer DID exists and is active
	if err := k.ValidateDidExists(ctx, msg.IssuerDid); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Validate that subject DID exists and is active
	if err := k.ValidateDidExists(ctx, msg.SubjectDid); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Validate expiration date
	if msg.ExpiresAt <= time.Now().Unix() {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "expiration date must be in the future")
	}

	var vcRecord = types.VcRecord{
		Id:               msg.Id,
		IssuerDid:        msg.IssuerDid,
		SubjectDid:       msg.SubjectDid,
		CredentialSchema: msg.CredentialSchema,
		CredentialData:   msg.CredentialData,
		Proof:            msg.Proof,
		Revoked:          false,
		IssuedAt:         time.Now().Unix(),
		ExpiresAt:        msg.ExpiresAt,
		RevokedAt:        0,
	}

	k.SetVcRecord(ctx, vcRecord)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.TypeMsgIssueVc,
			sdk.NewAttribute("issuer", msg.Issuer),
			sdk.NewAttribute("id", msg.Id),
			sdk.NewAttribute("issuer_did", msg.IssuerDid),
			sdk.NewAttribute("subject_did", msg.SubjectDid),
		),
	)

	return &types.MsgIssueVcResponse{}, nil
}

func (k msgServer) RevokeVc(goCtx context.Context, msg *types.MsgRevokeVc) (*types.MsgRevokeVcResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Check if the VC exists
	valFound, isFound := k.GetVcRecord(ctx, msg.Id)
	if !isFound {
		return nil, errorsmod.Wrap(sdkerrors.ErrKeyNotFound, "VC does not exist")
	}

	// Validate that the issuer DID still exists and is active
	if err := k.ValidateDidExists(ctx, valFound.IssuerDid); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Check if VC is already revoked
	if valFound.Revoked {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "VC is already revoked")
	}

	// Check if VC has expired
	if valFound.ExpiresAt <= time.Now().Unix() {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "VC has already expired")
	}

	// Update the VC record
	var vcRecord = types.VcRecord{
		Id:               valFound.Id,
		IssuerDid:        valFound.IssuerDid,
		SubjectDid:       valFound.SubjectDid,
		CredentialSchema: valFound.CredentialSchema,
		CredentialData:   valFound.CredentialData,
		Proof:            valFound.Proof,
		Revoked:          true,
		IssuedAt:         valFound.IssuedAt,
		ExpiresAt:        valFound.ExpiresAt,
		RevokedAt:        time.Now().Unix(),
	}

	k.SetVcRecord(ctx, vcRecord)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.TypeMsgRevokeVc,
			sdk.NewAttribute("issuer", msg.Issuer),
			sdk.NewAttribute("id", msg.Id),
		),
	)

	return &types.MsgRevokeVcResponse{}, nil
}