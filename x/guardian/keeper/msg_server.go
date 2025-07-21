package keeper

import (
	"context"
	"time"

	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	"github.com/persona-chain/persona-chain/x/guardian/types"
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

func (k msgServer) AddGuardian(goCtx context.Context, msg *types.MsgAddGuardian) (*types.MsgAddGuardianResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate that DID exists and is active
	if err := k.ValidateDidExists(ctx, msg.DidId); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Check if guardian already exists
	_, isFound := k.GetGuardian(ctx, msg.DidId, msg.GuardianAddress)
	if isFound {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "guardian already exists")
	}

	// Check max guardians limit
	existingGuardians := k.GetGuardiansByDid(ctx, msg.DidId)
	maxGuardians := k.GetMaxGuardians(ctx)
	if uint32(len(existingGuardians)) >= maxGuardians {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "maximum number of guardians reached")
	}

	// Validate guardian address
	_, err := sdk.AccAddressFromBech32(msg.GuardianAddress)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidAddress, "invalid guardian address")
	}

	var guardian = types.Guardian{
		DidId:           msg.DidId,
		GuardianAddress: msg.GuardianAddress,
		PublicKey:       msg.PublicKey,
		Active:          true,
		AddedAt:         time.Now().Unix(),
	}

	k.SetGuardian(ctx, guardian)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.TypeMsgAddGuardian,
			sdk.NewAttribute("controller", msg.Controller),
			sdk.NewAttribute("did_id", msg.DidId),
			sdk.NewAttribute("guardian_address", msg.GuardianAddress),
		),
	)

	return &types.MsgAddGuardianResponse{}, nil
}

func (k msgServer) RemoveGuardian(goCtx context.Context, msg *types.MsgRemoveGuardian) (*types.MsgRemoveGuardianResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Validate that DID exists and is active
	if err := k.ValidateDidExists(ctx, msg.DidId); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Check if guardian exists
	guardian, isFound := k.GetGuardian(ctx, msg.DidId, msg.GuardianAddress)
	if !isFound {
		return nil, errorsmod.Wrap(sdkerrors.ErrKeyNotFound, "guardian does not exist")
	}

	if !guardian.Active {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "guardian is already inactive")
	}

	// Deactivate guardian instead of removing to maintain history
	guardian.Active = false
	k.SetGuardian(ctx, guardian)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.TypeMsgRemoveGuardian,
			sdk.NewAttribute("controller", msg.Controller),
			sdk.NewAttribute("did_id", msg.DidId),
			sdk.NewAttribute("guardian_address", msg.GuardianAddress),
		),
	)

	return &types.MsgRemoveGuardianResponse{}, nil
}

func (k msgServer) ProposeRecovery(goCtx context.Context, msg *types.MsgProposeRecovery) (*types.MsgProposeRecoveryResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Check if proposal already exists
	_, isFound := k.GetRecoveryProposal(ctx, msg.Id)
	if isFound {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "proposal already exists")
	}

	// Validate that DID exists and is active
	if err := k.ValidateDidExists(ctx, msg.DidId); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Check if proposer is a guardian
	if !k.IsGuardian(ctx, msg.DidId, msg.Proposer) {
		return nil, errorsmod.Wrap(sdkerrors.ErrUnauthorized, "proposer is not a guardian")
	}

	// Validate new controller address
	_, err := sdk.AccAddressFromBech32(msg.NewController)
	if err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidAddress, "invalid new controller address")
	}

	// Validate expiration time
	if msg.ExpiresAt <= time.Now().Unix() {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "expiration time must be in the future")
	}

	var proposal = types.RecoveryProposal{
		Id:            msg.Id,
		DidId:         msg.DidId,
		Proposer:      msg.Proposer,
		NewController: msg.NewController,
		Reason:        msg.Reason,
		Approvals:     []string{},
		Rejections:    []string{},
		Status:        "pending",
		CreatedAt:     time.Now().Unix(),
		ExpiresAt:     msg.ExpiresAt,
		ExecutedAt:    0,
	}

	k.SetRecoveryProposal(ctx, proposal)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.TypeMsgProposeRecovery,
			sdk.NewAttribute("proposer", msg.Proposer),
			sdk.NewAttribute("id", msg.Id),
			sdk.NewAttribute("did_id", msg.DidId),
			sdk.NewAttribute("new_controller", msg.NewController),
		),
	)

	return &types.MsgProposeRecoveryResponse{}, nil
}

