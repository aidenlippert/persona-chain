package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// AccountKeeper defines the expected account keeper used for simulations (noalias)
type AccountKeeper interface {
	GetAccount(ctx sdk.Context, addr sdk.AccAddress) sdk.AccountI
}

// BankKeeper defines the expected interface needed to retrieve account balances.
type BankKeeper interface {
	SpendableCoins(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins
}

// VcKeeper defines the expected verifiable credential keeper interface
type VcKeeper interface {
	GetVerifiableCredential(ctx sdk.Context, id string) (interface{}, bool)
	SetVerifiableCredential(ctx sdk.Context, vc interface{})
}