# 💳 Payment Architecture - What Was Built

This document provides an overview of the complete payment and licensing system that was set up.

## 📁 Directory Structure

```
pdf-ai-reader-setup_clean/
├── server/                          # 🆕 Backend API Server
│   ├── src/
│   │   ├── index.ts                # Express server entry point
│   │   ├── database.ts             # SQLite database + license CRUD
│   │   ├── stripe.ts               # Stripe client configuration
│   │   └── routes/
│   │       ├── checkout.ts         # Create Stripe checkout sessions
│   │       ├── webhook.ts          # Handle Stripe payment events
│   │       └── license.ts          # Verify & activate licenses
│   ├── package.json                # Server dependencies
│   ├── tsconfig.json               # TypeScript config
│   └── README.md                   # API documentation
│
├── shared/                          # 🆕 Shared TypeScript Types
│   └── types.ts                    # License, Payment, API types
│
├── src/
│   └── components/
│       ├── Paywall.tsx             # 🆕 Purchase screen
│       └── LicenseActivation.tsx   # 🆕 License entry screen
│
├── electron/
│   ├── main.ts                     # ✏️ Updated with license IPC handlers
│   └── preload.ts                  # ✏️ Updated with license APIs
│
└── docs/                            # 🆕 Documentation
    ├── PAYMENT_SETUP.md            # Complete setup guide (production)
    ├── QUICK_START_PAYMENTS.md     # Fast local testing guide
    ├── ENV_TEMPLATE.md             # Environment variable reference
    └── PAYMENT_ARCHITECTURE.md     # This file
```

## 🏗️ System Components

### 1. Backend Server (`server/`)

**Technology:** Node.js + Express + TypeScript + SQLite

**Purpose:** Handle payments and license management securely

**Key Files:**

- `index.ts` - HTTP server, routes, middleware
- `database.ts` - SQLite schema and queries
- `stripe.ts` - Stripe API client
- `routes/checkout.ts` - Create payment sessions
- `routes/webhook.ts` - Process payment events
- `routes/license.ts` - Verify and activate licenses

**API Endpoints:**

```
POST /api/checkout           # Create Stripe checkout
POST /api/webhook            # Stripe webhook handler
POST /api/license/verify     # Check if license is valid
POST /api/license/activate   # Activate license for device
```

**Database Schema:**

```sql
licenses (
  id, license_key, email,
  stripe_customer_id, stripe_payment_intent_id,
  plan, status, activated_at, expires_at, device_id,
  created_at, updated_at
)
```

---

### 2. Shared Types (`shared/types.ts`)

**Purpose:** Type-safe communication between frontend and backend

**Interfaces:**

- `LicenseStatus` - License validity info
- `LicenseRecord` - Database record structure
- `ActivateLicenseRequest/Response` - Activation flow
- `CreateCheckoutRequest/Response` - Payment initiation

---

### 3. Electron Integration

**Updated Files:**

- `electron/main.ts` - Added license IPC handlers
- `electron/preload.ts` - Exposed license APIs to renderer

**New APIs:**

```typescript
window.electronAPI.license.verify(key);
window.electronAPI.license.activate(key, email);
window.electronAPI.license.getStored();
window.electronAPI.license.store(key, email);
window.electronAPI.license.clear();
window.electronAPI.license.createCheckout(priceId, email);
```

**Features:**

- Device ID generation (unique per installation)
- Local license storage (in Electron userData)
- Fetch-based API calls to backend
- Opens Stripe Checkout in browser

---

### 4. UI Components

#### `Paywall.tsx`

**Purpose:** Purchase screen shown to users without license

**Features:**

- Email input
- Pricing display
- "Purchase Now" button → Opens Stripe Checkout
- "Already have a license?" → Switch to activation

**Customization Points:**

- Update pricing ($49, $4.99/mo, etc.)
- Change feature list
- Update price IDs from `.env`

#### `LicenseActivation.tsx`

**Purpose:** License key entry screen

**Features:**

- Email + license key inputs
- Activation with backend API
- Error handling
- Success callback

---

## 🔄 Payment Flow

### User Flow (First Purchase)

```mermaid
User Opens App
    ↓
[Paywall Screen]
    ↓
Enter Email → Click "Purchase"
    ↓
Browser Opens (Stripe Checkout)
    ↓
Enter Card → Complete Payment
    ↓
[Stripe] → Webhook → [Backend Server]
    ↓
Backend Generates License Key
    ↓
[TODO: Email License to User]
    ↓
User Receives Email
    ↓
Returns to App → "Already have license?"
    ↓
[Activation Screen]
    ↓
Enter Email + Key → Activate
    ↓
Backend Validates + Stores Device ID
    ↓
Electron Stores License Locally
    ↓
✅ User Can Use App
```

