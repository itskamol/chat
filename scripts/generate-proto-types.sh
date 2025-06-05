#!/bin/bash

# Script to generate TypeScript types from proto files
PROTO_DIR="protos"
OUT_DIR="apps/chat-service/src/app/grpc/generated"

# Create output directory if it doesn't exist
mkdir -p $OUT_DIR

echo "Generating TypeScript types from proto files..."

# Generate types using grpc_tools_node_protoc
npx grpc_tools_node_protoc \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
  --ts_out=grpc_js:$OUT_DIR \
  --js_out=import_style=commonjs,binary:$OUT_DIR \
  --grpc_out=grpc_js:$OUT_DIR \
  --proto_path=$PROTO_DIR \
  $PROTO_DIR/*.proto

echo "TypeScript types generated successfully in $OUT_DIR"
