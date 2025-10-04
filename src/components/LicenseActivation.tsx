// ============================================================================
// License Activation Component
// ============================================================================

import React, { useState } from 'react';
import { PrimaryButton } from '../shared/components/PrimaryButton';
import { TextField } from '../shared/components/TextField';

interface LicenseActivationProps {
  onActivationSuccess: () => void;
  onCancel?: () => void;
}

export const LicenseActivation: React.FC<LicenseActivationProps> = ({
  onActivationSuccess,
  onCancel,
}) => {
  const [email, setEmail] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleActivate = async () => {
    if (!email || !licenseKey) {
      setError('Please enter both email and license key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await window.electronAPI.license.activate(licenseKey.trim(), email.trim());

      if (result.success) {
        onActivationSuccess();
      } else {
        setError(result.error || 'Failed to activate license');
      }
    } catch (err: any) {
      setError(err?.message || 'Activation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleActivate();
    }
  };

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        padding: '48px 32px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: '600',
            color: 'var(--text-1)',
            marginBottom: '12px',
          }}
        >
          Activate Your License
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: 'var(--text-2)',
            lineHeight: '1.6',
          }}
        >
          Enter your email and license key to activate PDF AI Reader
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <TextField
          label="Email Address"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
      </div>

      <div style={{ marginBottom: '32px' }}>
        <TextField
          label="License Key"
          type="text"
          placeholder="PDFReader-xxxxxxxxxxxxxxxx"
          value={licenseKey}
          onChange={e => setLicenseKey(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#ef4444',
            fontSize: '14px',
            marginBottom: '24px',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <PrimaryButton onClick={handleActivate} disabled={loading} style={{ flex: 1 }}>
          {loading ? 'Activating...' : 'Activate License'}
        </PrimaryButton>

        {onCancel && (
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: '500',
              border: '1px solid var(--stroke-1)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--surface-2)',
              color: 'var(--text-1)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
        )}
      </div>

      <div
        style={{
          marginTop: '32px',
          padding: '16px',
          backgroundColor: 'var(--surface-2)',
          borderRadius: 'var(--radius-md)',
          fontSize: '13px',
          color: 'var(--text-2)',
          lineHeight: '1.6',
        }}
      >
        <strong>Need a license?</strong>
        <br />
        If you haven't purchased yet, you can buy a license from the welcome screen.
      </div>
    </div>
  );
};
