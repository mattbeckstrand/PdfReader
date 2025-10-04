// ============================================================================
// Supabase Client - Frontend
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'] as string;
const supabaseAnonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  throw new Error('Supabase configuration missing. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: window.localStorage, // Explicit storage for Electron
  },
});

// ============================================================================
// Types
// ============================================================================

export interface Subscription {
  id: string;
  user_id: string;
  email: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}
