package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
)

// Simple mock testnet daemon for E2E testing
// This provides the necessary endpoints for testing without complex Cosmos SDK dependencies

type MockChainInfo struct {
	ChainID        string `json:"chain_id"`
	LatestHeight   int64  `json:"latest_block_height"`
	LatestTime     string `json:"latest_block_time"`
	NodeInfo       NodeInfo `json:"node_info"`
}

type NodeInfo struct {
	ID      string `json:"id"`
	Moniker string `json:"moniker"`
	Version string `json:"version"`
}

type MockTxResponse struct {
	TxHash string `json:"txhash"`
	Height int64  `json:"height"`
	Code   int    `json:"code"`
	Data   string `json:"data"`
}

type MockAccount struct {
	Address string `json:"address"`
	Balance string `json:"balance"`
}

var (
	chainInfo = MockChainInfo{
		ChainID:      "persona-testnet-1",
		LatestHeight: 1000,
		LatestTime:   time.Now().Format(time.RFC3339),
		NodeInfo: NodeInfo{
			ID:      "mock-node-001",
			Moniker: "testnet-node",
			Version: "v1.0.0-test",
		},
	}
	
	mockAccounts = []MockAccount{
		{Address: "cosmos1test1", Balance: "1000000000stake"},
		{Address: "cosmos1test2", Balance: "1000000000stake"},
	}
	
	// In-memory storage for created DIDs (keyed by DID ID)
	createdDIDs = make(map[string]map[string]interface{})
	// Map wallet address to DID ID for easy lookup
	walletToDID = make(map[string]string)
	// Storage for credentials by controller
	credentialsByController = make(map[string][]map[string]interface{})
	// Storage for proofs by controller
	proofsByController = make(map[string][]map[string]interface{})
)

func main() {
	r := mux.NewRouter()
	
	// Add CORS middleware to allow cross-origin requests
	r.Use(corsMiddleware)
	
	// Status endpoint - mimics Cosmos SDK status
	r.HandleFunc("/status", handleStatus).Methods("GET")
	
	// Node info endpoint
	r.HandleFunc("/node_info", handleNodeInfo).Methods("GET")
	
	// Mock transaction broadcast
	r.HandleFunc("/cosmos/tx/v1beta1/txs", handleBroadcastTx).Methods("POST", "OPTIONS")
	
	// Mock account queries
	r.HandleFunc("/cosmos/bank/v1beta1/balances/{address}", handleAccountBalance).Methods("GET", "OPTIONS")
	
	// Mock DID operations
	r.HandleFunc("/persona/did/v1beta1/did_documents", handleListDIDs).Methods("GET", "OPTIONS")
	r.HandleFunc("/persona/did/v1beta1/did_documents/{id}", handleGetDID).Methods("GET", "OPTIONS")
	r.HandleFunc("/persona/did/v1beta1/did_by_controller/{controller}", handleGetDIDByController).Methods("GET", "OPTIONS")
	
	// Mock ZK proof operations
	r.HandleFunc("/persona/zk/v1beta1/proofs", handleListProofs).Methods("GET", "OPTIONS")
	r.HandleFunc("/persona/zk/v1beta1/proofs_by_controller/{controller}", handleGetProofsByController).Methods("GET", "OPTIONS")
	r.HandleFunc("/persona/zk/v1beta1/circuits", handleListCircuits).Methods("GET", "OPTIONS")
	
	// Mock VC operations
	r.HandleFunc("/persona/vc/v1beta1/credentials", handleListVCs).Methods("GET", "OPTIONS")
	r.HandleFunc("/persona/vc/v1beta1/credentials_by_controller/{controller}", handleGetCredentialsByController).Methods("GET", "OPTIONS")
	
	// Health check
	r.HandleFunc("/health", handleHealth).Methods("GET")
	
	port := os.Getenv("PORT")
	if port == "" {
		port = "1317"
	}
	
	fmt.Printf("Mock testnet daemon starting on port %s...\n", port)
	fmt.Printf("Chain ID: %s\n", chainInfo.ChainID)
	fmt.Printf("Endpoints available:\n")
	fmt.Printf("  - Status: http://localhost:%s/status\n", port)
	fmt.Printf("  - Health: http://localhost:%s/health\n", port)
	fmt.Printf("  - DIDs: http://localhost:%s/persona/did/v1beta1/did_documents\n", port)
	
	log.Fatal(http.ListenAndServe(":"+port, r))
}

// CORS middleware to allow cross-origin requests from the demo interface
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow requests from any origin (for development)
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		
		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	// Update height to simulate progression
	chainInfo.LatestHeight++
	chainInfo.LatestTime = time.Now().Format(time.RFC3339)
	
	response := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"result": map[string]interface{}{
			"node_info": chainInfo.NodeInfo,
			"sync_info": map[string]interface{}{
				"latest_block_hash":   "0x" + fmt.Sprintf("%064d", chainInfo.LatestHeight),
				"latest_block_height": fmt.Sprintf("%d", chainInfo.LatestHeight),
				"latest_block_time":   chainInfo.LatestTime,
				"catching_up":         false,
			},
		},
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleNodeInfo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(chainInfo.NodeInfo)
}

