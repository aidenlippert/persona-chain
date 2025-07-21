package types

import (
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
)

// ParamKeyTable returns the parameter key table for ZK module
func ParamKeyTable() paramtypes.KeyTable {
	return paramtypes.NewKeyTable().RegisterParamSet(&Params{})
}

// Params defines the parameters for the ZK module
type Params struct{}

// NewParams creates a new Params instance
func NewParams() Params {
	return Params{}
}

// DefaultParams returns the default parameters
func DefaultParams() Params {
	return NewParams()
}

// ParamSetPairs implements the params.ParamSet interface
func (p *Params) ParamSetPairs() paramtypes.ParamSetPairs {
	return paramtypes.ParamSetPairs{}
}

// ValidateBasic validates the parameters
func (p Params) ValidateBasic() error {
	return nil
}

// String implements the stringer interface
func (p Params) String() string {
	return "zk params"
}