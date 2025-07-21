package types

import (
	"cosmossdk.io/errors"
)

// x/zk module sentinel errors
var (
	ErrInvalidProofId     = errors.Register(ModuleName, 1001, "invalid proof id")
	ErrInvalidCircuitId   = errors.Register(ModuleName, 1002, "invalid circuit id")
	ErrInvalidProof       = errors.Register(ModuleName, 1003, "invalid proof data")
	ErrInvalidCreator     = errors.Register(ModuleName, 1004, "invalid creator address")
	ErrProofNotFound      = errors.Register(ModuleName, 1005, "proof not found")
	ErrCircuitNotFound    = errors.Register(ModuleName, 1006, "circuit not found")
	ErrProofExists        = errors.Register(ModuleName, 1007, "proof already exists")
	ErrCircuitExists      = errors.Register(ModuleName, 1008, "circuit already exists")
	ErrInvalidCircuitName = errors.Register(ModuleName, 1009, "invalid circuit name")
	ErrInvalidCircuitData = errors.Register(ModuleName, 1010, "invalid circuit data")
	ErrVerificationFailed = errors.Register(ModuleName, 1011, "proof verification failed")
)