// ============================================================================
// Subscription Routes - Check and Manage User Subscriptions
// ============================================================================

import { Router } from 'express';
import { supabase } from '../supabase.js';

const router = Router();

/**
 * GET /api/subscription/status
 * Check if user has an active subscription
 * Requires: Authorization header with Supabase JWT token
 */
router.get('/subscription/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        active: false,
        error: 'No authorization token provided',
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        active: false,
        error: 'Invalid token',
      });
    }

    console.log('🔍 Checking subscription for user:', user.email);

    // Get user's subscription from Supabase
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError || !subscription) {
      console.log('❌ No active subscription found');
      return res.json({
        active: false,
        error: 'No active subscription',
      });
    }

    // Check if subscription is expired
    const now = new Date();
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : null;

    const isExpired = periodEnd && periodEnd < now;

    if (isExpired) {
      console.log('❌ Subscription expired');
      // Update status to expired
      await supabase.from('subscriptions').update({ status: 'expired' }).eq('id', subscription.id);

      return res.json({
        active: false,
        error: 'Subscription expired',
      });
    }

    console.log('✅ Active subscription found:', subscription.plan);

    res.json({
      active: true,
      plan: subscription.plan,
      expiresAt: subscription.current_period_end,
      stripeSubscriptionId: subscription.stripe_subscription_id,
    });
  } catch (error: any) {
    console.error('❌ Subscription check error:', error);
    res.status(500).json({
      active: false,
      error: 'Failed to check subscription',
    });
  }
});

/**
 * GET /api/subscription/by-email/:email
 * Check if an email has an active subscription (for auto-activation)
 */
router.get('/subscription/by-email/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        active: false,
        error: 'Email required',
      });
    }

    console.log('🔍 Checking subscription by email:', email);

    // Get subscription by email
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('email', email)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError || !subscription) {
      return res.json({
        active: false,
        hasSubscription: false,
      });
    }

    res.json({
      active: true,
      hasSubscription: true,
      plan: subscription.plan,
    });
  } catch (error: any) {
    console.error('❌ Email subscription check error:', error);
    res.status(500).json({
      active: false,
      error: 'Failed to check subscription',
    });
  }
});

export default router;
