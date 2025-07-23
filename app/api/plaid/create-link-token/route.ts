import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, client_name: _client_name, products: _products, country_codes: _country_codes, language: _language, webhook: _webhook } = body;

    // Mock Plaid link token creation
    // In production, this would use the Plaid API
    const linkToken = {
      link_token: `link-sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      request_id: `req-${Math.random().toString(36).substr(2, 9)}`,
    };

    console.log('Created Plaid link token:', { user_id, link_token: linkToken.link_token });

    return NextResponse.json(linkToken);
  } catch (error) {
    console.error('Error creating Plaid link token:', error);
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Plaid link token endpoint is ready',
    timestamp: new Date().toISOString()
  });
}