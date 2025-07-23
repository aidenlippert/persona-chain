import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-10-28.acacia',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function GET() {
  return NextResponse.json({ 
    message: 'Stripe webhook endpoint is ready',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = headers();
    const sig = headersList.get('stripe-signature');

    if (!sig) {
      return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'identity.verification_session.created': {
        const sessionCreated = event.data.object as Stripe.Identity.VerificationSession;
        console.log('Verification session created:', sessionCreated.id);
        // TODO: Update user status to "verification_started"
        break;
      }

      case 'identity.verification_session.processing': {
        const sessionProcessing = event.data.object as Stripe.Identity.VerificationSession;
        console.log('Verification session processing:', sessionProcessing.id);
        // TODO: Update user status to "verification_processing"
        break;
      }

      case 'identity.verification_session.verified': {
        const sessionVerified = event.data.object as Stripe.Identity.VerificationSession;
        console.log('Verification session verified:', sessionVerified.id);
        // TODO: Update user credentials, mark as verified
        // TODO: Trigger ZKP generation for identity proof
        break;
      }

      case 'identity.verification_session.requires_input': {
        const sessionRequiresInput = event.data.object as Stripe.Identity.VerificationSession;
        console.log('Verification session requires input:', sessionRequiresInput.id);
        // TODO: Notify user of required input
        break;
      }

      case 'identity.verification_session.canceled': {
        const sessionCanceled = event.data.object as Stripe.Identity.VerificationSession;
        console.log('Verification session canceled:', sessionCanceled.id);
        // TODO: Update user status to "verification_canceled"
        break;
      }

      case 'identity.verification_session.redacted': {
        const sessionRedacted = event.data.object as Stripe.Identity.VerificationSession;
        console.log('Verification session redacted:', sessionRedacted.id);
        // TODO: Clean up user data per privacy requirements
        break;
      }

      case 'customer.created': {
        const customerCreated = event.data.object as Stripe.Customer;
        console.log('Customer created:', customerCreated.id);
        // TODO: Link Stripe customer to PersonaPass user
        break;
      }

      case 'customer.updated': {
        const customerUpdated = event.data.object as Stripe.Customer;
        console.log('Customer updated:', customerUpdated.id);
        // TODO: Sync customer data with PersonaPass user
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentSucceeded = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentSucceeded.id);
        // TODO: Activate premium features, update subscription
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentFailed = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentFailed.id);
        // TODO: Handle payment failure, retry logic
        break;
      }

      case 'charge.succeeded': {
        const chargeSucceeded = event.data.object as Stripe.Charge;
        console.log('Charge succeeded:', chargeSucceeded.id);
        // TODO: Record successful charge for billing
        break;
      }

      case 'charge.failed': {
        const chargeFailed = event.data.object as Stripe.Charge;
        console.log('Charge failed:', chargeFailed.id);
        // TODO: Handle charge failure
        break;
      }

      case 'charge.dispute.created': {
        const disputeCreated = event.data.object as Stripe.Charge;
        console.log('Dispute created:', disputeCreated.id);
        // TODO: Handle chargeback dispute
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}