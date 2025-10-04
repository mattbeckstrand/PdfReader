-- ============================================================================
-- Fix Supabase Subscriptions Table
-- ============================================================================

-- Drop existing table if it has issues
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- Recreate with proper schema
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL CHECK(plan IN ('monthly', 'yearly', 'lifetime')),
  status TEXT NOT NULL CHECK(status IN ('active', 'cancelled', 'expired')) DEFAULT 'active',
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for faster lookups
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_email ON public.subscriptions(email);
CREATE INDEX idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can do anything (for webhooks)
CREATE POLICY "Service role has full access"
  ON public.subscriptions
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.subscriptions TO service_role;
GRANT SELECT ON public.subscriptions TO anon;
GRANT SELECT ON public.subscriptions TO authenticated;

