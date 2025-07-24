import { VercelRequest, VercelResponse } from '@vercel/node';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

// BigInt serialization fix
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

if (typeof BigInt.prototype.toJSON === 'undefined') {
  BigInt.prototype.toJSON = function() {
    return this.toString();
  };
}

// Initialize Plaid client
const plaidClient = new PlaidApi(
  new Configuration({
    basePath: process.env.PLAID_ENV === 'production' 
      ? PlaidEnvironments.production
      : process.env.PLAID_ENV === 'development'
      ? PlaidEnvironments.development  
      : PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
        'PLAID-SECRET': process.env.PLAID_SECRET || '',
      },
    },
  })
);

// Serialize BigInt for JSON responses
const serializeBigInt = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? `${value}n` : value
  ));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { public_token, metadata, user_id } = req.body;

    console.log('Plaid Token Exchange Request:', {
      hasPublicToken: !!public_token,
      userId: user_id,
      institutionName: metadata?.institution?.name,
      accountsCount: metadata?.accounts?.length
    });

    // Validate required parameters
    if (!public_token) {
      return res.status(400).json({
        error: 'Missing required parameter: public_token',
        code: 'MISSING_PUBLIC_TOKEN'
      });
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token
    });

    const { access_token, item_id } = exchangeResponse.data;

    console.log('Plaid Token Exchange Successful:', {
      hasAccessToken: !!access_token,
      itemId: item_id,
      requestId: exchangeResponse.data.request_id
    });

    // Get identity data
    const identityResponse = await plaidClient.identityGet({
      access_token
    });

    console.log('Plaid Identity Data Retrieved:', {
      accountsCount: identityResponse.data.accounts.length,
      requestId: identityResponse.data.request_id,
      itemId: identityResponse.data.item.item_id
    });

    // Note: Additional financial data endpoints would be added here
    // For now, focusing on identity data
    let additionalData = {
      hasIncome: false,
      hasAssets: false,
      note: 'Extended financial data will be integrated in next iteration'
    };

    // Create basic Plaid financial credential data
    const credentialData = {
      id: `plaid-${item_id}-${Date.now()}`,
      type: ['VerifiableCredential', 'FinancialIdentity'],
      issuer: 'did:persona:plaid',
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: `plaid:${item_id}`,
        accounts: identityResponse.data.accounts.map(account => ({
          accountId: account.account_id,
          name: account.name,
          type: account.type,
          subtype: account.subtype,
          balances: account.balances
        })),
        owners: identityResponse.data.accounts.flatMap(account => 
          account.owners?.map(owner => ({
            name: owner.names?.[0],
            addresses: owner.addresses,
            phoneNumbers: owner.phone_numbers,
            emails: owner.emails
          })) || []
        ),
        institution: {
          name: metadata?.institution?.name,
          id: metadata?.institution?.institution_id
        },
        verificationTimestamp: new Date().toISOString(),
        itemId: item_id
      },
      metadata: {
        provider: 'plaid',
        accountsCount: identityResponse.data.accounts.length,
        ...additionalData
      }
    };

    console.log('Plaid credential data prepared:', {
      credentialId: credentialData.id,
      accountsCount: identityResponse.data.accounts.length,
      institutionName: metadata?.institution?.name
    });

    // Return success response
    res.status(200).json({
      success: true,
      credential: credentialData,
      metadata: {
        institutionName: metadata?.institution?.name,
        accountsCount: identityResponse.data.accounts.length,
        itemId: item_id
      },
      request_id: identityResponse.data.request_id,
      message: 'Plaid financial credential created successfully'
    });

  } catch (error: any) {
    console.error('Plaid Token Exchange Error:', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    // Handle specific Plaid API errors
    if (error.response?.data?.error_code) {
      const plaidError = error.response.data;
      return res.status(400).json({
        error: plaidError.error_message || 'Plaid API error',
        code: plaidError.error_code,
        type: plaidError.error_type,
        request_id: plaidError.request_id
      });
    }

    res.status(500).json({
      error: 'Failed to process Plaid token exchange',
      code: 'PLAID_TOKEN_EXCHANGE_ERROR',
      message: error.message
    });
  }
}