package types

import (
	"encoding/binary"
	"fmt"
	"time"
)

const (
	// ModuleName defines the module name
	ModuleName = "did"

	// StoreKey defines the primary module store key
	StoreKey = ModuleName

	// RouterKey defines the module's message routing key
	RouterKey = ModuleName

	// MemStoreKey defines the in-memory store key
	MemStoreKey = "mem_did"

	// PortID for IBC operations
	PortID = "did"

	// Version defines the current IBC version
	IBCVersion1 = "did-1"
	IBCVersion2 = "did-2" // Latest version with enhanced features
)

func KeyPrefix(p string) []byte {
	return []byte(p)
}

// Store key prefixes
const (
	// Store key prefixes for enterprise features
	DIDDocumentKeyPrefix       = "DIDDocument/value/"
	DIDMetadataKeyPrefix      = "DIDMetadata/value/"
	DIDVersionKeyPrefix       = "DIDVersion/value/"
	DIDStatusKeyPrefix        = "DIDStatus/value/"
	DIDAuditKeyPrefix         = "DIDAudit/value/"
	DIDRecoveryKeyPrefix      = "DIDRecovery/value/"
	DIDGuardianKeyPrefix      = "DIDGuardian/value/"
	DIDCrossChainKeyPrefix    = "DIDCrossChain/value/"
	DIDComplianceKeyPrefix    = "DIDCompliance/value/"
)

// Key construction functions

// DIDDocumentKey returns the store key to retrieve a DIDDocument from the index fields
func DIDDocumentKey(id string) []byte {
	return []byte(id)
}

// DIDMetadataKey returns the store key for DID metadata
func DIDMetadataKey(id string) []byte {
	return []byte(id)
}

// DIDVersionKey returns the store key for a specific DID document version
func DIDVersionKey(id string, version uint64) []byte {
	versionBytes := make([]byte, 8)
	binary.BigEndian.PutUint64(versionBytes, version)
	return append([]byte(id+"-"), versionBytes...)
}

// DIDVersionPrefix returns the prefix for all versions of a DID
func DIDVersionPrefix(id string) []byte {
	return []byte(id + "-")
}

// DIDAuditKey returns the store key for audit entries
func DIDAuditKey(auditID string) []byte {
	return []byte(auditID)
}

// DIDStatusKey returns the store key for DID status
func DIDStatusKey(id string) []byte {
	return []byte(id)
}

// DIDRecoveryKey returns the store key for recovery configuration
func DIDRecoveryKey(id string) []byte {
	return []byte(id)
}

// DIDGuardianKey returns the store key for guardian relationships
func DIDGuardianKey(id, guardianID string) []byte {
	return []byte(fmt.Sprintf("%s-%s", id, guardianID))
}

// DIDCrossChainKey returns the store key for cross-chain references
func DIDCrossChainKey(id, chainID string) []byte {
	return []byte(fmt.Sprintf("%s-%s", id, chainID))
}

// DIDComplianceKey returns the store key for compliance data
func DIDComplianceKey(id string) []byte {
	return []byte(id)
}

// Additional enterprise types

// DocumentMetadata represents efficient queryable metadata
type DocumentMetadata struct {
	ID               string            `json:"id"`
	Creator          string            `json:"creator"`
	CreatedAt        time.Time         `json:"createdAt"`
	UpdatedAt        time.Time         `json:"updatedAt"`
	Version          uint64            `json:"version"`
	State            DIDState          `json:"state"`
	CriticalityLevel CriticalityLevel  `json:"criticalityLevel"`
	Environment      string            `json:"environment"`
	OrganizationID   string            `json:"organizationId,omitempty"`
	Tags             []string          `json:"tags,omitempty"`
}

// AuditEntry represents an audit log entry
type AuditEntry struct {
	ID          string      `json:"id"`
	DID         string      `json:"did"`
	Action      string      `json:"action"`
	Actor       string      `json:"actor"`
	Timestamp   time.Time   `json:"timestamp"`
	BlockHeight int64       `json:"blockHeight"`
	TxHash      string      `json:"txHash"`
	Data        interface{} `json:"data,omitempty"`
}