func handleBroadcastTx(w http.ResponseWriter, r *http.Request) {
	// Read the request body to extract DID information
	body, err := io.ReadAll(r.Body)
	if err == nil {
		var txData map[string]interface{}
		if json.Unmarshal(body, &txData) == nil {
			// Check if this is a DID creation transaction
			var msgs []interface{}
			// Handle both direct msgs format and nested tx.body.messages format
			if directMsgs, ok := txData["msgs"].([]interface{}); ok {
				msgs = directMsgs
			} else if tx, ok := txData["tx"].(map[string]interface{}); ok {
				if body, ok := tx["body"].(map[string]interface{}); ok {
					if nestedMsgs, ok := body["messages"].([]interface{}); ok {
						msgs = nestedMsgs
					}
				}
			}
			
			if len(msgs) > 0 {
				if msg, ok := msgs[0].(map[string]interface{}); ok {
					if msgType, ok := msg["@type"].(string); ok {
						switch msgType {
						case "/persona.did.v1.MsgCreateDid":
							// Extract DID information and store it
							var didDoc map[string]interface{}
							
							// Handle both string and object formats for did_document
							if didDocStr, ok := msg["did_document"].(string); ok {
								// Parse JSON string
								if json.Unmarshal([]byte(didDocStr), &didDoc) != nil {
									log.Printf("Failed to parse DID document JSON: %s", didDocStr)
									break
								}
							} else if didDocObj, ok := msg["did_document"].(map[string]interface{}); ok {
								// Already an object
								didDoc = didDocObj
							} else {
								log.Printf("DID document not found or invalid format")
								break
							}
							
							if didId, ok := didDoc["id"].(string); ok {
								if controller, ok := didDoc["controller"].(string); ok {
									// Store the DID
									createdDIDs[didId] = map[string]interface{}{
										"id":         didId,
										"controller": controller,
										"created_at": time.Now().Unix(),
										"updated_at": time.Now().Unix(),
										"is_active":  true,
									}
									// Map controller to DID for easy lookup
									walletToDID[controller] = didId
									log.Printf("Stored DID: %s for controller: %s", didId, controller)
								}
							}
						
						case "/persona.vc.v1.MsgIssueCredential":
							// Extract credential information and store it
							if creator, ok := msg["creator"].(string); ok {
								if vcData, ok := msg["vc_data"].(string); ok {
									// Parse the credential data
									var credential map[string]interface{}
									if json.Unmarshal([]byte(vcData), &credential) == nil {
										// Add metadata
										credential["created_at"] = time.Now().Unix()
										credential["is_revoked"] = false
										
										// Store credential by controller
										if credentialsByController[creator] == nil {
											credentialsByController[creator] = []map[string]interface{}{}
										}
										credentialsByController[creator] = append(credentialsByController[creator], credential)
										log.Printf("Stored credential for controller: %s", creator)
									}
								}
							}
						
						case "/persona.zk.v1.MsgSubmitProof":
							// Extract proof information and store it
							var prover string
							var proofData string
							
							// Handle field name variations
							if creator, ok := msg["creator"].(string); ok {
								prover = creator
							} else if p, ok := msg["prover"].(string); ok {
								prover = p
							}
							
							if proof, ok := msg["proof"].(string); ok {
								proofData = proof
							} else if pd, ok := msg["proof_data"].(string); ok {
								proofData = pd
							}
							
							if circuitId, ok := msg["circuit_id"].(string); ok && prover != "" && proofData != "" {
								// Create proof record
								proof := map[string]interface{}{
									"id":          fmt.Sprintf("proof_%d", time.Now().Unix()),
									"circuit_id":  circuitId,
									"prover":      prover,
									"proof_data":  proofData,
									"public_inputs": msg["public_inputs"],
									"metadata":    msg["metadata"],
									"is_verified": true, // Mock verification
									"created_at":  time.Now().Unix(),
								}
								
								// Store proof by controller
								if proofsByController[prover] == nil {
									proofsByController[prover] = []map[string]interface{}{}
								}
								proofsByController[prover] = append(proofsByController[prover], proof)
								log.Printf("Stored proof for controller: %s", prover)
							} else {
								log.Printf("Missing required proof fields: prover=%s, proof_data=%s, circuit_id=%s", prover, proofData, circuitId)
							}
						}
					}
				}
			}
		}
	}
	
	// Mock successful transaction
	response := MockTxResponse{
		TxHash: fmt.Sprintf("0x%064d", time.Now().Unix()),
		Height: chainInfo.LatestHeight,
		Code:   0, // Success
		Data:   "",
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleAccountBalance(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	_ = vars["address"] // Mock - we return the same balance for any address
	
	// Return mock balance
	response := map[string]interface{}{
		"balances": []map[string]string{
			{"denom": "uprsn", "amount": "1000000000"},
		},
		"pagination": map[string]interface{}{
			"next_key": nil,
			"total":    "1",
		},
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleListDIDs(w http.ResponseWriter, r *http.Request) {
	// Start with the default mock DIDs
	mockDIDs := []map[string]interface{}{
		{
			"id":           "did:persona:123",
			"controller":   "cosmos1test1",
			"created_at":   time.Now().Unix(),
			"updated_at":   time.Now().Unix(),
			"is_active":    true,
		},
		{
			"id":           "did:persona:456",
			"controller":   "cosmos1test2",
			"created_at":   time.Now().Unix(),
			"updated_at":   time.Now().Unix(),
			"is_active":    true,
		},
	}
	
	// Add any created DIDs
	for _, did := range createdDIDs {
		mockDIDs = append(mockDIDs, did)
	}
	
	response := map[string]interface{}{
		"did_documents": mockDIDs,
		"pagination": map[string]interface{}{
			"next_key": nil,
			"total":    fmt.Sprintf("%d", len(mockDIDs)),
		},
	}
	
	log.Printf("Returning %d DIDs (including %d created)", len(mockDIDs), len(createdDIDs))
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleGetDID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	
	// Check if it's a created DID first
	if did, exists := createdDIDs[id]; exists {
		response := map[string]interface{}{
			"did_document": did,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}
	
	// Fallback to mock DID
	mockDID := map[string]interface{}{
		"did_document": map[string]interface{}{
			"id":         id,
			"controller": "cosmos1test1",
			"created_at": time.Now().Unix(),
			"updated_at": time.Now().Unix(),
			"is_active":  true,
		},
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(mockDID)
}

func handleGetDIDByController(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	controller := vars["controller"]
	
	log.Printf("Looking up DID for controller: %s", controller)
	
	// Check if this controller has a DID
	if didId, exists := walletToDID[controller]; exists {
		if did, didExists := createdDIDs[didId]; didExists {
			response := map[string]interface{}{
				"did_document": did,
			}
			log.Printf("Found DID for controller %s: %s", controller, didId)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
			return
		}
	}
	
	// No DID found for this controller
	log.Printf("No DID found for controller: %s", controller)
	response := map[string]interface{}{
		"did_document": nil,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleListProofs(w http.ResponseWriter, r *http.Request) {
	mockProofs := []map[string]interface{}{
		{
			"id":          "proof_001",
			"circuit_id":  "circuit_001",
			"prover":      "cosmos1test1",
			"is_verified": true,
			"created_at":  time.Now().Unix(),
		},
	}
	
	response := map[string]interface{}{
		"zk_proofs": mockProofs,
		"pagination": map[string]interface{}{
			"next_key": nil,
			"total":    fmt.Sprintf("%d", len(mockProofs)),
		},
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleListCircuits(w http.ResponseWriter, r *http.Request) {
	mockCircuits := []map[string]interface{}{
		{
			"id":        "circuit_001",
			"name":      "test_circuit",
			"creator":   "cosmos1test1",
			"is_active": true,
			"created_at": time.Now().Unix(),
		},
	}
	
	response := map[string]interface{}{
		"circuits": mockCircuits,
		"pagination": map[string]interface{}{
			"next_key": nil,
			"total":    fmt.Sprintf("%d", len(mockCircuits)),
		},
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleListVCs(w http.ResponseWriter, r *http.Request) {
	mockVCs := []map[string]interface{}{
		{
			"id":          "vc_001",
			"issuer_did":  "did:persona:123",
			"subject_did": "did:persona:456",
			"issued_at":   time.Now().Unix(),
			"is_revoked":  false,
		},
	}
	
	response := map[string]interface{}{
		"vc_records": mockVCs,
		"pagination": map[string]interface{}{
			"next_key": nil,
			"total":    fmt.Sprintf("%d", len(mockVCs)),
		},
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleGetCredentialsByController(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	controller := vars["controller"]
	
	log.Printf("Looking up credentials for controller: %s", controller)
	
	// Get credentials for this controller
	credentials, exists := credentialsByController[controller]
	if !exists {
		credentials = []map[string]interface{}{}
	}
	
	response := map[string]interface{}{
		"vc_records": credentials,
		"pagination": map[string]interface{}{
			"next_key": nil,
			"total":    fmt.Sprintf("%d", len(credentials)),
		},
	}
	
	log.Printf("Returning %d credentials for controller %s", len(credentials), controller)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleGetProofsByController(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	controller := vars["controller"]
	
	log.Printf("Looking up proofs for controller: %s", controller)
	
	// Get proofs for this controller
	proofs, exists := proofsByController[controller]
	if !exists {
		proofs = []map[string]interface{}{}
	}
	
	response := map[string]interface{}{
		"zk_proofs": proofs,
		"pagination": map[string]interface{}{
			"next_key": nil,
			"total":    fmt.Sprintf("%d", len(proofs)),
		},
	}
	
	log.Printf("Returning %d proofs for controller %s", len(proofs), controller)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	response := map[string]interface{}{
		"status":    "healthy",
		"chain_id":  chainInfo.ChainID,
		"height":    chainInfo.LatestHeight,
		"timestamp": time.Now().Unix(),
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}