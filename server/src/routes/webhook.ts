// ============================================================================
// Webhook Route - Handle Stripe Payment Events
// ============================================================================

import { Router } from 'express';
import type Stripe from 'stripe';
import { constructWebhookEvent } from '../stripe.js';
import { supabase } from '../supabase.js';

const router = Router();

/**
 * POST /api/webhook
 * Handle Stripe webhook events
 * IMPORTANT: This must use raw body, not JSON parsed
 */
router.post('/', async (req, res) => {
  console.log('🎯 Webhook endpoint HIT');

  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    console.log('❌ No signature provided');
    return res.status(400).send('No signature provided');
  }

  // Construct event from raw body
  const event = constructWebhookEvent(req.body, signature);

  if (!event) {
    console.log('❌ Invalid signature');
    return res.status(400).send('Invalid signature');
  }

  console.log('🔔 Webhook received:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log('⚠️ Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    res.status(500).send('Webhook handler failed');
  }
});

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle successful checkout
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('✅ Checkout completed:', session.id);

  const email = session.customer_email || session.customer_details?.email;
  const plan = session.metadata?.plan as 'lifetime' | 'monthly' | 'yearly';

  if (!email) {
    console.error('❌ Missing email in session');
    return;
  }

  console.log('🔍 Looking up user by email:', email);

  // Find user in Supabase by email (more efficient approach)
  // Note: Supabase doesn't have direct "getUserByEmail" in auth API
  // So we check if a subscription already exists, or list users (small user base)
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('email', email)
    .limit(1)
    .single();

  let userId: string;

  if (existingSub) {
    userId = existingSub.user_id;
    console.log('✅ Found existing user via subscription:', userId);
  } else {
    // No subscription yet, need to find user in auth
    // For small user bases, listing is fine. For scale, consider using Supabase Edge Functions
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      console.error('❌ Failed to fetch users:', userError);
      return;
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
      console.error('❌ No Supabase user found for email:', email);
      console.log('💡 User must sign up before purchasing');
      return;
    }

    userId = user.id;
    console.log('✅ Found user:', userId);
  }

  // Get subscription ID from session
  const subscriptionId = session.subscription as string;

  // Determine expiration for subscriptions (monthly/yearly)
  let currentPeriodEnd = null;
  if (plan === 'monthly' || plan === 'yearly') {
    const now = new Date();
    if (plan === 'monthly') {
      now.setMonth(now.getMonth() + 1);
    } else {
      now.setFullYear(now.getFullYear() + 1);
    }
    currentPeriodEnd = now.toISOString();
  }

  // Create subscription record in Supabase
  const { error: insertError } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      email: email,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      plan: plan || 'monthly',
      status: 'active',
      current_period_end: currentPeriodEnd,
    })
    .select(); // Add .select() to return the created record

  if (insertError) {
    console.error('❌ Failed to create subscription record:', insertError);
    return;
  }

  console.log('🎫 Subscription created for user:', userId);
  console.log('📧 User:', email, '| Plan:', plan);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('🚫 Subscription cancelled:', subscription.id);

  // Mark subscription as cancelled in Supabase
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('❌ Failed to cancel subscription:', error);
  } else {
    console.log('✅ Subscription marked as cancelled');
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('❌ Payment failed:', invoice.id);

  const subscriptionId = invoice.subscription as string;

  if (subscriptionId) {
    // Mark subscription as potentially at risk
    // Don't immediately cancel - Stripe will retry
    console.log('⚠️ Payment failed for subscription:', subscriptionId);
    // You can add grace period logic here
  }
}

export default router;
