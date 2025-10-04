// ============================================================================
// Stripe Configuration
// ============================================================================

import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('❌ STRIPE_SECRET_KEY is not set in environment variables');
  process.exit(1);
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

// ============================================================================
// Product Configuration
// ============================================================================

/**
 * Stripe Price IDs for your products
 * Create these in your Stripe Dashboard under Products
 */
export const STRIPE_PRICES = {
  lifetime: process.env.STRIPE_PRICE_LIFETIME || 'price_xxx', // Replace with actual price ID
  monthly: process.env.STRIPE_PRICE_MONTHLY || 'price_yyy',
  yearly: process.env.STRIPE_PRICE_YEARLY || 'price_zzz',
} as const;

/**
 * Map price IDs back to plan names
 */
export function getPlanFromPriceId(priceId: string): 'lifetime' | 'monthly' | 'yearly' | null {
  if (priceId === STRIPE_PRICES.lifetime) return 'lifetime';
  if (priceId === STRIPE_PRICES.monthly) return 'monthly';
  if (priceId === STRIPE_PRICES.yearly) return 'yearly';
  return null;
}

/**
 * Webhook signature verification
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET is not set');
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return null;
  }
}
