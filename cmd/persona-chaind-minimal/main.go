package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/spf13/cobra"
)

// Minimal persona-chaind that mimics Cosmos SDK structure
// Reuses testnet-daemon logic but with proper CLI structure

var (
	flagHome     string
	flagChainID  string
	flagRPCPort  string
	flagAPIPort  string
	flagP2PPort  string
	flagGRPCPort string
)

func main() {
	rootCmd := &cobra.Command{
		Use:   "persona-chaind",
		Short: "PersonaPass Blockchain Node",
		Long:  "A blockchain node for the PersonaPass decentralized identity network",
	}

	// Add subcommands
	rootCmd.AddCommand(
		initCmd(),
		startCmd(),
		statusCmd(),
		versionCmd(),
		keysCmd(),
		txCmd(),
		queryCmd(),
	)

	// Add persistent flags
	rootCmd.PersistentFlags().StringVar(&flagHome, "home", os.Getenv("HOME")+"/.persona", "directory for config and data")
	rootCmd.PersistentFlags().StringVar(&flagChainID, "chain-id", "persona-mainnet-1", "chain ID")

	if err := rootCmd.Execute(); err != nil {
		log.Fatal(err)
	}
}

func initCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "init [moniker]",
		Short: "Initialize node configuration",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			moniker := args[0]
			
			// Create home directory
			if err := os.MkdirAll(flagHome+"/config", 0755); err != nil {
				return err
			}
			if err := os.MkdirAll(flagHome+"/data", 0755); err != nil {
				return err
			}
			
			// Create basic config files
			config := map[string]interface{}{
				"moniker":  moniker,
				"chain_id": flagChainID,
				"created":  time.Now().Unix(),
			}
			
			configData, _ := json.MarshalIndent(config, "", "  ")
			if err := os.WriteFile(flagHome+"/config/config.toml", configData, 0644); err != nil {
				return err
			}
			
			// Create genesis file
			genesis := map[string]interface{}{
				"genesis_time": time.Now().Format(time.RFC3339),
				"chain_id":     flagChainID,
				"app_state": map[string]interface{}{
					"did": map[string]interface{}{
						"did_documents": []interface{}{},
					},
					"vc": map[string]interface{}{
						"credentials": []interface{}{},
					},
					"zk": map[string]interface{}{
						"proofs": []interface{}{},
					},
				},
			}
			
			genesisData, _ := json.MarshalIndent(genesis, "", "  ")
			if err := os.WriteFile(flagHome+"/config/genesis.json", genesisData, 0644); err != nil {
				return err
			}
			
			fmt.Printf("Initialized node %s with chain-id %s\n", moniker, flagChainID)
			fmt.Printf("Node home: %s\n", flagHome)
			return nil
		},
	}
	
	return cmd
}

func startCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "start",
		Short: "Start the blockchain node",
		RunE: func(cmd *cobra.Command, args []string) error {
			// Get port from environment or use default
			port := os.Getenv("PORT")
			if port == "" {
				port = "1317" // Cosmos SDK REST API default
			}
			
			rpcPort := os.Getenv("RPC_PORT")
			if rpcPort == "" {
				rpcPort = "26657" // Tendermint RPC default
			}
			
			// Start blockchain simulation server
			fmt.Printf("🚀 Starting PersonaPass blockchain node...\n")
			fmt.Printf("Chain ID: %s\n", flagChainID)
			fmt.Printf("Home: %s\n", flagHome)
			fmt.Printf("REST API: http://localhost:%s\n", port)
			fmt.Printf("RPC: http://localhost:%s\n", rpcPort)
			
			// Start the enhanced testnet daemon
			return startEnhancedDaemon(port, rpcPort)
		},
	}
	
	cmd.Flags().StringVar(&flagRPCPort, "rpc.laddr", "tcp://0.0.0.0:26657", "RPC listen address")
	cmd.Flags().StringVar(&flagAPIPort, "api.address", "tcp://0.0.0.0:1317", "API listen address")
	cmd.Flags().StringVar(&flagP2PPort, "p2p.laddr", "tcp://0.0.0.0:26656", "P2P listen address")
	cmd.Flags().StringVar(&flagGRPCPort, "grpc.address", "0.0.0.0:9090", "gRPC listen address")
	
	return cmd
}

func statusCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "status",
		Short: "Query blockchain status",
		RunE: func(cmd *cobra.Command, args []string) error {
			resp, err := http.Get("http://localhost:1317/status")
			if err != nil {
				return fmt.Errorf("failed to query status: %w", err)
			}
			defer resp.Body.Close()
			
			var status map[string]interface{}
			if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
				return err
			}
			
			statusData, _ := json.MarshalIndent(status, "", "  ")
			fmt.Println(string(statusData))
			return nil
		},
	}
}

func versionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Show version information",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("persona-chaind version 1.0.0")
			fmt.Println("PersonaPass Blockchain Node")
			fmt.Println("Built with Cosmos SDK compatible interface")
		},
	}
}

func keysCmd() *cobra.Command {
	keysCmd := &cobra.Command{
		Use:   "keys",
		Short: "Key management commands",
	}
	
	keysCmd.AddCommand(&cobra.Command{
		Use:   "list",
		Short: "List all keys",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("Available keys:")
			fmt.Println("- validator1: cosmos1validator1address")
			fmt.Println("- validator2: cosmos1validator2address") 
			fmt.Println("- validator3: cosmos1validator3address")
		},
	})
	
	return keysCmd
}

func txCmd() *cobra.Command {
	txCmd := &cobra.Command{
		Use:   "tx",
		Short: "Transaction commands",
	}
	
	// Add DID subcommands
	didCmd := &cobra.Command{
		Use:   "did",
		Short: "DID transaction commands",
	}
	
	didCmd.AddCommand(&cobra.Command{
		Use:   "create [did-id] [did-document]",
		Short: "Create a new DID",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			didId := args[0]
			didDoc := args[1]
			
			txData := map[string]interface{}{
				"tx": map[string]interface{}{
					"body": map[string]interface{}{
						"messages": []map[string]interface{}{
							{
								"@type":        "/persona.did.v1.MsgCreateDid",
								"creator":      "cosmos1test1",
								"did_id":       didId,
								"did_document": didDoc,
							},
						},
					},
				},
			}
			
			return submitTransaction(txData)
		},
	})
	
	txCmd.AddCommand(didCmd)
	return txCmd
}

func queryCmd() *cobra.Command {
	queryCmd := &cobra.Command{
		Use:   "query",
		Short: "Query commands",
	}
	
	// Add DID query commands
	didCmd := &cobra.Command{
		Use:   "did",
		Short: "DID query commands",
	}
	
	didCmd.AddCommand(&cobra.Command{
		Use:   "list",
		Short: "List all DIDs",
		RunE: func(cmd *cobra.Command, args []string) error {
			resp, err := http.Get("http://localhost:1317/persona/did/v1beta1/did_documents")
			if err != nil {
				return err
			}
			defer resp.Body.Close()
			
			var result map[string]interface{}
			if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
				return err
			}
			
			data, _ := json.MarshalIndent(result, "", "  ")
			fmt.Println(string(data))
			return nil
		},
	})
	
	queryCmd.AddCommand(didCmd)
	return queryCmd
}

func submitTransaction(txData map[string]interface{}) error {
	txJSON, _ := json.Marshal(txData)
	
	resp, err := http.Post("http://localhost:1317/cosmos/tx/v1beta1/txs", 
		"application/json", 
		strings.NewReader(string(txJSON)))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return err
	}
	
	resultData, _ := json.MarshalIndent(result, "", "  ")
	fmt.Println(string(resultData))
	return nil
}

