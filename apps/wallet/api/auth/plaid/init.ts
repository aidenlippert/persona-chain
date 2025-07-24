import { VercelRequest, VercelResponse } from '@vercel/node';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

// BigInt serialization fix
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, client_name = 'PersonaPass Identity Wallet' } = req.body;

    // Validate required parameters
    if (!user_id) {
      return res.status(400).json({
        error: 'Missing required parameter: user_id',
        code: 'MISSING_USER_ID'
      });
    }

    console.log('Plaid Link Token Request:', {
      userId: user_id,
      clientName: client_name,
      environment: process.env.PLAID_ENV || 'sandbox',
      hasClientId: !!process.env.PLAID_CLIENT_ID,
      hasSecret: !!process.env.PLAID_SECRET
    });

    // Create link token for identity verification
    const linkTokenRequest = {
      user: {
        client_user_id: user_id
      },
      client_name: client_name,
      products: ['identity'], // Focus on identity verification
      country_codes: ['US'], // Start with US, can expand
      language: 'en',
      webhook: process.env.PLAID_WEBHOOK_URL || undefined,
      redirect_uri: process.env.PLAID_REDIRECT_URI || undefined,
      // Identity verification configuration
      identity_verification: {
        template_id: process.env.PLAID_IDENTITY_TEMPLATE_ID || undefined,
        gave_consent: true
      }
    };

    const linkTokenResponse = await plaidClient.linkTokenCreate(linkTokenRequest);

    console.log('Plaid Link Token Created:', {
      hasLinkToken: !!linkTokenResponse.data.link_token,
      expiration: linkTokenResponse.data.expiration,
      requestId: linkTokenResponse.data.request_id
    });

    // Return the link token to the frontend
    res.status(200).json({
      success: true,
      link_token: linkTokenResponse.data.link_token,
      expiration: linkTokenResponse.data.expiration,
      request_id: linkTokenResponse.data.request_id,
      message: 'Plaid Link token created successfully'
    });

  } catch (error: any) {
    console.error('Plaid Link Token Error:', {
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
      error: 'Failed to create Plaid Link token',
      code: 'PLAID_LINK_TOKEN_ERROR',
      message: error.message
    });
  }
}