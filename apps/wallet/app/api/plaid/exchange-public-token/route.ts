import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { public_token: _public_token, user_id } = body;

    // Mock Plaid public token exchange
    // In production, this would use the Plaid API
    const exchangeResult = {
      access_token: `access-sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      item_id: `item-${Math.random().toString(36).substr(2, 9)}`,
      request_id: `req-${Math.random().toString(36).substr(2, 9)}`,
    };

    // Mock fetching account data
    const accountData = {
      accounts: [
        {
          account_id: 'account_1',
          balances: {
            available: 1500.00,
            current: 1500.00,
            limit: null,
            iso_currency_code: 'USD',
          },
          mask: '1234',
          name: 'Chase Checking',
          official_name: 'Chase Bank Checking Account',
          subtype: 'checking',
          type: 'depository',
        },
        {
          account_id: 'account_2',
          balances: {
            available: 5000.00,
            current: 5000.00,
            limit: null,
            iso_currency_code: 'USD',
          },
          mask: '5678',
          name: 'Chase Savings',
          official_name: 'Chase Bank Savings Account',
          subtype: 'savings',
          type: 'depository',
        },
      ],
      item: {
        item_id: exchangeResult.item_id,
        institution_id: 'ins_56',
        webhook: 'https://personapass.xyz/api/plaid/webhook',
      },
    };

    // Mock identity data
    const identityData = {
      identity: {
        addresses: [
          {
            primary: true,
            data: {
              street: '123 Main St',
              city: 'San Francisco',
              region: 'CA',
              postal_code: '94102',
              country: 'US',
            },
          },
        ],
        emails: [
          {
            primary: true,
            data: 'user@example.com',
            type: 'primary',
          },
        ],
        names: [
          {
            primary: true,
            data: 'John Doe',
          },
        ],
        phone_numbers: [
          {
            primary: true,
            data: '+1-555-123-4567',
            type: 'home',
          },
        ],
      },
    };

    // Mock income data
    const incomeData = {
      income: {
        income_streams: [
          {
            confidence: 0.95,
            days: 730,
            monthly_income: 5000,
            name: 'TECH CORP',
          },
        ],
        last_year_income: 60000,
        last_year_income_before_tax: 75000,
        max_number_of_overlapping_income_streams: 1,
        number_of_income_streams: 1,
        projected_yearly_income: 60000,
        projected_yearly_income_before_tax: 75000,
      },
    };

    const result = {
      ...exchangeResult,
      accounts: accountData.accounts,
      identity: identityData.identity,
      income: incomeData.income,
      user_id,
    };

    console.log('Exchanged Plaid public token:', { 
      user_id, 
      access_token: exchangeResult.access_token,
      item_id: exchangeResult.item_id 
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error exchanging Plaid public token:', error);
    return NextResponse.json(
      { error: 'Failed to exchange public token' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Plaid token exchange endpoint is ready',
    timestamp: new Date().toISOString()
  });
}