func (k msgServer) ApproveRecovery(goCtx context.Context, msg *types.MsgApproveRecovery) (*types.MsgApproveRecoveryResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Get proposal
	proposal, isFound := k.GetRecoveryProposal(ctx, msg.ProposalId)
	if !isFound {
		return nil, errorsmod.Wrap(sdkerrors.ErrKeyNotFound, "proposal does not exist")
	}

	// Check if proposal is still pending
	if proposal.Status != "pending" {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "proposal is not pending")
	}

	// Check if proposal has expired
	if proposal.ExpiresAt <= time.Now().Unix() {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "proposal has expired")
	}

	// Check if guardian is authorized
	if !k.IsGuardian(ctx, proposal.DidId, msg.Guardian) {
		return nil, errorsmod.Wrap(sdkerrors.ErrUnauthorized, "not a guardian for this DID")
	}

	// Check if guardian has already voted
	if k.HasApproved(proposal, msg.Guardian) || k.HasRejected(proposal, msg.Guardian) {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "guardian has already voted")
	}

	// Update proposal with approval/rejection
	if msg.Approve {
		proposal.Approvals = append(proposal.Approvals, msg.Guardian)
	} else {
		proposal.Rejections = append(proposal.Rejections, msg.Guardian)
	}

	// Check if threshold reached for approval
	if k.CheckThresholdReached(ctx, proposal) {
		proposal.Status = "approved"
	}

	// Check if majority rejected (optional logic)
	guardians := k.GetGuardiansByDid(ctx, proposal.DidId)
	if uint32(len(proposal.Rejections)) > uint32(len(guardians))/2 {
		proposal.Status = "rejected"
	}

	k.SetRecoveryProposal(ctx, proposal)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.TypeMsgApproveRecovery,
			sdk.NewAttribute("guardian", msg.Guardian),
			sdk.NewAttribute("proposal_id", msg.ProposalId),
			sdk.NewAttribute("approve", fmt.Sprintf("%t", msg.Approve)),
			sdk.NewAttribute("status", proposal.Status),
		),
	)

	return &types.MsgApproveRecoveryResponse{}, nil
}

func (k msgServer) ExecuteRecovery(goCtx context.Context, msg *types.MsgExecuteRecovery) (*types.MsgExecuteRecoveryResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Get proposal
	proposal, isFound := k.GetRecoveryProposal(ctx, msg.ProposalId)
	if !isFound {
		return nil, errorsmod.Wrap(sdkerrors.ErrKeyNotFound, "proposal does not exist")
	}

	// Check if proposal is approved
	if proposal.Status != "approved" {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "proposal is not approved")
	}

	// Check if proposal has expired
	if proposal.ExpiresAt <= time.Now().Unix() {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "proposal has expired")
	}

	// Execute the DID recovery
	if err := k.ExecuteDidRecovery(ctx, proposal.DidId, proposal.NewController); err != nil {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, err.Error())
	}

	// Update proposal status
	proposal.Status = "executed"
	proposal.ExecutedAt = time.Now().Unix()
	k.SetRecoveryProposal(ctx, proposal)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.TypeMsgExecuteRecovery,
			sdk.NewAttribute("executor", msg.Executor),
			sdk.NewAttribute("proposal_id", msg.ProposalId),
			sdk.NewAttribute("did_id", proposal.DidId),
			sdk.NewAttribute("new_controller", proposal.NewController),
		),
	)

	return &types.MsgExecuteRecoveryResponse{}, nil
}

func (k msgServer) SubmitSignatureShare(goCtx context.Context, msg *types.MsgSubmitSignatureShare) (*types.MsgSubmitSignatureShareResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	// Get proposal
	proposal, isFound := k.GetRecoveryProposal(ctx, msg.ProposalId)
	if !isFound {
		return nil, errorsmod.Wrap(sdkerrors.ErrKeyNotFound, "proposal does not exist")
	}

	// Check if signer is a guardian
	if !k.IsGuardian(ctx, proposal.DidId, msg.Signer) {
		return nil, errorsmod.Wrap(sdkerrors.ErrUnauthorized, "signer is not a guardian")
	}

	// Check if signature share already exists
	_, isFound = k.GetThresholdSignature(ctx, msg.ProposalId, msg.Signer)
	if isFound {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "signature share already submitted")
	}

	var signature = types.ThresholdSignature{
		ProposalId:      msg.ProposalId,
		Signer:          msg.Signer,
		SignatureShare:  msg.SignatureShare,
		PublicKeyShare:  msg.PublicKeyShare,
		SignedAt:        time.Now().Unix(),
	}

	k.SetThresholdSignature(ctx, signature)

	// Emit event
	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.TypeMsgSubmitSignatureShare,
			sdk.NewAttribute("signer", msg.Signer),
			sdk.NewAttribute("proposal_id", msg.ProposalId),
		),
	)

	return &types.MsgSubmitSignatureShareResponse{}, nil
}