package types

import (
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

const (
	TypeMsgIssueVc  = "issue_vc"
	TypeMsgRevokeVc = "revoke_vc"
)

var _ sdk.Msg = &MsgIssueVc{}

func NewMsgIssueVc(issuer string, id string, issuerDid string, subjectDid string, credentialSchema string, credentialData string, proof string, expiresAt int64) *MsgIssueVc {
	return &MsgIssueVc{
		Issuer:           issuer,
		Id:               id,
		IssuerDid:        issuerDid,
		SubjectDid:       subjectDid,
		CredentialSchema: credentialSchema,
		CredentialData:   credentialData,
		Proof:            proof,
		ExpiresAt:        expiresAt,
	}
}

func (msg *MsgIssueVc) Route() string {
	return RouterKey
}

func (msg *MsgIssueVc) Type() string {
	return TypeMsgIssueVc
}

func (msg *MsgIssueVc) GetSigners() []sdk.AccAddress {
	issuer, err := sdk.AccAddressFromBech32(msg.Issuer)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{issuer}
}

func (msg *MsgIssueVc) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgIssueVc) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Issuer)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid issuer address (%s)", err)
	}
	
	if msg.Id == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "VC ID cannot be empty")
	}
	
	if msg.IssuerDid == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "issuer DID cannot be empty")
	}
	
	if msg.SubjectDid == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "subject DID cannot be empty")
	}
	
	if msg.CredentialSchema == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "credential schema cannot be empty")
	}
	
	if msg.CredentialData == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "credential data cannot be empty")
	}
	
	if msg.Proof == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "proof cannot be empty")
	}
	
	if msg.ExpiresAt <= 0 {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "expiration date must be positive")
	}
	
	return nil
}

var _ sdk.Msg = &MsgRevokeVc{}

func NewMsgRevokeVc(creator string, credentialId string) *MsgRevokeVc {
	return &MsgRevokeVc{
		Creator:      creator,
		CredentialId: credentialId,
	}
}

func (msg *MsgRevokeVc) Route() string {
	return RouterKey
}

func (msg *MsgRevokeVc) Type() string {
	return TypeMsgRevokeVc
}

func (msg *MsgRevokeVc) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgRevokeVc) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgRevokeVc) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return errorsmod.Wrapf(sdkerrors.ErrInvalidAddress, "invalid creator address (%s)", err)
	}
	
	if msg.CredentialId == "" {
		return errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "credential ID cannot be empty")
	}
	
	return nil
}