#!/bin/bash
# Fix PersonaChain to support Keplr - Enable all required RPC endpoints

set -e

GCP_IP="34.29.74.111"
GCP_USER="rocz"

echo "🔧 Fixing PersonaChain configuration for Keplr compatibility..."

ssh -i ~/.ssh/gcp_key "$GCP_USER@$GCP_IP" << 'EOF'
echo "🛑 Stopping current PersonaChain process..."
sudo pkill -f personachaind || true
sleep 3

echo "📁 Setting up proper configuration..."
mkdir -p ~/.personachain/config

# Create a proper config.toml with all RPC endpoints enabled
cat > ~/.personachain/config/config.toml << 'CONFIG_EOF'
# Tendermint Core Configuration

[rpc]
# TCP or UNIX socket address for the RPC server to listen on
laddr = "tcp://0.0.0.0:26657"

# A list of origins a cross-domain request can be executed from
cors_allowed_origins = ["*"]

# A list of methods the client is allowed to use with cross-domain requests
cors_allowed_methods = ["HEAD", "GET", "POST"]

# A list of non simple headers the client is allowed to use with cross-domain requests
cors_allowed_headers = ["Origin", "Accept", "Content-Type", "X-Requested-With", "X-Server-Time"]

# Maximum number of simultaneous connections.
max_open_connections = 900

# Maximum time to wait for a tx to be committed during /broadcast_tx_commit.
timeout_broadcast_tx_commit = "10s"

# Maximum size of request body, in bytes
max_body_bytes = 1000000

# Maximum size of request header, in bytes
max_header_bytes = 1048576

# The path to a file containing certificate that is used to create the HTTPS server.
tls_cert_file = ""

# The path to a file containing matching private key that is used to create the HTTPS server.
tls_key_file = ""

# pprof listen address (https://golang.org/pkg/net/http/pprof)
pprof_laddr = ""

[p2p]
# Address to listen for incoming connections
laddr = "tcp://0.0.0.0:26656"

# Address to advertise to peers for them to dial
external_address = ""

# Comma separated list of seed nodes to connect to
seeds = ""

# Comma separated list of nodes to keep persistent connections to
persistent_peers = ""

# UPNP port forwarding
upnp = false

# Path to address book
addr_book_file = "config/addrbook.json"

# Set true for strict address routability rules
addr_book_strict = true

# Maximum number of inbound peers
max_num_inbound_peers = 40

# Maximum number of outbound peers to connect to, excluding persistent peers
max_num_outbound_peers = 10

# List of node IDs, to which a connection will be (re)established ignoring any existing limits
unconditional_peer_ids = ""

# Maximum pause when redialing a persistent peer (if zero, exponential backoff is used)
persistent_peers_max_dial_period = "0s"

# Time to wait before flushing messages out on the connection
flush_throttle_timeout = "100ms"

# Maximum size of a message packet payload, in bytes
max_packet_msg_payload_size = 1024

# Rate at which packets can be sent, in bytes/second
send_rate = 5120000

# Rate at which packets can be received, in bytes/second
recv_rate = 5120000

# Set true to enable the peer-exchange reactor
pex = true

# Seed mode, in which node constantly crawls the network and looks for
# peers. If another node asks it for addresses, it responds and disconnects.
seed_mode = false

# Comma separated list of peer IDs to keep private (will not be gossiped to other peers)
private_peer_ids = ""

# Toggle to disable guard against peers connecting from the same ip.
allow_duplicate_ip = false

# Peer connection configuration.
handshake_timeout = "20s"
dial_timeout = "3s"

[mempool]
recheck = true
broadcast = true
wal_dir = ""

# Maximum number of transactions in the mempool
size = 5000

# Limit the total size of all txs in the mempool.
max_txs_bytes = 1073741824

# Size of the cache (used to filter transactions we saw earlier) in transactions
cache_size = 10000

# Do not remove invalid transactions from the cache (default: false)
keep_invalid_txs_in_cache = false

# Maximum size of a single transaction.
max_tx_bytes = 1048576

# Maximum size of a batch of transactions to send to a peer
max_batch_bytes = 0

[statesync]
# State sync rapidly bootstraps a new node by discovering, fetching, and restoring a state machine
# snapshot from peers instead of fetching and replaying historical blocks. Requires some peers in
# the network to take and serve state machine snapshots. State sync is not attempted if the node
# has any local state (LastBlockHeight > 0). The node will have a truncated block history,
# starting from the height of the snapshot.
enable = false

# RPC servers (comma-separated) for light client verification of the synced state machine and
# retrieval of state data for node bootstrapping. Also needs a trusted height and corresponding
# header hash obtained from a trusted source, and a period during which validators can be trusted.
rpc_servers = ""

# Trust height and corresponding header hash
trust_height = 0
trust_hash = ""

# Trust period during which validators can be trusted.
trust_period = "168h0m0s"

