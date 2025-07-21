#!/bin/bash

# Generate protobuf files for persona-chain

set -eo pipefail

# Ensure the script is run from the correct directory
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "Generating protobuf files..."

# Generate Go protobuf files
protoc \
  --gocosmos_out=. \
  --gocosmos_opt=paths=source_relative \
  --grpc-gateway_out=. \
  --grpc-gateway_opt=paths=source_relative \
  --proto_path=proto \
  --proto_path=third_party/proto \
  proto/persona_chain/did/v1/*.proto \
  proto/persona_chain/vc/v1/*.proto \
  proto/persona_chain/zk/v1/*.proto \
  proto/persona_chain/guardian/v1/*.proto

echo "Protobuf generation complete!"