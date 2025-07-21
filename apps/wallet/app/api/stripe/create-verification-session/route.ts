import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-10-28.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'document', metadata = {} } = body;

    // Create verification session
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: type, // 'document' or 'id_number'
      metadata: {
        ...metadata,
        app: 'PersonaPass',
        created_at: new Date().toISOString()
      },
      options: {
        document: {
          // Allow multiple document types
          allowed_types: ['driving_license', 'passport', 'id_card'],
          // Require live capture (prevents screenshots)
          require_live_capture: true,
          // Require ID number matching
          require_id_number: false,
          // Require address verification
          require_matching_selfie: true,
        },
      },
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/verification/complete`,
    });

    return NextResponse.json({
      client_secret: verificationSession.client_secret,
      url: verificationSession.url,
      id: verificationSession.id,
      status: verificationSession.status
    });

  } catch (error) {
    console.error('Error creating verification session:', error);
    return NextResponse.json(
      { error: 'Failed to create verification session' },
      { status: 500 }
    );
  }
}