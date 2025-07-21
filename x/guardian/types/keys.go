package types

const (
	// ModuleName defines the module name
	ModuleName = "guardian"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// RouterKey defines the module's message routing key
	RouterKey = ModuleName

	// MemStoreKey defines the in-memory store key
	MemStoreKey = "mem_guardian"

	// Version defines the current version the IBC module supports
	Version = "guardian-1"

	// PortID is the default port id that module binds to
	PortID = "guardian"
)