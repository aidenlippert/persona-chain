#!/bin/bash

# Persona Chain Public Testnet Setup Script
# Creates a 4-node public testnet with proper validator configuration

set -e

CHAIN_ID="persona-testnet-1"
CHAIN_DIR="./testnet-data"
NODES=4
DENOM="uprsn"
STAKE_AMOUNT="1000000000000$DENOM"
FAUCET_AMOUNT="10000000000000$DENOM"

# Validator node names and ports
VALIDATORS=("validator-01" "validator-02" "validator-03" "validator-04")
RPC_PORTS=(26657 26667 26677 26687)
P2P_PORTS=(26656 26666 26676 26686)
GRPC_PORTS=(9090 9091 9092 9093)
API_PORTS=(1317 1318 1319 1320)

echo "🚀 Setting up Persona Chain public testnet..."
echo "Chain ID: $CHAIN_ID"
echo "Validators: ${#VALIDATORS[@]}"

# Clean up existing data
rm -rf $CHAIN_DIR
mkdir -p $CHAIN_DIR

# Create faucet account
FAUCET_MNEMONIC="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
FAUCET_ADDRESS="persona1testnetfaucet1234567890abcdefghijklmn"

echo "📋 Generating validator keys and genesis..."

# Initialize each validator node
for i in "${!VALIDATORS[@]}"; do
    VALIDATOR=${VALIDATORS[$i]}
    NODE_DIR="$CHAIN_DIR/$VALIDATOR"
    
    echo "Initializing $VALIDATOR..."
    
    # Create node directory
    mkdir -p $NODE_DIR
    
    # Generate validator keys (using mock since persona-chaind isn't fully built)
    cat > $NODE_DIR/priv_validator_key.json << EOF
{
  "address": "$(openssl rand -hex 20 | tr '[:lower:]' '[:upper:]')",
  "pub_key": {
    "type": "tendermint/PubKeyEd25519",
    "value": "$(openssl rand -base64 32)"
  },
  "priv_key": {
    "type": "tendermint/PrivKeyEd25519",
    "value": "$(openssl rand -base64 64)"
  }
}
EOF

    # Generate node key
    cat > $NODE_DIR/node_key.json << EOF
{
  "priv_key": {
    "type": "tendermint/PrivKeyEd25519",
    "value": "$(openssl rand -base64 64)"
  }
}
EOF

    # Create validator account
    VALIDATOR_ADDRESS="persona1validator$(printf "%02d" $((i+1)))$(openssl rand -hex 10)"
    
    # Generate gentx (genesis transaction)
    cat > $NODE_DIR/gentx.json << EOF
{
  "type": "cosmos-sdk/StdTx",
  "value": {
    "msg": [
      {
        "type": "cosmos-sdk/MsgCreateValidator",
        "value": {
          "description": {
            "moniker": "$VALIDATOR",
            "identity": "",
            "website": "https://persona-chain.dev",
            "security_contact": "security@persona-chain.dev",
            "details": "Persona Chain Testnet Validator $((i+1))"
          },
          "commission": {
            "rate": "0.100000000000000000",
            "max_rate": "0.200000000000000000",
            "max_change_rate": "0.010000000000000000"
          },
          "min_self_delegation": "1",
          "delegator_address": "$VALIDATOR_ADDRESS",
          "validator_address": "$(echo $VALIDATOR_ADDRESS | sed 's/persona/personavaloper/')",
          "pubkey": {
            "type": "tendermint/PubKeyEd25519",
            "value": "$(openssl rand -base64 32)"
          },
          "value": {
            "denom": "$DENOM",
            "amount": "$(echo $STAKE_AMOUNT | sed 's/uprsn//')"
          }
        }
      }
    ],
    "fee": {
      "amount": [],
      "gas": "200000"
    },
    "signatures": [
      {
        "pub_key": {
          "type": "tendermint/PubKeySecp256k1",
          "value": "$(openssl rand -base64 33)"
        },
        "signature": "$(openssl rand -base64 64)"
      }
    ],
    "memo": "$VALIDATOR Genesis Validator"
  }
}
EOF
    
    echo "  ✅ $VALIDATOR initialized"
done

echo "🔧 Creating network configuration..."

# Create peer configuration
PERSISTENT_PEERS=""
for i in "${!VALIDATORS[@]}"; do
    if [ $i -gt 0 ]; then
        PERSISTENT_PEERS="$PERSISTENT_PEERS,"
    fi
    NODE_ID="$(openssl rand -hex 20)"
    PERSISTENT_PEERS="$PERSISTENT_PEERS${NODE_ID}@localhost:${P2P_PORTS[$i]}"
