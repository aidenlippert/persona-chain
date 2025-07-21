#!/bin/bash
# Deploy a SIMPLE working PersonaChain blockchain with RPC endpoints for Keplr
# Focus on getting endpoints working first, then optimize

set -e

echo "🚀 DEPLOYING SIMPLE PERSONACHAIN FOR KEPLR"
echo "=========================================="

# Configuration
CHAIN_ID="persona-chain-1"
MONIKER="personachain-simple"
HOME_DIR="$HOME/.persona-chain-simple"
BINARY="./build/persona-chaind"

echo "✅ Using binary: $BINARY"
echo "🏠 Home: $HOME_DIR"
echo "🔗 Chain ID: $CHAIN_ID"

# Clean up
rm -rf "$HOME_DIR"
pkill -f persona-chaind || true
sleep 2

# Initialize
echo "📦 Initializing..."
$BINARY init "$MONIKER" --chain-id "$CHAIN_ID" --home "$HOME_DIR"

# Create a working genesis file manually with minimal configuration
echo "📄 Creating minimal working genesis..."
cat > "$HOME_DIR/config/genesis.json" << EOF
{
  "genesis_time": "$(date -u +%Y-%m-%dT%H:%M:%S.000000000Z)",
  "chain_id": "$CHAIN_ID",
  "initial_height": "1",
  "consensus_params": {
    "block": {
      "max_bytes": "22020096",
      "max_gas": "-1"
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
      "accounts": []
    },
    "authz": {
      "authorization": []
    },
    "bank": {
      "params": {
        "send_enabled": [],
        "default_send_enabled": true
      },
      "balances": [],
      "supply": [],
      "denom_metadata": [],
      "send_enabled": []
    },
    "consensus": null,
    "crisis": {
      "constant_fee": {
        "denom": "stake",
        "amount": "1000"
      }
    },
    "distribution": {
      "params": {
        "community_tax": "0.020000000000000000",
        "base_proposer_reward": "0.000000000000000000",
        "bonus_proposer_reward": "0.000000000000000000",
        "withdraw_addr_enabled": true
      },
      "fee_pool": {
        "community_pool": []
      },
      "delegator_withdraw_infos": [],
      "previous_proposer": "",
      "outstanding_rewards": [],
      "validator_accumulated_commissions": [],
      "validator_historical_rewards": [],
      "validator_current_rewards": [],
      "delegator_starting_infos": [],
      "validator_slash_events": []
    },
    "feegrant": {
      "allowances": []
    },
    "genutil": {
      "gen_txs": []
    },
    "gov": {
      "starting_proposal_id": "1",
      "deposits": [],
      "votes": [],
      "proposals": [],
      "params": {
        "min_deposit": [{"denom": "stake", "amount": "10000000"}],
        "max_deposit_period": "172800s",
        "voting_period": "172800s",
        "quorum": "0.334000000000000000",
        "threshold": "0.500000000000000000",
        "veto_threshold": "0.334000000000000000",
        "min_initial_deposit_ratio": "0.000000000000000000",
        "proposal_cancel_ratio": "0.500000000000000000",
        "proposal_cancel_dest": "",
        "expedited_voting_period": "86400s",
        "expedited_threshold": "0.667000000000000000",
        "expedited_min_deposit": [{"denom": "stake", "amount": "50000000"}],
        "burn_vote_quorum": false,
        "burn_proposal_deposit_prevote": false,
        "burn_vote_veto": true,
        "min_deposit_ratio": "0.010000000000000000"
      },
      "constitution": ""
    },
    "mint": {
      "minter": {
        "inflation": "0.130000000000000000",
        "annual_provisions": "0.000000000000000000"
      },
      "params": {
        "mint_denom": "stake",
        "inflation_rate_change": "0.130000000000000000",
        "inflation_max": "0.200000000000000000",
        "inflation_min": "0.070000000000000000",
        "goal_bonded": "0.670000000000000000",
        "blocks_per_year": "6311520"
      }
    },
    "params": null,
    "slashing": {
      "params": {
        "signed_blocks_window": "100",
        "min_signed_per_window": "0.500000000000000000",
        "downtime_jail_duration": "600s",
        "slash_fraction_double_sign": "0.050000000000000000",
        "slash_fraction_downtime": "0.010000000000000000"
      },
      "signing_infos": [],
      "missed_blocks": []
    },
    "staking": {
      "params": {
        "unbonding_time": "1814400s",
        "max_validators": 100,
        "max_entries": 7,
        "historical_entries": 10000,
        "bond_denom": "stake",
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
    "upgrade": {},
    "vesting": {}
  },
  "validators": []
}
EOF

# Configure for public access
CONFIG_FILE="$HOME_DIR/config/config.toml"
APP_FILE="$HOME_DIR/config/app.toml"

echo "⚙️ Configuring for public access..."

# API configuration
sed -i 's/enable = false/enable = true/g' "$APP_FILE" 2>/dev/null || true
sed -i 's/address = "tcp:\/\/localhost:1317"/address = "tcp:\/\/0.0.0.0:1317"/g' "$APP_FILE" 2>/dev/null || true
sed -i 's/enabled-unsafe-cors = false/enabled-unsafe-cors = true/g' "$APP_FILE" 2>/dev/null || true

# RPC configuration  
sed -i 's/laddr = "tcp:\/\/127.0.0.1:26657"/laddr = "tcp:\/\/0.0.0.0:26657"/g' "$CONFIG_FILE" 2>/dev/null || true
sed -i 's/cors_allowed_origins = \[\]/cors_allowed_origins = ["*"]/g' "$CONFIG_FILE" 2>/dev/null || true

# Make blockchain non-validating for now
sed -i 's/create_empty_blocks = true/create_empty_blocks = false/g' "$CONFIG_FILE" 2>/dev/null || true

echo "🌐 Starting blockchain..."
nohup $BINARY start --home "$HOME_DIR" --minimum-gas-prices="0stake" > blockchain-simple.log 2>&1 &
BLOCKCHAIN_PID=$!

echo "📋 PID: $BLOCKCHAIN_PID"
echo "📜 Logs: tail -f blockchain-simple.log"

# Wait and test
echo "⏳ Waiting for startup..."
sleep 8

echo "🧪 Testing endpoints..."
for i in {1..15}; do
    if curl -s http://localhost:26657/status > /dev/null 2>&1; then
        echo "✅ RPC responding!"
        break
    fi
    echo "⏳ Attempt $i/15..."
    sleep 2
done

# Test all endpoints
echo ""
echo "🔍 Testing Keplr endpoints:"

echo -n "📊 /status: "
if curl -s http://localhost:26657/status > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
fi

echo -n "📋 /abci_info: "
if curl -s http://localhost:26657/abci_info > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
fi

echo -n "🧬 /genesis: "
if curl -s http://localhost:26657/genesis > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
fi

echo -n "🌐 /health: "
if curl -s http://localhost:26657/health > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
fi

echo ""
echo "🎉 SIMPLE PERSONACHAIN DEPLOYED!"
echo ""
echo "🔗 RPC: http://localhost:26657"
echo "🔗 API: http://localhost:1317"
echo "🔗 Status: http://localhost:26657/status"
echo ""
echo "🛠️ Management:"
echo "   Stop: kill $BLOCKCHAIN_PID"
echo "   Logs: tail -f blockchain-simple.log"
echo ""

# Show final status
echo "📊 Node Info:"
curl -s http://localhost:26657/status 2>/dev/null | jq '.result.node_info' 2>/dev/null || echo "Getting node info..."

echo ""
echo "✅ Ready for Keplr testing!"