# Time to spend discovering snapshots before initiating a restore.
discovery_time = "15s"

# Temporary directory for state sync snapshot chunks, defaults to the OS tempdir (since v0.33.4).
temp_dir = ""

# The timeout duration before re-requesting a chunk, possibly from a different
# peer (default: 1 minute).
chunk_request_timeout = "10s"

# The number of concurrent chunk fetchers to run (default: 1).
chunk_fetchers = "4"

[fastsync]
# Fast Sync version to use:
#   1) "v0" (default) - the legacy fast sync implementation
#   2) "v1" - refactor of v0 version for better testability
#   2) "v2" - complete redesign of v0, optimized for testability & readability
version = "v0"

[consensus]
wal_file = "data/cs.wal/wal"

# How long we wait for a proposal block before prevoting nil
timeout_propose = "3s"
# How much timeout_propose increases with each round
timeout_propose_delta = "500ms"
# How long we wait after receiving +2/3 prevotes for "anything" (ie. not a single block or nil)
timeout_prevote = "1s"
# How much the timeout_prevote increases with each round
timeout_prevote_delta = "500ms"
# How long we wait after receiving +2/3 precommits for "anything" (ie. not a single block or nil)
timeout_precommit = "1s"
# How much the timeout_precommit increases with each round
timeout_precommit_delta = "500ms"
# How long we wait after committing a block, before starting on the new
# height (this gives us a chance to receive some more precommits, even
# though we already have +2/3).
timeout_commit = "5s"

# How many blocks to look back to check existence of the node ID in the
# validator set before joining consensus
# When non-zero, the node will panic if the same node ID appears in the
# validator set of any block within this number of blocks before the latest block.
double_sign_check_height = 0

# Make progress as soon as we have all the precommits (as if TimeoutCommit = 0)
skip_timeout_commit = false

# EmptyBlocks mode and possible interval between empty blocks
create_empty_blocks = true
create_empty_blocks_interval = "0s"

# Reactor sleep duration parameters
peer_gossip_sleep_duration = "100ms"
peer_query_maj23_sleep_duration = "2s"

[tx_index]
# What indexer to use for transactions
indexer = "kv"

[instrumentation]
# When true, Prometheus metrics are served under /metrics on
# PrometheusListenAddr.
prometheus = false

# Address to listen for Prometheus collector(s) connections
prometheus_listen_addr = ":26660"

# Maximum number of simultaneous connections.
max_open_connections = 3

# Instrumentation namespace
namespace = "tendermint"
CONFIG_EOF

# Create app.toml for API server
cat > ~/.personachain/config/app.toml << 'APP_EOF'
# This is a TOML config file.
# For more information, see https://github.com/toml-lang/toml

###############################################################################
###                           Base Configuration                            ###
###############################################################################

# The minimum gas prices a validator is willing to accept for processing a
# transaction. A transaction's fees must meet the minimum of any denomination
# specified in this config (e.g. 0.25token1;0.0001token2).
minimum-gas-prices = ""

# default: the last 362880 states are kept, pruning at 10 block intervals
# nothing: all historic states will be saved, nothing will be deleted (i.e. archival node)
# everything: 2 latest states will be kept; pruning at 10 block intervals.
# custom: allow pruning options to be manually specified through 'pruning-keep-recent', and 'pruning-interval'
pruning = "default"

# These are applied if and only if the pruning strategy is custom.
pruning-keep-recent = "0"
pruning-interval = "0"

# HaltHeight contains a non-zero block height at which a node will gracefully
# halt and shutdown that can be used to assist upgrades and testing.
halt-height = 0

# HaltTime contains a non-zero minimum block time (in Unix seconds) at which
# a node will gracefully halt and shutdown that can be used to assist
# upgrades and testing.
halt-time = 0

# MinRetainBlocks defines the minimum block height offset from the current
# block being committed, such that all blocks past this offset are pruned
# from Tendermint.
min-retain-blocks = 0

# InterBlockCache enables inter-block caching.
inter-block-cache = true

# IndexEvents defines the set of events in the form {eventType}.{attributeKey},
# which informs Tendermint what to index. If empty, all events will be indexed.
index-events = []

# IavlCacheSize set the size of the iavl tree cache.
iavl-cache-size = 781250

# IAVLDisableFastNode enables or disables the fast node feature of IAVL. 
iavl-disable-fastnode = false

###############################################################################
###                         Telemetry Configuration                         ###
###############################################################################

[telemetry]

# Prefixed with keys to separate services.
service-name = ""

# Enabled enables the application telemetry functionality. When enabled,
# an in-memory sink is also enabled by default. Operators may also enabled
# other sinks such as Prometheus.
enabled = false

# Enable prefixing gauge values with hostname.
enable-hostname = false

# Enable adding hostname to labels.
enable-hostname-label = false

# Enable adding service to labels.
enable-service-label = false