### Subsequent Launches

```mermaid
User Opens App
    ↓
Read Stored License
    ↓
Verify with Backend API
    ↓
Valid? → ✅ Open App
Invalid? → 🚫 Show Paywall
```

---

## 🔐 Security Features

### ✅ Implemented

1. **No Stripe Keys in Frontend**

   - All Stripe operations in backend
   - Frontend only knows price IDs

2. **Webhook Signature Verification**

   - Prevents fake payment events
   - Implemented in `webhook.ts`

3. **Device Binding**

   - Each license tied to one device ID
   - Prevents license sharing
   - Device ID stored locally

4. **Secure IPC**

   - Context isolation enabled
   - No direct Node.js access from renderer
   - Typed APIs via preload script

5. **Local License Storage**
   - Stored in Electron userData folder
   - Not accessible from outside app

### 🔒 Production Recommendations

1. **Enable HTTPS** - Use SSL certificates
2. **Set CORS Origin** - Restrict to your domain
3. **Rate Limiting** - Prevent API abuse
4. **Stripe Radar** - Fraud detection
5. **Code Signing** - Sign Electron app for distribution

---

## 💰 Pricing Models Supported

### Lifetime License (Implemented)

- One-time payment
- No expiration
- Simplest to manage

### Monthly/Yearly Subscription (Ready)

- Database supports expiration dates
- Stripe Checkout supports subscriptions
- Need to add renewal checks

---

## 🧪 Testing Strategy

### Local Development

1. Use Stripe test mode
2. Stripe CLI for webhooks
3. Test cards: `4242 4242 4242 4242`
4. Backend + Electron both running locally

### Pre-Production

1. Deploy backend to staging
2. Use live Stripe test keys
3. Test with real payment flow
4. Verify email delivery

### Production

1. Switch to live Stripe keys
2. Update webhook endpoints
3. Deploy backend to production
4. Build and sign Electron app

---

## 📊 Database Management

### Querying Licenses

```bash
# Connect to database
sqlite3 server/data/licenses.db

# View all licenses
SELECT * FROM licenses;

# Check active licenses
SELECT email, license_key, plan, status FROM licenses WHERE status = 'active';

# Find specific license
SELECT * FROM licenses WHERE email = 'user@example.com';
```

### Backup

```bash
# Backup database
cp server/data/licenses.db server/data/licenses.backup.db

# Or use SQLite dump
sqlite3 server/data/licenses.db .dump > backup.sql
```

---

## 🚀 Deployment Checklist

### Backend Deployment

- [ ] Choose hosting (Vercel/Railway/Fly.io)
- [ ] Set environment variables
- [ ] Deploy server
- [ ] Get production URL
- [ ] Update webhook endpoint in Stripe
- [ ] Test with live keys
- [ ] Set up monitoring

### Frontend Updates

- [ ] Update `BACKEND_API_URL` to production
- [ ] Update Stripe price IDs to live versions
- [ ] Build Electron app
- [ ] Code sign app (macOS/Windows)
- [ ] Test license activation
- [ ] Distribute app

### Email Integration

- [ ] Choose service (SendGrid/Resend)
- [ ] Get API key
- [ ] Update webhook handler
- [ ] Test email delivery
- [ ] Set up email templates

---

## 🎯 Next Steps

### Immediate (To Go Live)

1. **Get Stripe Account**

   - Sign up at stripe.com
   - Create products
   - Get API keys

2. **Deploy Backend**

   - Choose hosting provider
   - Set environment variables
   - Deploy and test

3. **Add Email Integration**

   - Sign up for SendGrid/Resend
   - Update webhook handler
   - Test license delivery

4. **Build and Distribute App**
   - Update environment for production
   - Build Electron app
   - Code sign
   - Distribute

### Future Enhancements

1. **Analytics**

   - Track purchases
   - Monitor active users
   - Revenue reporting

2. **Admin Dashboard**

   - View licenses
   - Refund handling
   - User support tools

3. **Trial Period**

   - 7-day free trial
   - Feature gating
   - Trial-to-paid conversion

4. **Team Licenses**
   - Multi-device support
   - Team management
   - Bulk pricing

---

## 📚 Documentation Reference

- `QUICK_START_PAYMENTS.md` - Get started in 30 minutes
- `PAYMENT_SETUP.md` - Complete production guide
- `ENV_TEMPLATE.md` - Environment variables
- `server/README.md` - Backend API docs

---

## 🤝 Support

If you get stuck:

1. Check the troubleshooting sections in docs
2. Review Stripe Dashboard logs
3. Check backend server logs
4. Verify environment variables
5. Test with Stripe CLI locally

Common issues are documented in `QUICK_START_PAYMENTS.md`
