package types

import (
	errorsmod "cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	// Message types for protobuf-generated messages
	TypeMsgCreateDid     = "create_did"
	TypeMsgUpdateDid     = "update_did"
	TypeMsgDeactivateDid = "deactivate_did"
)

// Verify that protobuf-generated types implement sdk.Msg
var (
	_ sdk.Msg = &MsgCreateDid{}
	_ sdk.Msg = &MsgUpdateDid{}
	_ sdk.Msg = &MsgDeactivateDid{}
)

// ===== MESSAGE IMPLEMENTATIONS FOR PROTOBUF TYPES =====

// MsgCreateDid implementations
func NewMsgCreateDid(creator string, id string, didDocument string) *MsgCreateDid {
	return &MsgCreateDid{
		Creator:     creator,
		Id:          id,
		DidDocument: didDocument,
	}
}

func (msg *MsgCreateDid) Route() string {
	return RouterKey
}

func (msg *MsgCreateDid) Type() string {
	return TypeMsgCreateDid
}

func (msg *MsgCreateDid) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgCreateDid) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgCreateDid) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return errorsmod.Wrapf(ErrInvalidCreator, "invalid creator address (%s)", err)
	}

	if msg.Id == "" {
		return errorsmod.Wrap(ErrInvalidDID, "ID cannot be empty")
	}

	if msg.DidDocument == "" {
		return errorsmod.Wrap(ErrInvalidDID, "DID document cannot be empty")
	}

	return nil
}

// MsgUpdateDid implementations
func NewMsgUpdateDid(creator string, id string, didDocument string) *MsgUpdateDid {
	return &MsgUpdateDid{
		Creator:     creator,
		Id:          id,
		DidDocument: didDocument,
	}
}

func (msg *MsgUpdateDid) Route() string {
	return RouterKey
}

func (msg *MsgUpdateDid) Type() string {
	return TypeMsgUpdateDid
}

func (msg *MsgUpdateDid) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgUpdateDid) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgUpdateDid) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return errorsmod.Wrapf(ErrInvalidCreator, "invalid creator address (%s)", err)
	}

	if msg.Id == "" {
		return errorsmod.Wrap(ErrInvalidDID, "ID cannot be empty")
	}

	if msg.DidDocument == "" {
		return errorsmod.Wrap(ErrInvalidDID, "DID document cannot be empty")
	}

	return nil
}

// MsgDeactivateDid implementations
func NewMsgDeactivateDid(creator string, id string) *MsgDeactivateDid {
	return &MsgDeactivateDid{
		Creator: creator,
		Id:      id,
	}
}

func (msg *MsgDeactivateDid) Route() string {
	return RouterKey
}

func (msg *MsgDeactivateDid) Type() string {
	return TypeMsgDeactivateDid
}

func (msg *MsgDeactivateDid) GetSigners() []sdk.AccAddress {
	creator, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{creator}
}

func (msg *MsgDeactivateDid) GetSignBytes() []byte {
	bz := ModuleCdc.MustMarshalJSON(msg)
	return sdk.MustSortJSON(bz)
}

func (msg *MsgDeactivateDid) ValidateBasic() error {
	_, err := sdk.AccAddressFromBech32(msg.Creator)
	if err != nil {
		return errorsmod.Wrapf(ErrInvalidCreator, "invalid creator address (%s)", err)
	}

	if msg.Id == "" {
		return errorsmod.Wrap(ErrInvalidDID, "ID cannot be empty")
	}

	return nil
}