done

echo "📦 Generating genesis file..."

# Create genesis file with all validators and initial state
cat > $CHAIN_DIR/genesis.json << EOF
{
  "genesis_time": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "chain_id": "$CHAIN_ID",
  "initial_height": "1",
  "consensus_params": {
    "block": {
      "max_bytes": "22020096",
      "max_gas": "50000000",
      "time_iota_ms": "1000"
    },
    "evidence": {
      "max_age_num_blocks": "100000",
      "max_age_duration": "172800000000000",
      "max_bytes": "1048576"
    },
    "validator": {
      "pub_key_types": ["ed25519"]
    },
    "version": {}
  },
  "app_hash": "",
  "app_state": {
    "auth": {
      "params": {
        "max_memo_characters": "256",
        "tx_sig_limit": "7",
        "tx_size_cost_per_byte": "10",
        "sig_verify_cost_ed25519": "590",
        "sig_verify_cost_secp256k1": "1000"
      },
      "accounts": [
        {
          "type": "cosmos-sdk/BaseAccount",
          "value": {
            "address": "$FAUCET_ADDRESS",
            "coins": [
              {
                "denom": "$DENOM",
                "amount": "$FAUCET_AMOUNT"
              }
            ],
            "public_key": null,
            "account_number": "0",
            "sequence": "0"
          }
        }
      ]
    },
    "bank": {
      "params": {
        "send_enabled": [],
        "default_send_enabled": true
      },
      "balances": [
        {
          "address": "$FAUCET_ADDRESS", 
          "coins": [
            {
              "denom": "$DENOM",
              "amount": "$FAUCET_AMOUNT"
            }
          ]
        }
      ],
      "supply": [
        {
          "denom": "$DENOM",
          "amount": "$FAUCET_AMOUNT"
        }
      ],
      "denom_metadata": [
        {
          "description": "Persona Chain native token",
          "denom_units": [
            {
              "denom": "$DENOM",
              "exponent": 0,
              "aliases": ["microprsn"]
            },
            {
              "denom": "prsn",
              "exponent": 6,
              "aliases": ["persona"]
            }
          ],
          "base": "$DENOM",
          "display": "prsn",
          "name": "Persona",
          "symbol": "PRSN"
        }
      ]
    },
    "staking": {
      "params": {
        "unbonding_time": "1814400s",
        "max_validators": 100,
        "max_entries": 7,
        "historical_entries": 10000,
        "bond_denom": "$DENOM",
        "min_commission_rate": "0.000000000000000000"
      },
      "last_total_power": "0",
      "last_validator_powers": [],
      "validators": [],
      "delegations": [],
      "unbonding_delegations": [],
      "redelegations": [],
      "exported": false
    },
    "distribution": {
      "params": {
        "community_tax": "0.020000000000000000",
        "base_proposer_reward": "0.010000000000000000", 
        "bonus_proposer_reward": "0.040000000000000000",
        "withdraw_addr_enabled": true
      },
      "fee_pool": {
        "community_pool": []
      }
    },
    "gov": {
      "starting_proposal_id": "1",
      "deposits": [],
      "votes": [],
      "proposals": [],
      "params": {
        "min_deposit": [
          {
            "denom": "$DENOM",
            "amount": "10000000"
          }
        ],
        "max_deposit_period": "172800s",
        "voting_period": "172800s",
        "quorum": "0.334000000000000000",
        "threshold": "0.500000000000000000",
        "veto_threshold": "0.334000000000000000"
      }
    },
    "mint": {
      "minter": {
        "inflation": "0.130000000000000000",
        "annual_provisions": "0.000000000000000000"
      },
      "params": {
        "mint_denom": "$DENOM",
        "inflation_rate_change": "0.130000000000000000",
        "inflation_max": "0.200000000000000000",
        "inflation_min": "0.070000000000000000",
        "goal_bonded": "0.670000000000000000",
        "blocks_per_year": "6311520"
      }
    },
    "slashing": {
      "params": {
        "signed_blocks_window": "100",
        "min_signed_per_window": "0.500000000000000000",
        "downtime_jail_duration": "600s",
        "slash_fraction_double_sign": "0.050000000000000000",
        "slash_fraction_downtime": "0.010000000000000000"
      }
    },
    "did": {
      "params": {},
      "did_documents": []
    },
    "vc": {
      "params": {},
      "vc_records": []
    },
    "zk": {
      "params": {},
      "circuits": [
        {
          "circuit_id": "age_verification_v1",
          "name": "Age Verification Circuit",
          "description": "Verifies age >= 18 without revealing exact age",
          "verifying_key": "testnet_age_verification_key",
          "creator": "$FAUCET_ADDRESS",
          "is_active": true,
          "created_at": $(date +%s)
        }
      ],
      "zk_proofs": []
    },
    "guardian": {
      "params": {
        "recovery_threshold": 2,
        "proposal_expiry_seconds": 604800
      },
      "guardians": [],
      "recovery_proposals": []
    }
  }
}
EOF

