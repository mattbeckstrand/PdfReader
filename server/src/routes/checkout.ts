// ============================================================================
// Checkout Route - Create Stripe Checkout Session
// ============================================================================

import { Router } from 'express';
import type { CreateCheckoutRequest, CreateCheckoutResponse } from '../../../shared/types.js';
import { getPlanFromPriceId, stripe } from '../stripe.js';

const router = Router();

/**
 * POST /api/checkout
 * Create a Stripe Checkout session
 */
router.post('/checkout', async (req, res) => {
  try {
    const { priceId, email, successUrl, cancelUrl } = req.body as CreateCheckoutRequest;

    // Validate inputs
    if (!priceId || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: priceId, email',
      } as CreateCheckoutResponse);
    }

    // Validate price ID
    const plan = getPlanFromPriceId(priceId);

    // If plan not found in our config, assume it's a subscription (safer default)
    const detectedPlan = plan || 'monthly';

    console.log('💳 Creating Stripe checkout session:', { email, plan: detectedPlan });

    // Determine mode - fetch price details from Stripe to be certain
    let mode: 'payment' | 'subscription' = 'subscription';

    try {
      const price = await stripe.prices.retrieve(priceId);
      mode = price.type === 'one_time' ? 'payment' : 'subscription';
      console.log('✅ Detected price type from Stripe:', price.type, '→ mode:', mode);
    } catch (err) {
      console.warn('⚠️ Could not fetch price details, defaulting to subscription mode');
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: mode,
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.APP_URL}/cancel`,
      metadata: {
        plan: detectedPlan,
        email,
      },
    });

    console.log('✅ Checkout session created:', session.id);

    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    } as CreateCheckoutResponse);
  } catch (error: any) {
    console.error('❌ Checkout error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to create checkout session',
    } as CreateCheckoutResponse);
  }
});

export default router;
