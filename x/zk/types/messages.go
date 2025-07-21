package types

import (
	"context"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// MsgServer defines the ZK module's message service
type MsgServer interface {
	CreateProof(context.Context, *MsgCreateProof) (*MsgCreateProofResponse, error)
	VerifyProof(context.Context, *MsgVerifyProof) (*MsgVerifyProofResponse, error)
	RegisterCircuit(context.Context, *MsgRegisterCircuit) (*MsgRegisterCircuitResponse, error)
	DeactivateCircuit(context.Context, *MsgDeactivateCircuit) (*MsgDeactivateCircuitResponse, error)
}

// MsgCreateProof defines the message for creating a ZK proof
type MsgCreateProof struct {
	Creator      string   `json:"creator"`
	ProofId      string   `json:"proof_id"`
	CircuitId    string   `json:"circuit_id"`
	PublicInputs []string `json:"public_inputs"`
	Proof        string   `json:"proof"`
}

// MsgCreateProofResponse defines the response for MsgCreateProof
type MsgCreateProofResponse struct{}

// MsgVerifyProof defines the message for verifying a ZK proof
type MsgVerifyProof struct {
	Creator string `json:"creator"`
	ProofId string `json:"proof_id"`
}

// MsgVerifyProofResponse defines the response for MsgVerifyProof
type MsgVerifyProofResponse struct {
	Valid bool `json:"valid"`
}

// MsgRegisterCircuit defines the message for registering a circuit
type MsgRegisterCircuit struct {
	Creator      string            `json:"creator"`
	CircuitId    string            `json:"circuit_id"`
	Name         string            `json:"name"`
	Description  string            `json:"description"`
	CircuitData  string            `json:"circuit_data"`
	VerifyingKey string            `json:"verifying_key"`
	Parameters   map[string]string `json:"parameters"`
}

// MsgRegisterCircuitResponse defines the response for MsgRegisterCircuit
type MsgRegisterCircuitResponse struct{}

// MsgDeactivateCircuit defines the message for deactivating a circuit
type MsgDeactivateCircuit struct {
	Creator   string `json:"creator"`
	CircuitId string `json:"circuit_id"`
}

// MsgDeactivateCircuitResponse defines the response for MsgDeactivateCircuit
type MsgDeactivateCircuitResponse struct{}

// Message implementations defined below

// Message implementations for MsgCreateProof
func (msg *MsgCreateProof) Route() string              { return RouterKey }
func (msg *MsgCreateProof) Type() string               { return "create_proof" }
func (msg *MsgCreateProof) ValidateBasic() error       { return nil }
func (msg *MsgCreateProof) GetSignBytes() []byte       { return []byte{} }
func (msg *MsgCreateProof) GetSigners() []sdk.AccAddress {
	creator, _ := sdk.AccAddressFromBech32(msg.Creator)
	return []sdk.AccAddress{creator}
}

// Message implementations for MsgVerifyProof
func (msg *MsgVerifyProof) Route() string              { return RouterKey }
func (msg *MsgVerifyProof) Type() string               { return "verify_proof" }
func (msg *MsgVerifyProof) ValidateBasic() error       { return nil }
func (msg *MsgVerifyProof) GetSignBytes() []byte       { return []byte{} }
func (msg *MsgVerifyProof) GetSigners() []sdk.AccAddress {
	creator, _ := sdk.AccAddressFromBech32(msg.Creator)
	return []sdk.AccAddress{creator}
}

// Message implementations for MsgRegisterCircuit
func (msg *MsgRegisterCircuit) Route() string              { return RouterKey }
func (msg *MsgRegisterCircuit) Type() string               { return "register_circuit" }
func (msg *MsgRegisterCircuit) ValidateBasic() error       { return nil }
func (msg *MsgRegisterCircuit) GetSignBytes() []byte       { return []byte{} }
func (msg *MsgRegisterCircuit) GetSigners() []sdk.AccAddress {
	creator, _ := sdk.AccAddressFromBech32(msg.Creator)
	return []sdk.AccAddress{creator}
}

// Message implementations for MsgDeactivateCircuit
func (msg *MsgDeactivateCircuit) Route() string              { return RouterKey }
func (msg *MsgDeactivateCircuit) Type() string               { return "deactivate_circuit" }
func (msg *MsgDeactivateCircuit) ValidateBasic() error       { return nil }
func (msg *MsgDeactivateCircuit) GetSignBytes() []byte       { return []byte{} }
func (msg *MsgDeactivateCircuit) GetSigners() []sdk.AccAddress {
	creator, _ := sdk.AccAddressFromBech32(msg.Creator)
	return []sdk.AccAddress{creator}
}