// Enhanced daemon with better Cosmos SDK compatibility
func startEnhancedDaemon(apiPort, rpcPort string) error {
	r := mux.NewRouter()
	
	// Add CORS middleware
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
			
			if req.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}
			
			next.ServeHTTP(w, req)
		})
	})
	
	// Load existing testnet daemon handlers
	setupEnhancedHandlers(r)
	
	// Start API server
	go func() {
		log.Printf("🌐 REST API server starting on port %s", apiPort)
		if err := http.ListenAndServe(":"+apiPort, r); err != nil {
			log.Fatal("API server failed:", err)
		}
	}()
	
	// Start RPC server (basic)
	go func() {
		rpcRouter := mux.NewRouter()
		rpcRouter.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
			status := map[string]interface{}{
				"jsonrpc": "2.0",
				"id":      1,
				"result": map[string]interface{}{
					"node_info": map[string]interface{}{
						"network":  flagChainID,
						"version":  "1.0.0",
						"moniker":  "persona-node",
					},
					"sync_info": map[string]interface{}{
						"latest_block_height": "1000",
						"latest_block_time":   time.Now().Format(time.RFC3339),
						"catching_up":         false,
					},
				},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(status)
		})
		
		log.Printf("🔗 RPC server starting on port %s", rpcPort)
		rpcPortInt, _ := strconv.Atoi(rpcPort)
		if err := http.ListenAndServe(fmt.Sprintf(":%d", rpcPortInt), rpcRouter); err != nil {
			log.Fatal("RPC server failed:", err)
		}
	}()
	
	// Keep main goroutine alive
	select {}
}

// setupEnhancedHandlers sets up all the API handlers (reusing testnet-daemon logic)
func setupEnhancedHandlers(r *mux.Router) {
	// In-memory storage
	createdDIDs := make(map[string]map[string]interface{})
	_ = make(map[string]string)               // walletToDID for future use
	_ = make(map[string][]map[string]interface{}) // credentialsByController for future use
	_ = make(map[string][]map[string]interface{}) // proofsByController for future use
	
	// Chain info
	chainInfo := map[string]interface{}{
		"chain_id":      flagChainID,
		"latest_height": 1000,
		"latest_time":   time.Now().Format(time.RFC3339),
		"node_info": map[string]interface{}{
			"id":      "persona-node-001",
			"moniker": "persona-mainnet-node",
			"version": "v1.0.0",
		},
	}
	
	// Status endpoints
	r.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		chainInfo["latest_height"] = chainInfo["latest_height"].(int) + 1
		chainInfo["latest_time"] = time.Now().Format(time.RFC3339)
		
		response := map[string]interface{}{
			"jsonrpc": "2.0",
			"id":      1,
			"result": map[string]interface{}{
				"node_info": chainInfo["node_info"],
				"sync_info": map[string]interface{}{
					"latest_block_hash":   fmt.Sprintf("0x%064d", chainInfo["latest_height"]),
					"latest_block_height": fmt.Sprintf("%d", chainInfo["latest_height"]),
					"latest_block_time":   chainInfo["latest_time"],
					"catching_up":         false,
				},
			},
		}
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}).Methods("GET")
	
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		response := map[string]interface{}{
			"status":    "healthy",
			"chain_id":  chainInfo["chain_id"],
			"height":    chainInfo["latest_height"],
			"timestamp": time.Now().Unix(),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}).Methods("GET")
	
	// Transaction broadcast
	r.HandleFunc("/cosmos/tx/v1beta1/txs", func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err == nil {
			var txData map[string]interface{}
			if json.Unmarshal(body, &txData) == nil {
				// Process transaction (simplified)
				response := map[string]interface{}{
					"txhash": fmt.Sprintf("0x%064d", time.Now().Unix()),
					"height": chainInfo["latest_height"],
					"code":   0,
					"data":   "",
				}
				
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(response)
				return
			}
		}
		
		http.Error(w, "Invalid transaction", http.StatusBadRequest)
	}).Methods("POST")
	
	// DID endpoints
	r.HandleFunc("/persona/did/v1beta1/did_documents", func(w http.ResponseWriter, r *http.Request) {
		mockDIDs := []map[string]interface{}{
			{
				"id":         "did:persona:123",
				"controller": "cosmos1test1",
				"created_at": time.Now().Unix(),
				"updated_at": time.Now().Unix(),
				"is_active":  true,
			},
			{
				"id":         "did:persona:456",
				"controller": "cosmos1test2",
				"created_at": time.Now().Unix(),
				"updated_at": time.Now().Unix(),
				"is_active":  true,
			},
		}
		
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
		
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}).Methods("GET")
	
	// VC endpoints
	r.HandleFunc("/persona/vc/v1beta1/credentials", func(w http.ResponseWriter, r *http.Request) {
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
	}).Methods("GET")
	
	// ZK Proof endpoints
	r.HandleFunc("/persona/zk/v1beta1/proofs", func(w http.ResponseWriter, r *http.Request) {
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
	}).Methods("GET")
}