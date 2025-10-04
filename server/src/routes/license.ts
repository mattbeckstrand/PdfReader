// ============================================================================
// License Routes - Verify and Activate Licenses
// ============================================================================

import { Router } from 'express';
import type {
  ActivateLicenseRequest,
  ActivateLicenseResponse,
  LicenseStatus,
} from '../../../shared/types.js';
import {
  activateLicense,
  getLicenseByEmail,
  getLicenseByKey,
  isLicenseValid,
} from '../database.js';

const router = Router();

/**
 * POST /api/license/verify
 * Verify if a license key is valid
 */
router.post('/license/verify', (req, res) => {
  try {
    const { licenseKey } = req.body;

    if (!licenseKey) {
      return res.status(400).json({
        valid: false,
        error: 'License key is required',
      } as LicenseStatus);
    }

    const license = getLicenseByKey(licenseKey);

    if (!license) {
      return res.json({
        valid: false,
        error: 'Invalid license key',
      } as LicenseStatus);
    }

    const valid = isLicenseValid(license);

    res.json({
      valid,
      email: license.email,
      activatedAt: license.activatedAt || undefined,
      expiresAt: license.expiresAt || undefined,
      plan: license.plan,
      error: valid ? undefined : 'License expired or inactive',
    } as LicenseStatus);
  } catch (error: any) {
    console.error('❌ Verify error:', error);
    res.status(500).json({
      valid: false,
      error: 'Verification failed',
    } as LicenseStatus);
  }
});

/**
 * POST /api/license/activate
 * Activate a license for a specific device
 */
router.post('/license/activate', (req, res) => {
  try {
    const { licenseKey, email, deviceId } = req.body as ActivateLicenseRequest;

    if (!licenseKey || !email || !deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      } as ActivateLicenseResponse);
    }

    const license = getLicenseByKey(licenseKey);

    if (!license) {
      return res.json({
        success: false,
        error: 'Invalid license key',
      } as ActivateLicenseResponse);
    }

    // Verify email matches
    if (license.email !== email) {
      return res.json({
        success: false,
        error: 'Email does not match license',
      } as ActivateLicenseResponse);
    }

    // Check if license is valid
    if (!isLicenseValid(license)) {
      return res.json({
        success: false,
        error: 'License is expired or inactive',
      } as ActivateLicenseResponse);
    }

    // Check if already activated on different device
    if (license.deviceId && license.deviceId !== deviceId) {
      return res.json({
        success: false,
        error: 'License already activated on another device',
      } as ActivateLicenseResponse);
    }

    // Activate license
    const activated = activateLicense(licenseKey, deviceId);

    if (!activated) {
      return res.json({
        success: false,
        error: 'Failed to activate license',
      } as ActivateLicenseResponse);
    }

    // Get updated license
    const updatedLicense = getLicenseByKey(licenseKey)!;

    res.json({
      success: true,
      license: {
        valid: true,
        email: updatedLicense.email,
        activatedAt: updatedLicense.activatedAt || undefined,
        expiresAt: updatedLicense.expiresAt || undefined,
        plan: updatedLicense.plan,
      },
    } as ActivateLicenseResponse);
  } catch (error: any) {
    console.error('❌ Activate error:', error);
    res.status(500).json({
      success: false,
      error: 'Activation failed',
    } as ActivateLicenseResponse);
  }
});

/**
 * GET /api/license/by-email/:email
 * Get the most recent license for an email (for auto-activation after payment)
 */
router.get('/license/by-email/:email', (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    // Get most recent active license for this email
    const license = getLicenseByEmail(email);

    if (!license) {
      return res.json({
        success: false,
        error: 'No license found for this email',
      });
    }

    res.json({
      success: true,
      licenseKey: license.licenseKey,
      email: license.email,
      plan: license.plan,
    });
  } catch (error: any) {
    console.error('❌ Get license error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get license',
    });
  }
});

export default router;
