package types

const (
	// ModuleName defines the module name
	ModuleName = "zk"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// RouterKey defines the module's message routing key
	RouterKey = ModuleName

	// MemStoreKey defines the in-memory store key
	MemStoreKey = "mem_zk"
)

func KeyPrefix(p string) []byte {
	return []byte(p)
}

const (
	ZkProofKeyPrefix = "ZkProof/value/"
	ZkProofByCircuitKeyPrefix = "ZkProof/circuit/"
	CircuitKeyPrefix = "Circuit/value/"
)

// ZkProofKey returns the store key to retrieve a ZkProof from the index fields
func ZkProofKey(
	id string,
) []byte {
	var key []byte

	idBytes := []byte(id)
	key = append(key, idBytes...)
	key = append(key, []byte("/")...)

	return key
}

// ZkProofByCircuitKey returns the store key for indexing by circuit ID
func ZkProofByCircuitKey(circuitId string, id string) []byte {
	var key []byte
	
	circuitBytes := []byte(circuitId)
	key = append(key, circuitBytes...)
	key = append(key, []byte("/")...)
	
	idBytes := []byte(id)
	key = append(key, idBytes...)
	key = append(key, []byte("/")...)
	
	return key
}

// CircuitKey returns the store key to retrieve a Circuit from the index fields
func CircuitKey(
	id string,
) []byte {
	var key []byte

	idBytes := []byte(id)
	key = append(key, idBytes...)
	key = append(key, []byte("/")...)

	return key
}