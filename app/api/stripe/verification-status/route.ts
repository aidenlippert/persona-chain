import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-10-28.acacia',
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Retrieve verification session
    const verificationSession = await stripe.identity.verificationSessions.retrieve(sessionId);

    // Extract verification data if available
    let verificationData = null;
    if (verificationSession.status === 'verified' && verificationSession.verified_outputs) {
      verificationData = {
        documentType: verificationSession.verified_outputs.document?.type,
        documentNumber: verificationSession.verified_outputs.document?.number,
        name: verificationSession.verified_outputs.name,
        dateOfBirth: verificationSession.verified_outputs.dob,
        address: verificationSession.verified_outputs.address,
        idNumber: verificationSession.verified_outputs.id_number,
        // Don't include sensitive data in response
      };
    }

    return NextResponse.json({
      status: verificationSession.status,
      verificationData,
      sessionId: verificationSession.id,
      createdAt: verificationSession.created,
      lastError: verificationSession.last_error
    });

  } catch (error) {
    console.error('Error retrieving verification session:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve verification status' },
      { status: 500 }
    );
  }
}