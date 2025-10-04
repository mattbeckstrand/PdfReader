// ============================================================================
// Database Layer - SQLite for license management
// ============================================================================

import Database from 'better-sqlite3';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import type { LicenseRecord } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/licenses.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// ============================================================================
// Schema
// ============================================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS licenses (
    id TEXT PRIMARY KEY,
    license_key TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    stripe_customer_id TEXT,
    stripe_payment_intent_id TEXT,
    plan TEXT NOT NULL CHECK(plan IN ('lifetime', 'monthly', 'yearly')),
    status TEXT NOT NULL CHECK(status IN ('active', 'cancelled', 'expired')),
    activated_at TEXT,
    expires_at TEXT,
    device_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_license_key ON licenses(license_key);
  CREATE INDEX IF NOT EXISTS idx_email ON licenses(email);
  CREATE INDEX IF NOT EXISTS idx_stripe_customer ON licenses(stripe_customer_id);
`);

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Create a new license
 */
export function createLicense(data: {
  id: string;
  licenseKey: string;
  email: string;
  plan: 'lifetime' | 'monthly' | 'yearly';
  stripeCustomerId?: string;
  stripePaymentIntentId?: string;
}): LicenseRecord {
  const expiresAt = data.plan === 'lifetime' ? null : getExpirationDate(data.plan);

  const stmt = db.prepare(`
    INSERT INTO licenses (
      id, license_key, email, stripe_customer_id, stripe_payment_intent_id,
      plan, status, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  stmt.run(
    data.id,
    data.licenseKey,
    data.email,
    data.stripeCustomerId || null,
    data.stripePaymentIntentId || null,
    data.plan,
    expiresAt
  );

  return getLicenseByKey(data.licenseKey)!;
}

/**
 * Get license by key
 */
export function getLicenseByKey(licenseKey: string): LicenseRecord | null {
  const stmt = db.prepare('SELECT * FROM licenses WHERE license_key = ?');
  const row = stmt.get(licenseKey) as any;

  if (!row) return null;

  return {
    id: row.id,
    licenseKey: row.license_key,
    email: row.email,
    stripeCustomerId: row.stripe_customer_id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    plan: row.plan,
    status: row.status,
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    deviceId: row.device_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get most recent license by email
 */
export function getLicenseByEmail(email: string): LicenseRecord | null {
  const stmt = db.prepare(
    'SELECT * FROM licenses WHERE email = ? ORDER BY created_at DESC LIMIT 1'
  );
  const row = stmt.get(email) as any;

  if (!row) return null;

  return {
    id: row.id,
    licenseKey: row.license_key,
    email: row.email,
    stripeCustomerId: row.stripe_customer_id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    plan: row.plan,
    status: row.status,
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    deviceId: row.device_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Activate license for a device
 */
export function activateLicense(licenseKey: string, deviceId: string): boolean {
  const stmt = db.prepare(`
    UPDATE licenses
    SET device_id = ?, activated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE license_key = ? AND (device_id IS NULL OR device_id = ?)
  `);

  const result = stmt.run(deviceId, licenseKey, deviceId);
  return result.changes > 0;
}

/**
 * Update license status
 */
export function updateLicenseStatus(
  licenseKey: string,
  status: 'active' | 'cancelled' | 'expired'
): boolean {
  const stmt = db.prepare(`
    UPDATE licenses
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE license_key = ?
  `);

  const result = stmt.run(status, licenseKey);
  return result.changes > 0;
}

/**
 * Check if license is valid
 */
export function isLicenseValid(license: LicenseRecord): boolean {
  if (license.status !== 'active') return false;

  // Lifetime licenses don't expire
  if (license.plan === 'lifetime') return true;

  // Check expiration
  if (license.expiresAt) {
    const expiryDate = new Date(license.expiresAt);
    return expiryDate > new Date();
  }

  return false;
}

// ============================================================================
// Helpers
// ============================================================================

function getExpirationDate(plan: 'monthly' | 'yearly'): string {
  const now = new Date();
  if (plan === 'monthly') {
    now.setMonth(now.getMonth() + 1);
  } else if (plan === 'yearly') {
    now.setFullYear(now.getFullYear() + 1);
  }
  return now.toISOString();
}

// ============================================================================
// Export database instance for advanced queries
// ============================================================================

export { db };
