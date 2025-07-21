package types

const (
	// ModuleName defines the module name
	ModuleName = "vc"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// RouterKey defines the module's message routing key
	RouterKey = ModuleName

	// MemStoreKey defines the in-memory store key
	MemStoreKey = "mem_vc"
)

func KeyPrefix(p string) []byte {
	return []byte(p)
}

const (
	VcRecordKeyPrefix = "VcRecord/value/"
	VcRecordByIssuerKeyPrefix = "VcRecord/issuer/"
	VcRecordBySubjectKeyPrefix = "VcRecord/subject/"
)

// VcRecordKey returns the store key to retrieve a VcRecord from the index fields
func VcRecordKey(
	id string,
) []byte {
	var key []byte

	idBytes := []byte(id)
	key = append(key, idBytes...)
	key = append(key, []byte("/")...)

	return key
}

// VcRecordByIssuerKey returns the store key for indexing by issuer DID
func VcRecordByIssuerKey(issuerDid string, id string) []byte {
	var key []byte
	
	issuerBytes := []byte(issuerDid)
	key = append(key, issuerBytes...)
	key = append(key, []byte("/")...)
	
	idBytes := []byte(id)
	key = append(key, idBytes...)
	key = append(key, []byte("/")...)
	
	return key
}

// VcRecordBySubjectKey returns the store key for indexing by subject DID
func VcRecordBySubjectKey(subjectDid string, id string) []byte {
	var key []byte
	
	subjectBytes := []byte(subjectDid)
	key = append(key, subjectBytes...)
	key = append(key, []byte("/")...)
	
	idBytes := []byte(id)
	key = append(key, idBytes...)
	key = append(key, []byte("/")...)
	
	return key
}