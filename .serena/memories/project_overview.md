# PersonaPass Identity Wallet - Project Overview

## Purpose
PersonaPass is a comprehensive blockchain-based decentralized identity platform that provides:
- **Self-sovereign identity management** with W3C VC/VP compliance
- **Zero-knowledge proofs** for privacy-preserving verification
- **Guardian-based recovery** for secure account recovery
- **EUDI Wallet compliance** for European Digital Identity standards
- **Android Digital Credentials** system integration
- **WebAuthn/FIDO2** biometric authentication

## Architecture
- **Frontend**: React 18 + TypeScript PWA in `apps/wallet/`
- **Backend Services**: Multiple microservices in `apps/` directory
- **Blockchain**: Cosmos SDK-based chain in `x/` modules
- **Smart Contracts**: CosmWasm contracts in `contracts/`
- **ZK Circuits**: Circom circuits in `circuits/`

## Current Version
- **Version**: 1.0.0-rc1 (Release Candidate)
- **Status**: Production-ready but with TypeScript errors preventing build

## Key Technologies
- React 18, TypeScript, Vite, Tailwind CSS
- Zustand for state management
- React Query for server state
- WebAuthn, DIDComm, W3C Standards
- Zero-knowledge proofs (Groth16, PLONK, STARK)
- Progressive Web App (PWA) capabilities