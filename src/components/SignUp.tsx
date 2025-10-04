// ============================================================================
// Sign Up Component - Modern, State-of-the-Art Design
// ============================================================================

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { PrimaryButton } from '../shared/components/PrimaryButton';
import { TextField } from '../shared/components/TextField';
import { AppleLogo } from './AppleLogo';

interface SignUpProps {
  onSignUp: (email: string, password: string) => Promise<{ error: any }>;
  onSwitchToSignIn: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onSignUp, onSwitchToSignIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmMessage, setShowConfirmMessage] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Listen for OAuth callback from modal
  React.useEffect(() => {
    const cleanup = window.electronAPI.system.onOAuthCallback(async ({ url }) => {
      console.log('🔄 OAuth callback received:', url);

      // Extract tokens from URL hash
      const hashParams = new URLSearchParams(url.split('#')[1]);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        // Set session in Supabase
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        console.log('✅ OAuth session set successfully');
        setLoading(false);
        // useAuth hook will detect the session change and parent will handle navigation
      }
    });

    return cleanup;
  }, []);

  const handleSubmit = async () => {
    setError('');

    // Validation
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const result = await onSignUp(email.trim(), password);

      if (result.error) {
        setError(result.error.message || 'Failed to create account');
      } else {
        // Check if email confirmation is required
        // Supabase returns user but NO session if confirmation is required
        const hasSession = result.data?.session !== null;

        if (!hasSession) {
          // Email confirmation required
          setShowConfirmMessage(true);
        }
        // If hasSession, parent component handles navigation to paywall
      }
    } catch (err: any) {
      setError(err?.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit();
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true, // Get URL without auto-opening
        },
      });

      if (oauthError) {
        setError(oauthError.message || 'Apple Sign In failed');
        setLoading(false);
        return;
      }

      // Open OAuth URL in Electron modal
      if (data?.url) {
        await window.electronAPI.system.openOAuthModal(data.url);
      }

      // After OAuth completes, useAuth will detect session change
    } catch (err: any) {
      setError(err?.message || 'Apple Sign In failed');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      <div style={{ maxWidth: '400px', width: '100%' }}>
        {/* Logo/Brand */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div
            style={{
              fontSize: '40px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, var(--accent) 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px',
              letterSpacing: '-0.02em',
            }}
          >
            PDF AI Reader
          </div>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--text-3)',
              fontWeight: '400',
            }}
          >
            Create your account
          </p>
        </div>

        {/* Email form (replaces social buttons when active) */}
        {showEmailForm && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <div style={{ marginBottom: '16px' }}>
              <TextField
                label="Email Address"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={setEmail}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <TextField
                label="Password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={setPassword}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <TextField
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
            </div>

            <PrimaryButton
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 20px',
                marginBottom: '12px',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
              }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </PrimaryButton>

            {/* Back button under submit */}
            <button
              onClick={() => setShowEmailForm(false)}
              disabled={loading}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--text-3)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                padding: '8px 0',
                marginBottom: '16px',
                opacity: loading ? 0.5 : 1,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => {
                if (!loading) e.currentTarget.style.color = 'var(--text-1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-3)';
              }}
            >
              ← Back to other options
            </button>
          </div>
        )}

        {showConfirmMessage && (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#3b82f6',
              fontSize: '14px',
              marginBottom: '20px',
              lineHeight: '1.6',
            }}
          >
            <strong>📧 Check Your Email!</strong>
            <br />
            We sent a confirmation link to <strong>{email}</strong>
            <br />
            Click the link to verify your account, then return here to sign in.
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

        {!showConfirmMessage && !showEmailForm && (
          <>
            {/* Apple Sign In Button - Primary CTA */}
            <button
              onClick={handleAppleSignIn}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 20px',
                fontSize: '15px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '12px',
                backgroundColor: '#000',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginBottom: '16px',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                }
              }}
              onMouseLeave={e => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              <AppleLogo size={18} color="#ffffff" />
              Continue with Apple
            </button>

            {/* Email Sign Up - Secondary Option */}
            <button
              onClick={() => setShowEmailForm(true)}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 20px',
                fontSize: '15px',
                fontWeight: '500',
                border: '1px solid var(--stroke-1)',
                borderRadius: '12px',
                backgroundColor: 'var(--surface-2)',
                color: 'var(--text-1)',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'var(--surface-3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={e => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              Sign up with Email
            </button>
          </>
        )}

        {/* Sign In Link - Always visible unless showing confirmation */}
        {!showConfirmMessage && (
          <div
            style={{
              textAlign: 'center',
              paddingTop: '20px',
            }}
          >
            <span style={{ fontSize: '14px', color: 'var(--text-3)' }}>
              Already have an account?{' '}
            </span>
            <button
              onClick={onSwitchToSignIn}
              disabled={loading}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => {
                if (!loading) e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              Sign in
            </button>
          </div>
        )}

        {showConfirmMessage && (
          <div style={{ textAlign: 'center' }}>
            <PrimaryButton onClick={onSwitchToSignIn} style={{ width: '100%' }}>
              Go to Sign In
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
};
