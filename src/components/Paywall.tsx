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
  lifetime: import.meta.env['VITE_STRIPE_PRICE_LIFETIME'] || 'price_xxx',
  // monthly: import.meta.env['VITE_STRIPE_PRICE_MONTHLY'] || 'price_yyy',
  // yearly: import.meta.env['VITE_STRIPE_PRICE_YEARLY'] || 'price_zzz',
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

  // Listen for checkout completion from Stripe modal
  useEffect(() => {
    // Check if we have the checkout complete listener
    if (!window.electronAPI?.system?.onCheckoutComplete) {
      console.log('⚠️ No checkout complete listener available');
      return () => {};
    }

    const cleanup = window.electronAPI.system.onCheckoutComplete((data: { success: boolean }) => {
      console.log('🎉 Checkout complete event received:', data);

      if (data.success) {
        // Show success message immediately
        setSuccess(true);
        setLoading(false);

        // Then start polling in background for subscription activation
        if (userEmail || email) {
          pollForLicenseAndActivate(userEmail || email);
        }
      } else {
        // Payment was cancelled
        setLoading(false);
        setError('Payment was cancelled');
      }
    });

    return cleanup;
  }, [userEmail, email]);

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
      // The checkout-complete listener will trigger polling when payment succeeds
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
          console.log('🎫 Subscription found! Reloading app...');

          // Reload the app to check subscription status
          // (Success message is already showing from checkout-complete event)
          setTimeout(() => {
            window.location.reload();
          }, 1500);
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
        padding: '32px 16px',
        backgroundColor: 'var(--bg)',
      }}
    >
      <div style={{ maxWidth: '480px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: '600',
              color: 'var(--text-1)',
              marginBottom: '12px',
              letterSpacing: '-0.02em',
            }}
          >
            Unlock PDF AI Reader
          </h1>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--text-2)',
              lineHeight: '1.5',
              margin: '0 auto',
              maxWidth: '400px',
            }}
          >
            AI-native PDF reader with contextual understanding
          </p>
          {userEmail && (
            <div
              style={{
                marginTop: '16px',
                fontSize: '13px',
                color: 'var(--text-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>{userEmail}</span>
              {onSignOut && (
                <>
                  <span style={{ opacity: 0.5 }}>•</span>
                  <button
                    onClick={onSignOut}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: '13px',
                      padding: 0,
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
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--stroke-1)',
            borderRadius: '16px',
            padding: '32px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Price */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '48px',
                  fontWeight: '700',
                  color: 'var(--text-1)',
                  letterSpacing: '-0.03em',
                }}
              >
                $15
              </span>
            </div>
            <div
              style={{
                fontSize: '14px',
                color: 'var(--text-2)',
                fontWeight: '500',
                marginTop: '4px',
              }}
            >
              Lifetime access • One-time payment
            </div>
          </div>

          {/* Success State - Show only success message */}
          {success ? (
            <div
              style={{
                padding: '32px 24px',
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#22c55e',
                  marginBottom: '8px',
                }}
              >
                Payment Successful!
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: 'var(--text-2)',
                  lineHeight: '1.5',
                }}
              >
                Your account has been activated.
                <br />
                <span style={{ opacity: 0.7 }}>Redirecting to your library...</span>
              </div>
              {/* Loading dots animation */}
              <div
                style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '6px' }}
              >
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#22c55e',
                      animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Features */}
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  marginBottom: '28px',
                }}
              >
                {[
                  'Ask AI about any highlighted text',
                  'Context-aware responses',
                  'Equation & diagram support',
                  'All future updates',
                ].map((feature, i) => (
                  <li
                    key={i}
                    style={{
                      padding: '10px 0',
                      fontSize: '14px',
                      color: 'var(--text-1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      style={{ flexShrink: 0 }}
                    >
                      <circle cx="8" cy="8" r="8" fill="var(--accent)" opacity="0.15" />
                      <path
                        d="M11 6L7 10L5 8"
                        stroke="var(--accent)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
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

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '10px',
                    color: '#ef4444',
                    fontSize: '14px',
                    marginBottom: '20px',
                    textAlign: 'center',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Purchase Button */}
              <PrimaryButton
                onClick={() => handlePurchase(PRICE_IDS.lifetime)}
                disabled={loading || !email}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: '600',
                }}
              >
                {loading ? 'Opening Checkout...' : 'Continue to Payment'}
              </PrimaryButton>

              {loading && (
                <div
                  style={{
                    marginTop: '12px',
                    textAlign: 'center',
                    fontSize: '13px',
                    color: 'var(--text-2)',
                    lineHeight: '1.4',
                  }}
                >
                  Complete payment in the popup window.
                  <br />
                  Your app will unlock automatically.
                </div>
              )}
            </>
          )}
        </div>

        {/* Trust Indicators */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            marginBottom: '20px',
            fontSize: '13px',
            color: 'var(--text-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1L10 5.5L15 6.5L11.5 10L12.5 15L8 12.5L3.5 15L4.5 10L1 6.5L6 5.5L8 1Z"
                fill="var(--text-3)"
                opacity="0.6"
              />
            </svg>
            <span>Powered by Stripe</span>
          </div>
          <span style={{ opacity: 0.5 }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2L3 5V7.5C3 11 5.5 13.5 8 14C10.5 13.5 13 11 13 7.5V5L8 2Z"
                stroke="var(--text-3)"
                strokeWidth="1.5"
                fill="none"
                opacity="0.6"
              />
            </svg>
            <span>Secure checkout</span>
          </div>
        </div>

        {/* Already Subscribed */}
        {userEmail && !success && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={onHaveLicense}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-3)',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '8px',
              }}
            >
              Already purchased? Refresh
            </button>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};