# PrometheusRetentionTime, when positive, enables a Prometheus metrics sink.
prometheus-retention-time = 0

# GlobalLabels defines a global set of name/value label tuples applied to all
# metrics emitted using the wrapper functions defined in telemetry package.
global-labels = [
]

###############################################################################
###                           API Configuration                             ###
###############################################################################

[api]

# Enable defines if the API server should be enabled.
enable = true

# Swagger defines if swagger documentation should automatically be registered.
swagger = false

# Address defines the API server to listen on.
address = "tcp://0.0.0.0:1317"

# MaxOpenConnections defines the number of maximum open connections.
max-open-connections = 1000

# RPCReadTimeout defines the Tendermint RPC read timeout (in seconds).
rpc-read-timeout = 10

# RPCWriteTimeout defines the Tendermint RPC write timeout (in seconds).
rpc-write-timeout = 0

# RPCMaxBodyBytes defines the Tendermint maximum response body (in bytes).
rpc-max-body-bytes = 1000000

# EnableUnsafeCORS defines if CORS should be enabled (unsafe - use it at your own risk).
enabled-unsafe-cors = true

###############################################################################
###                           Rosetta Configuration                         ###
###############################################################################

[rosetta]

# Enable defines if the Rosetta API server should be enabled.
enable = false

# Address defines the Rosetta API server to listen on.
address = ":8080"

# Network defines the name of the blockchain that will be returned by Rosetta.
blockchain = "app"

# Network defines the name of the network that will be returned by Rosetta.
network = "network"

# Retries defines the number of retries when connecting to the node before failing.
retries = 3

# Offline defines if Rosetta server should run in offline mode.
offline = false

###############################################################################
###                           gRPC Configuration                            ###
###############################################################################

[grpc]

# Enable defines if the gRPC server should be enabled.
enable = true

# Address defines the gRPC server address to bind to.
address = "0.0.0.0:9090"

###############################################################################
###                        gRPC Web Configuration                           ###
###############################################################################

[grpc-web]

# GRPCWebEnable defines if the gRPC-web should be enabled.
# NOTE: gRPC must also be enabled, otherwise, this configuration is a no-op.
enable = true

# Address defines the gRPC-web server address to bind to.
address = "0.0.0.0:9091"

# EnableUnsafeCORS defines if CORS should be enabled (unsafe - use it at your own risk).
enable-unsafe-cors = false

###############################################################################
###                        State Sync Configuration                         ###
###############################################################################

# State sync snapshots allow other nodes to rapidly join the network without replaying historical
# blocks, instead downloading and applying a snapshot of the application state at a given height.
[state-sync]

# snapshot-interval specifies the block interval at which local state sync snapshots are
# taken (0 to disable). Must be a multiple of pruning-keep-every.
snapshot-interval = 0

# snapshot-keep-recent specifies the number of recent snapshots to keep and serve (0 to keep all).
snapshot-keep-recent = 2

###############################################################################
###                              State Streaming                            ###
###############################################################################

# Streaming allows nodes to stream state to external systems.
[streaming]

# ABCI defines the configuration for the ABCI streaming service.
[streaming.abci]

# The list of keys to stream out via gRPC.
keys = ["*"]

# The plugin name used for streaming via gRPC.
plugin = ""

# stop-node-on-stream-init-failure defines whether to stop the node when the streaming fails to initialize.
stop-node-on-stream-init-failure = false
APP_EOF

echo "🚀 Starting PersonaChain with full RPC configuration..."
nohup ./persona-chaind start \
    --home="$HOME/.personachain" \
    --rpc.laddr="tcp://0.0.0.0:26657" \
    --api.address="tcp://0.0.0.0:1317" \
    --grpc.address="0.0.0.0:9090" \
    --api.enable=true \
    --api.enabled-unsafe-cors=true \
    > "$HOME/.personachain/node.log" 2>&1 &

PID=$!
echo "🔢 PersonaChain PID: $PID"
echo "$PID" > "$HOME/.personachain/persona.pid"

echo "⏳ Waiting for PersonaChain to start..."
sleep 10

# Test if it's working
echo "🧪 Testing RPC endpoints..."
curl -s http://localhost:26657/status | head -3 || echo "RPC test failed"
curl -s http://localhost:1317/cosmos/base/tendermint/v1beta1/node_info | head -3 || echo "REST API test failed"

echo "📊 PersonaChain logs:"
tail -10 "$HOME/.personachain/node.log"

echo "✅ PersonaChain reconfigured for Keplr compatibility!"
EOF

echo "🎉 PersonaChain has been reconfigured with full RPC support!"
echo ""
echo "🧪 Testing the fix..."
sleep 5
curl -s "http://$GCP_IP:26657/abci_info" | head -3 || echo "abci_info test failed"
curl -s "http://$GCP_IP:1317/cosmos/base/tendermint/v1beta1/node_info" | head -3 || echo "node_info test failed"