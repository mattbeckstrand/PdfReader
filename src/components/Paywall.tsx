// ============================================================================
// Paywall Component - Purchase Screen
// ============================================================================

import React, { useEffect, useState } from 'react';
import { PrimaryButton } from '../shared/components/PrimaryButton';
import { TextField } from '../shared/components/TextField';

interface PaywallProps {
  onHaveLicense: () => void;
  userEmail?: string;
  onSignOut?: () => void;
}

// Stripe Price IDs - Update these with your actual Stripe Price IDs
const PRICE_IDS = {
  lifetime: import.meta.env.VITE_STRIPE_PRICE_LIFETIME || 'price_xxx',
  // monthly: import.meta.env.VITE_STRIPE_PRICE_MONTHLY || 'price_yyy',
  // yearly: import.meta.env.VITE_STRIPE_PRICE_YEARLY || 'price_zzz',
};

export const Paywall: React.FC<PaywallProps> = ({ onHaveLicense, userEmail, onSignOut }) => {
  const [email, setEmail] = useState(userEmail || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Update email if userEmail prop changes
  useEffect(() => {
    if (userEmail) {
      setEmail(userEmail);
    }
  }, [userEmail]);

  // Listen for checkout completion
  useEffect(() => {
    const handleCheckoutComplete = (data: { success: boolean }) => {
      setLoading(false);
      if (data.success) {
        setSuccess(true);
      }
    };

    // Note: This requires adding the listener in preload.ts
    // For now, we'll handle it manually
    return () => {};
  }, []);

  const handlePurchase = async (priceId: string) => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await window.electronAPI.license.createCheckout(priceId, email.trim());

      if (!result.success) {
        setError(result.error || 'Failed to create checkout');
        setLoading(false);
        return;
      }

      // Modal opens automatically
      // Wait a bit for user to complete payment, then poll for license
      await pollForLicenseAndActivate(email.trim());
    } catch (err: any) {
      setError(err?.message || 'Checkout failed');
      setLoading(false);
    }
  };

  /**
   * Poll backend for subscription creation and trigger reload
   */
  const pollForLicenseAndActivate = async (userEmail: string) => {
    // Give user time to complete payment (poll for 2 minutes max)
    const maxAttempts = 24; // 24 attempts * 5 seconds = 2 minutes
    let attempts = 0;

    const poll = async (): Promise<void> => {
      attempts++;

      try {
        // Check if subscription was created for this email
        const response = await fetch(
          `${
            import.meta.env['VITE_BACKEND_API_URL'] || 'http://localhost:3001'
          }/api/subscription/by-email/${encodeURIComponent(userEmail)}`
        );

        const result = await response.json();

        if (result.active && result.hasSubscription) {
          console.log('🎫 Subscription found! Activating...');
          setSuccess(true);
          setLoading(false);

          // Reload the app to check subscription status
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }

        // Subscription not ready yet, try again
        if (attempts < maxAttempts) {
          console.log(`⏳ Polling attempt ${attempts}/${maxAttempts}...`);
          setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          setError(
            'Payment processing is taking longer than expected. Please refresh the page in a moment.'
          );
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error polling for subscription:', err);
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setError('Failed to verify subscription. Please refresh the page.');
          setLoading(false);
        }
      }
    };

    // Start polling after 3 seconds (give webhook time to fire)
    setTimeout(poll, 3000);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      <div style={{ maxWidth: '640px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1
            style={{
              fontSize: '36px',
              fontWeight: '700',
              color: 'var(--text-1)',
              marginBottom: '16px',
            }}
          >
            PDF AI Reader
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: 'var(--text-2)',
              lineHeight: '1.6',
            }}
          >
            An AI-native PDF reader where the AI lives inside the document
          </p>
          {userEmail && (
            <div
              style={{
                marginTop: '12px',
                fontSize: '14px',
                color: 'var(--text-3)',
              }}
            >
              Signed in as: {userEmail}
              {onSignOut && (
                <>
                  {' · '}
                  <button
                    onClick={onSignOut}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: '14px',
                    }}
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Pricing Card */}
        <div
          style={{
            backgroundColor: 'var(--surface-2)',
            border: '2px solid var(--stroke-1)',
            borderRadius: 'var(--radius-lg)',
            padding: '40px',
            marginBottom: '32px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div
              style={{
                fontSize: '48px',
                fontWeight: '700',
                color: 'var(--text-1)',
                marginBottom: '8px',
              }}
            >
              $49
            </div>
            <div
              style={{
                fontSize: '16px',
                color: 'var(--text-2)',
                fontWeight: '500',
              }}
            >
              Lifetime License
            </div>
          </div>

          {/* Features */}
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              marginBottom: '32px',
            }}
          >
            {[
              'Highlight text and ask AI questions',
              'Context-aware responses using vector search',
              'Support for equations and diagrams',
              'Works offline (internet only for AI)',
              'All future updates included',
              'One-time payment, no subscription',
            ].map((feature, i) => (
              <li
                key={i}
                style={{
                  padding: '12px 0',
                  fontSize: '15px',
                  color: 'var(--text-1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ color: 'var(--accent)', fontSize: '18px' }}>✓</span>
                {feature}
              </li>
            ))}
          </ul>

          {/* Email Input - Read-only if user is signed in */}
          {!userEmail && (
            <div style={{ marginBottom: '20px' }}>
              <TextField
                label="Email Address"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={setEmail}
                disabled={loading}
              />
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-3)',
                  marginTop: '8px',
                }}
              >
                Subscription will be linked to this email
              </div>
            </div>
          )}

          {success && (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#22c55e',
                fontSize: '14px',
                marginBottom: '20px',
                lineHeight: '1.6',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
              <strong>Payment Successful!</strong>
              <br />
              Your subscription has been activated.
              <br />
              <div style={{ marginTop: '12px', fontSize: '13px', opacity: 0.8 }}>
                Unlocking app in 2 seconds...
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#ef4444',
                fontSize: '14px',
                marginBottom: '20px',
              }}
            >
              {error}
            </div>
          )}

          {/* Purchase Button */}
          <PrimaryButton
            onClick={() => handlePurchase(PRICE_IDS.lifetime)}
            disabled={loading || !email}
            style={{ width: '100%', padding: '16px' }}
          >
            {loading ? 'Processing Payment...' : 'Purchase Now'}
          </PrimaryButton>

          {loading && (
            <div
              style={{
                marginTop: '16px',
                textAlign: 'center',
                fontSize: '13px',
                color: 'var(--text-3)',
              }}
            >
              Complete payment in the popup window. Your app will unlock automatically!
            </div>
          )}
        </div>

        {/* Already Subscribed */}
        {userEmail && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={onHaveLicense}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Already subscribed? Refresh status
            </button>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: '48px',
            padding: '24px',
            backgroundColor: 'var(--surface-2)',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            color: 'var(--text-3)',
            textAlign: 'center',
            lineHeight: '1.6',
          }}
        >
          <p style={{ margin: 0 }}>
            Secure payment powered by Stripe
            <br />
            30-day money-back guarantee
          </p>
        </div>
      </div>
    </div>
  );
};
