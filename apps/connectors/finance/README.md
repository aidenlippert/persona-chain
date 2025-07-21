# PersonaPass Financial Connector

A comprehensive financial credentials connector that integrates with **Plaid** for banking data and **Credit Karma/Experian** for credit information, providing privacy-preserving commitments for all financial data.

## 🏦 Supported Integrations

### Banking Data (via Plaid)
- **Bank Accounts**: Checking, savings, credit cards, loans
- **Account Balances**: Current and available balances
- **Transactions**: Recent transaction history with categories
- **Institution Data**: Bank names and account metadata

### Credit Data (via Credit Karma & Experian)
- **Credit Scores**: FICO scores and ranges from multiple bureaus
- **Credit Reports**: Account history, inquiries, public records
- **Credit Factors**: Payment history, utilization, credit mix analysis

## 🔐 Privacy Features

- **Cryptographic Commitments**: All sensitive data is committed using SHA-256 hashing
- **Public Metadata**: Non-sensitive information available for verification
- **Merkle Trees**: Batch commitment support for multiple credentials
- **Zero-Knowledge Ready**: Commitments designed for ZK proof integration

## 🚀 Quick Start

### Installation

```bash
cd apps/connectors/finance
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your API credentials
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## 📡 API Endpoints

### Financial Credentials
- `GET /api/financial/credentials` - Fetch all financial commitments for a DID
- `POST /api/financial/verify` - Verify financial credential authenticity
- `GET /api/financial/status/:did` - Check connection status

### Plaid Integration
- `POST /api/financial/plaid/link-token` - Create Plaid Link token
- `POST /api/financial/plaid/exchange-token` - Exchange public token for access
- `DELETE /api/financial/plaid/revoke` - Revoke Plaid access

### Credit Integration
- `DELETE /api/financial/credit/revoke` - Revoke credit provider access

### OAuth Flows
- `GET /oauth/authorizeCredit` - Initiate credit provider OAuth
- `GET /oauth/authorizePlaid` - Redirect to Plaid Link flow
- `GET /oauth/callbackCredit` - Handle credit provider callbacks

## 🔑 Authentication Flow

### Plaid Banking Data

1. **Link Token Creation**: Frontend requests link token for DID
2. **Plaid Link**: User connects bank accounts via Plaid Link
3. **Token Exchange**: Public token exchanged for access token
4. **Data Fetching**: Banking data fetched and committed

### Credit Data

1. **OAuth Initiation**: User redirected to credit provider OAuth
2. **Authorization**: User grants permission for credit data access
3. **Token Storage**: Access tokens securely stored per DID
4. **Data Fetching**: Credit scores and reports fetched and committed

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Financial      │    │   External      │
│                 │    │   Connector      │    │   APIs          │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ Plaid Link      │───▶│ PlaidService     │───▶│ Plaid API       │
│ Credit OAuth    │───▶│ CreditService    │───▶│ Credit Karma    │
│ Commitment UI   │───▶│ CommitmentService│    │ Experian        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📊 Data Commitments

### Bank Account Commitment
```json
{
  "type": "bank_account",
  "accountType": "checking",
  "institutionName": "Chase Bank",
  "balance": 15420.50,
  "currency": "USD",
  "verified": true
}
```

### Credit Score Commitment
```json
{
  "type": "credit_score",
  "score": 742,
  "scoreRange": { "min": 300, "max": 850 },
  "provider": "credit_karma",
  "verified": true
}
```

### Transaction Commitment
```json
{
  "type": "transaction",
  "amount": 85.50,
  "currency": "USD",
  "category": ["Food and Drink"],
  "transactionType": "debit",
  "verified": true
}
```

## 🛡️ Security

- **OAuth 2.0**: Secure authorization flows for all providers
- **Token Encryption**: Access tokens encrypted in production
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configurable CORS for frontend integration
- **Helmet Security**: Security headers and CSP policies

## 🧪 Development Mode

In development mode, the connector provides mock data when external APIs are unavailable:

- **Mock Banking Data**: Sample accounts, transactions, balances
- **Mock Credit Data**: Sample credit scores and reports
- **Mock Tokens**: Placeholder tokens for testing flows

## 📈 Monitoring

- **Health Checks**: `/health` endpoint for service monitoring
- **Logging**: Structured logging with different levels
- **Error Handling**: Comprehensive error handling and reporting
- **Metrics**: Request/response metrics and performance tracking

## 🔧 Configuration

Key configuration options in `src/config/config.ts`:

- **API Credentials**: Plaid, Credit Karma, Experian API keys
- **Security Settings**: JWT secrets, CORS origins
- **Rate Limiting**: Request limits and windows
- **Environment**: Development/production settings

## 🏃‍♂️ Next Steps

This Financial Connector integrates seamlessly with:

1. **PersonaPass Backend**: Central commitment aggregation
2. **ZK Proof Circuits**: Privacy-preserving financial proofs
3. **Frontend Interface**: User-friendly financial credential management
4. **Other Connectors**: Cross-domain credential correlation