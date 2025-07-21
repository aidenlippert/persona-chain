# PersonaPass Identity Wallet - Project Architecture

## Overview
PersonaPass is a sophisticated decentralized identity (DID) wallet built as a Progressive Web App (PWA) with enterprise-grade security features. The project creates a comprehensive Web3 identity platform running on Cosmos SDK with Google Cloud deployment.

## Technology Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + PWA
- **State Management**: Zustand + React Query + IndexedDB (Dexie)
- **Identity**: W3C VC/VP + DID + OpenID4VP/VCI + EUDI Compliance
- **Security**: WebAuthn + ZK Proofs + Ed25519 + AES-GCM
- **Blockchain**: Cosmos SDK + CosmWasm + Keplr Integration
- **Testing**: Vitest + Playwright + Testing Library

## Project Structure
```
persona-chain/
├── apps/wallet/                 # Main PWA application
│   ├── src/
│   │   ├── components/         # 40+ React components
│   │   ├── services/          # 31 specialized services
│   │   ├── stores/            # State management
│   │   └── tests/             # Test suite
│   ├── api/                   # Serverless API endpoints
│   └── dist/                  # Production build
├── contracts/                 # CosmWasm smart contracts
├── x/                        # Cosmos SDK modules
└── circuits/                 # ZK proof circuits
```

## Core Services
- **cryptoService**: Ed25519/secp256k1 key generation
- **didService**: DID document management
- **zkProofService**: Zero-knowledge proof generation
- **webauthnService**: FIDO2 passkey authentication
- **keplrService**: Cosmos blockchain integration
- **githubVCService**: GitHub credential connector
- **linkedinVCService**: LinkedIn credential connector
- **plaidVCService**: Plaid financial data connector

## Security Implementation
- WebAuthn/FIDO2 primary authentication
- Ed25519 for signing, secp256k1 for blockchain
- AES-256-GCM encryption with PBKDF2
- ZK proofs for privacy-preserving verification
- HSM integration capability

## Standards Compliance
- W3C DID Core specification
- W3C Verifiable Credentials
- OpenID4VP/VCI protocols
- EUDI compliance for EU Digital Identity Wallet
- FIDO2/WebAuthn standards