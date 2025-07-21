package types

import (
	"time"
	
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// ZkProof represents a zero-knowledge proof
type ZkProof struct {
	Id          string    `json:"id" yaml:"id"`
	CircuitId   string    `json:"circuit_id" yaml:"circuit_id"`
	PublicInputs []string  `json:"public_inputs" yaml:"public_inputs"`
	Proof       string    `json:"proof" yaml:"proof"`
	Creator     string    `json:"creator" yaml:"creator"`
	CreatedAt   time.Time `json:"created_at" yaml:"created_at"`
	Verified    bool      `json:"verified" yaml:"verified"`
}

// Circuit represents a ZK circuit definition
type Circuit struct {
	Id          string            `json:"id" yaml:"id"`
	Name        string            `json:"name" yaml:"name"`
	Description string            `json:"description" yaml:"description"`
	CircuitData string            `json:"circuit_data" yaml:"circuit_data"`
	VerifyingKey string           `json:"verifying_key" yaml:"verifying_key"`
	Parameters  map[string]string `json:"parameters" yaml:"parameters"`
	Creator     string            `json:"creator" yaml:"creator"`
	CreatedAt   time.Time         `json:"created_at" yaml:"created_at"`
}

// ValidateBasic validates the ZkProof
func (zp ZkProof) ValidateBasic() error {
	if zp.Id == "" {
		return ErrInvalidProofId
	}
	if zp.CircuitId == "" {
		return ErrInvalidCircuitId
	}
	if zp.Proof == "" {
		return ErrInvalidProof
	}
	_, err := sdk.AccAddressFromBech32(zp.Creator)
	if err != nil {
		return ErrInvalidCreator
	}
	return nil
}

// ValidateBasic validates the Circuit
func (c Circuit) ValidateBasic() error {
	if c.Id == "" {
		return ErrInvalidCircuitId
	}
	if c.Name == "" {
		return ErrInvalidCircuitName
	}
	if c.CircuitData == "" {
		return ErrInvalidCircuitData
	}
	_, err := sdk.AccAddressFromBech32(c.Creator)
	if err != nil {
		return ErrInvalidCreator
	}
	return nil
}