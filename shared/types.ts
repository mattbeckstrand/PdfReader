// ============================================================================
// Shared Types - Used by both Electron app and backend server
// ============================================================================

/**
 * License status returned from server
 */
export interface LicenseStatus {
  valid: boolean;
  email?: string;
  activatedAt?: string;
  expiresAt?: string | null; // null = lifetime license
  plan?: 'lifetime' | 'monthly' | 'yearly';
  error?: string;
}

/**
 * License activation request
 */
export interface ActivateLicenseRequest {
  licenseKey: string;
  email: string;
  deviceId: string; // Unique identifier for this device
}

/**
 * License activation response
 */
export interface ActivateLicenseResponse {
  success: boolean;
  license?: LicenseStatus;
  error?: string;
}

/**
 * Stripe checkout session request
 */
export interface CreateCheckoutRequest {
  priceId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Stripe checkout session response
 */
export interface CreateCheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
}

/**
 * License record stored in database
 */
export interface LicenseRecord {
  id: string;
  licenseKey: string;
  email: string;
  stripeCustomerId?: string;
  stripePaymentIntentId?: string;
  plan: 'lifetime' | 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  activatedAt?: string;
  expiresAt?: string | null;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}
