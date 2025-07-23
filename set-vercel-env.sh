#!/bin/bash

# Set Vercel environment variables for production (fixed to avoid newlines)

echo "Setting VITE_BLOCKCHAIN_RPC..."
printf "https://personachain-prod.uc.r.appspot.com" | npx vercel env add VITE_BLOCKCHAIN_RPC production

echo "Setting VITE_BLOCKCHAIN_REST..."
printf "https://personachain-prod.uc.r.appspot.com/api" | npx vercel env add VITE_BLOCKCHAIN_REST production

echo "Setting VITE_CHAIN_ID..."
printf "personachain-1" | npx vercel env add VITE_CHAIN_ID production

echo "Setting VITE_BLOCKCHAIN_NETWORK..."
printf "personachain" | npx vercel env add VITE_BLOCKCHAIN_NETWORK production

echo "✅ All environment variables set!"