import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Plaid webhook endpoint is ready',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhook_type, webhook_code, item_id, error, new_accounts, removed_accounts } = body;

    console.log('Plaid webhook received:', { webhook_type, webhook_code, item_id });

    // Handle different webhook types
    switch (webhook_type) {
      case 'TRANSACTIONS':
        switch (webhook_code) {
          case 'SYNC_UPDATES_AVAILABLE':
            console.log('New transactions available for item:', item_id);
            // TODO: Sync new transactions for user
            break;
          case 'DEFAULT_UPDATE':
            console.log('Default transaction update for item:', item_id);
            // TODO: Update existing transactions
            break;
          case 'INITIAL_UPDATE':
            console.log('Initial transaction update for item:', item_id);
            // TODO: Process initial transaction batch
            break;
          case 'HISTORICAL_UPDATE':
            console.log('Historical transaction update for item:', item_id);
            // TODO: Process historical transactions
            break;
        }
        break;

      case 'ITEM':
        switch (webhook_code) {
          case 'WEBHOOK_UPDATE_ACKNOWLEDGED':
            console.log('Webhook update acknowledged for item:', item_id);
            break;
          case 'ERROR':
            console.log('Item error:', { item_id, error });
            // TODO: Handle item errors, notify user
            break;
          case 'PENDING_EXPIRATION':
            console.log('Item pending expiration:', item_id);
            // TODO: Notify user to re-authenticate
            break;
          case 'NEW_ACCOUNTS_AVAILABLE':
            console.log('New accounts available:', { item_id, new_accounts });
            // TODO: Fetch and add new accounts
            break;
        }
        break;

      case 'AUTH':
        switch (webhook_code) {
          case 'AUTOMATICALLY_VERIFIED':
            console.log('Auth automatically verified for item:', item_id);
            // TODO: Mark account as verified
            break;
          case 'VERIFICATION_EXPIRED':
            console.log('Auth verification expired for item:', item_id);
            // TODO: Request re-verification
            break;
        }
        break;

      case 'ASSETS':
        switch (webhook_code) {
          case 'PRODUCT_READY':
            console.log('Asset report ready for item:', item_id);
            // TODO: Generate asset verification proof
            break;
          case 'ERROR':
            console.log('Asset report error:', { item_id, error });
            // TODO: Handle asset report errors
            break;
        }
        break;

      case 'IDENTITY':
        switch (webhook_code) {
          case 'PRODUCT_READY':
            console.log('Identity data ready for item:', item_id);
            // TODO: Generate identity verification proof
            break;
          case 'ERROR':
            console.log('Identity verification error:', { item_id, error });
            // TODO: Handle identity verification errors
            break;
        }
        break;

      case 'INCOME':
        switch (webhook_code) {
          case 'PRODUCT_READY':
            console.log('Income verification ready for item:', item_id);
            // TODO: Generate income verification proof
            break;
          case 'ERROR':
            console.log('Income verification error:', { item_id, error });
            // TODO: Handle income verification errors
            break;
        }
        break;

      case 'LIABILITIES':
        switch (webhook_code) {
          case 'PRODUCT_READY':
            console.log('Liabilities data ready for item:', item_id);
            // TODO: Generate debt verification proof
            break;
        }
        break;

      default:
        console.log(`Unhandled webhook type: ${webhook_type}`);
    }

    return NextResponse.json({ acknowledged: true });
  } catch (error) {
    console.error('Plaid webhook handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}