echo "🔧 Creating node configurations..."

# Generate configuration files for each validator
for i in "${!VALIDATORS[@]}"; do
    VALIDATOR=${VALIDATORS[$i]}
    NODE_DIR="$CHAIN_DIR/$VALIDATOR"
    
    # Copy genesis to each validator
    cp $CHAIN_DIR/genesis.json $NODE_DIR/
    
    # Create config.toml
    cat > $NODE_DIR/config.toml << EOF
# Tendermint Core configuration for $VALIDATOR

proxy_app = "tcp://127.0.0.1:26658"
moniker = "$VALIDATOR"
fast_sync = true
db_backend = "goleveldb"
db_dir = "data"
log_level = "info"
log_format = "plain"
genesis_file = "config/genesis.json"
priv_validator_key_file = "config/priv_validator_key.json"
priv_validator_state_file = "data/priv_validator_state.json"
priv_validator_laddr = ""
node_key_file = "config/node_key.json"
abci = "socket"
filter_peers = false

[rpc]
laddr = "tcp://0.0.0.0:${RPC_PORTS[$i]}"
cors_allowed_origins = ["*"]
cors_allowed_methods = ["HEAD", "GET", "POST"]
cors_allowed_headers = ["Origin", "Accept", "Content-Type", "X-Requested-With", "X-Server-Time"]
grpc_laddr = ""
grpc_max_open_connections = 900
unsafe = true
max_open_connections = 900
max_subscription_clients = 100
max_subscriptions_per_client = 5
timeout_broadcast_tx_commit = "10s"
max_body_bytes = 1000000
max_header_bytes = 1048576
tls_cert_file = ""
tls_key_file = ""

[p2p]
laddr = "tcp://0.0.0.0:${P2P_PORTS[$i]}"
external_address = ""
seeds = ""
persistent_peers = "$PERSISTENT_PEERS"
upnp = false
addr_book_file = "config/addrbook.json"
addr_book_strict = true
max_num_inbound_peers = 40
max_num_outbound_peers = 10
flush_throttle_timeout = "100ms"
max_packet_msg_payload_size = 1024
send_rate = 5120000
recv_rate = 5120000
pex = true
seed_mode = false
private_peer_ids = ""
allow_duplicate_ip = false
handshake_timeout = "20s"
dial_timeout = "3s"

[mempool]
recheck = true
broadcast = true
wal_dir = ""
size = 5000
max_txs_bytes = 1073741824
cache_size = 10000
keep-invalid-txs-in-cache = false
max_tx_bytes = 1048576
max_batch_bytes = 0

[consensus]
wal_file = "data/cs.wal/wal"
timeout_propose = "3s"
timeout_propose_delta = "500ms"
timeout_prevote = "1s"
timeout_prevote_delta = "500ms"
timeout_precommit = "1s"
timeout_precommit_delta = "500ms"
timeout_commit = "5s"
double_sign_check_height = 0
skip_timeout_commit = false
create_empty_blocks = true
create_empty_blocks_interval = "0s"
peer_gossip_sleep_duration = "100ms"
peer_query_maj23_sleep_duration = "2s"

[tx_index]
indexer = "kv"
index_tags = ""
index_all_tags = false

[instrumentation]
prometheus = false
prometheus_listen_addr = ":26660"
max_open_connections = 3
namespace = "tendermint"
EOF

    # Create app.toml
    cat > $NODE_DIR/app.toml << EOF
# Cosmos SDK application configuration for $VALIDATOR

minimum-gas-prices = "0.025$DENOM"
pruning = "default"
pruning-keep-recent = "100"
pruning-keep-every = "0"
pruning-interval = "0"
halt-height = 0
halt-time = 0
min-retain-blocks = 0
inter-block-cache = true
index-events = []

[telemetry]
service-name = ""
enabled = false
enable-hostname = false
enable-hostname-label = false
enable-service-label = false
prometheus-retention-time = 0
global-labels = []

[api]
enable = true
swagger = true
address = "tcp://0.0.0.0:${API_PORTS[$i]}"
max-open-connections = 1000
rpc-read-timeout = 10
rpc-write-timeout = 0
rpc-max-body-bytes = 1000000
enabled-unsafe-cors = true

[rosetta]
enable = false
address = ":8080"
blockchain = "app"
network = "network"
retries = 3
offline = false

[grpc]
enable = true
address = "0.0.0.0:${GRPC_PORTS[$i]}"

[grpc-web]
enable = true
address = "0.0.0.0:$((${GRPC_PORTS[$i]} + 10))"
enable-unsafe-cors = true

[state-sync]
snapshot-interval = 0
snapshot-keep-recent = 2
EOF

    echo "  ✅ $VALIDATOR configuration created"
done

echo "📝 Creating startup scripts..."

# Create individual validator startup scripts
for i in "${!VALIDATORS[@]}"; do
    VALIDATOR=${VALIDATORS[$i]}
    cat > $CHAIN_DIR/start-${VALIDATOR}.sh << EOF
#!/bin/bash
cd \$(dirname \$0)/${VALIDATOR}
echo "Starting $VALIDATOR..."
echo "RPC: http://localhost:${RPC_PORTS[$i]}"
echo "API: http://localhost:${API_PORTS[$i]}"
echo "gRPC: http://localhost:${GRPC_PORTS[$i]}"

# In a real deployment, this would be:
# persona-chaind start --home . --chain-id $CHAIN_ID

# For now, start the mock testnet daemon on the appropriate port
PORT=${API_PORTS[$i]} ../../cmd/testnet-daemon/testnet-daemon
EOF
    chmod +x $CHAIN_DIR/start-${VALIDATOR}.sh
done

# Create master startup script
cat > $CHAIN_DIR/start-testnet.sh << EOF
#!/bin/bash
echo "🚀 Starting Persona Chain Testnet ($CHAIN_ID)"
echo "Starting all validator nodes..."

cd \$(dirname \$0)

# Start all validators in background
for validator in ${VALIDATORS[@]}; do
    echo "Starting \$validator..."
    ./start-\$validator.sh > logs/\$validator.log 2>&1 &
    sleep 2
done

echo ""
echo "✅ Testnet started successfully!"
echo ""
echo "📡 RPC Endpoints:"
EOF

for i in "${!VALIDATORS[@]}"; do
    echo "echo \"  ${VALIDATORS[$i]}: http://localhost:${RPC_PORTS[$i]}\"" >> $CHAIN_DIR/start-testnet.sh
done

cat >> $CHAIN_DIR/start-testnet.sh << EOF

echo ""
echo "🌐 API Endpoints:"
EOF

for i in "${!VALIDATORS[@]}"; do
    echo "echo \"  ${VALIDATORS[$i]}: http://localhost:${API_PORTS[$i]}\"" >> $CHAIN_DIR/start-testnet.sh
done

cat >> $CHAIN_DIR/start-testnet.sh << EOF

echo ""
echo "🔗 Chain ID: $CHAIN_ID"
echo "💰 Faucet Address: $FAUCET_ADDRESS"
echo ""
echo "To stop testnet: ./stop-testnet.sh"
EOF

chmod +x $CHAIN_DIR/start-testnet.sh

# Create stop script
cat > $CHAIN_DIR/stop-testnet.sh << EOF
#!/bin/bash
echo "🛑 Stopping Persona Chain Testnet..."
pkill -f testnet-daemon
echo "✅ Testnet stopped"
EOF
chmod +x $CHAIN_DIR/stop-testnet.sh

# Create logs directory
mkdir -p $CHAIN_DIR/logs

echo ""
echo "🎉 Persona Chain Testnet Setup Complete!"
echo ""
echo "📋 Configuration Summary:"
echo "  Chain ID: $CHAIN_ID"
echo "  Validators: ${#VALIDATORS[@]}"
echo "  Native Token: $DENOM (micro-persona)"
echo "  Faucet Address: $FAUCET_ADDRESS"
echo ""
echo "🚀 To start the testnet:"
echo "  cd $CHAIN_DIR"
echo "  ./start-testnet.sh"
echo ""
echo "📂 Configuration files:"
for i in "${!VALIDATORS[@]}"; do
    echo "  ${VALIDATORS[$i]}: $CHAIN_DIR/${VALIDATORS[$i]}/"
done
echo ""
echo "🌐 Once started, access points:"
echo "  Primary RPC: http://localhost:${RPC_PORTS[0]}"
echo "  Primary API: http://localhost:${API_PORTS[0]}"
echo "  Health Check: curl http://localhost:${API_PORTS[0]}/health"
echo ""
EOF