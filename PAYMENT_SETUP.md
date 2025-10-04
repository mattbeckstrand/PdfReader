# 💳 Payment System Setup Guide

This guide walks you through setting up Stripe payments and the license system for PDF AI Reader.

## 🏗️ Architecture Overview

The payment system uses:

- **Stripe Checkout** - Hosted payment page
- **License Key System** - Simple activation flow
- **Backend API** - Node.js/Express server for Stripe integration
- **Local License Storage** - Stored in Electron's userData folder

## 📋 Prerequisites

1. **Stripe Account** - [Sign up at stripe.com](https://dashboard.stripe.com/register)
2. **Node.js 18+** - For running the backend server
3. **Hosting** - For the backend API (Vercel, Railway, Fly.io, etc.)

---

## 🚀 Step 1: Stripe Configuration

### 1.1 Create Stripe Products

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click **+ Add product**
3. Create your product(s):

**Example: Lifetime License**

- Name: `PDF AI Reader - Lifetime License`
- Description: `One-time payment for lifetime access`
- Pricing: `One time` → `$49.00 USD`
- Copy the **Price ID** (looks like `price_1Abc...`)

**Optional: Subscription Plans**

- Monthly: `Recurring` → `$4.99/month`
- Yearly: `Recurring` → `$39.99/year`

### 1.2 Get API Keys

1. Go to [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Publishable key** and **Secret key**
3. **Important:** Start with **test mode** keys (prefix `pk_test_` and `sk_test_`)

### 1.3 Set Up Webhooks

Webhooks notify your backend when payments succeed.

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **+ Add endpoint**
3. Enter your endpoint URL:
   - Development: Use [Stripe CLI](https://stripe.com/docs/stripe-cli) for local testing
   - Production: `https://your-api-domain.com/api/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.deleted` (if using subscriptions)
   - `invoice.payment_failed` (if using subscriptions)
5. Copy the **Signing secret** (looks like `whsec_...`)

---

## 🖥️ Step 2: Backend Setup

### 2.1 Install Dependencies

```bash
cd server
npm install
```

### 2.2 Configure Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Edit `server/.env`:

```env
PORT=3001
DATABASE_PATH=./data/licenses.db

# Stripe Keys (use test keys initially)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (from Step 1.1)
STRIPE_PRICE_LIFETIME=price_1Abc...
STRIPE_PRICE_MONTHLY=price_1Def...
STRIPE_PRICE_YEARLY=price_1Ghi...

# Your app/website URL
APP_URL=https://your-website.com
```

### 2.3 Run Backend Locally

```bash
npm run dev
```

Server should start at `http://localhost:3001`

### 2.4 Test Webhook Locally (Development)

Install Stripe CLI:

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from https://stripe.com/docs/stripe-cli
```

Forward webhooks to local server:

```bash
stripe listen --forward-to localhost:3001/api/webhook
```

This will give you a webhook signing secret like `whsec_...` - add it to your `.env` file.

---

## 🎨 Step 3: Frontend Configuration

### 3.1 Configure Environment

Edit the root `.env`:

```env
# Backend API URL
BACKEND_API_URL=http://localhost:3001

# Stripe Price ID for paywall
VITE_STRIPE_PRICE_LIFETIME=price_1Abc...
```

### 3.2 Update Pricing in Paywall

Edit `src/components/Paywall.tsx`:

```typescript
const PRICE_IDS = {
  lifetime: process.env.VITE_STRIPE_PRICE_LIFETIME || 'price_xxx',
  // Add more plans if needed
};
```

Update pricing display:

```typescript
<div style={{ fontSize: '48px', ... }}>
  $49  {/* Update to your actual price */}
</div>
```

### 3.3 Integrate Paywall in App

Add paywall check to your `App.tsx`:

```typescript
import { Paywall } from './components/Paywall';
import { LicenseActivation } from './components/LicenseActivation';
import { useEffect, useState } from 'react';

function App() {
  const [licenseValid, setLicenseValid] = useState<boolean | null>(null);
  const [showActivation, setShowActivation] = useState(false);

  // Check license on startup
  useEffect(() => {
    checkLicense();
  }, []);

  async function checkLicense() {
    try {
      const stored = await window.electronAPI.license.getStored();
      if (!stored) {
        setLicenseValid(false);
        return;
      }

      const status = await window.electronAPI.license.verify(stored.licenseKey);
      setLicenseValid(status.valid);
    } catch (error) {
      console.error('License check failed:', error);
      setLicenseValid(false);
    }
  }

  // Loading state
  if (licenseValid === null) {
    return <div>Loading...</div>;
  }

  // Show activation screen
  if (showActivation) {
    return (
      <LicenseActivation
        onActivationSuccess={() => {
          setLicenseValid(true);
          setShowActivation(false);
        }}
        onCancel={() => setShowActivation(false)}
      />
    );
  }

  // Show paywall if no valid license
  if (!licenseValid) {
    return <Paywall onHaveLicense={() => setShowActivation(true)} />;
  }

  // Your main app here
  return <YourMainApp />;
}
```

---

## 🧪 Step 4: Testing

### 4.1 Test Payment Flow

1. Start backend: `cd server && npm run dev`
2. Start Electron app: `npm run electron:dev`
3. You should see the paywall
4. Use [Stripe test cards](https://stripe.com/docs/testing):
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
5. Use any future expiry date and CVC

### 4.2 Verify License Generation

After successful payment:

1. Check backend logs for: `🎫 License created: PDFReader-...`
2. Check database: `sqlite3 server/data/licenses.db "SELECT * FROM licenses;"`
3. Verify license key is logged (in production, email it to user)

### 4.3 Test License Activation

1. Copy the license key from logs
2. Click "Already have a license?"
3. Enter email and license key
4. Should activate successfully and show main app

---

## 🚀 Step 5: Production Deployment

### 5.1 Deploy Backend

**Option A: Vercel (Recommended for quick start)**

```bash
cd server
npm install -g vercel
vercel
```

**Option B: Railway**

1. Create account at [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Add environment variables in Railway dashboard

**Option C: Fly.io**

```bash
fly launch
fly secrets set STRIPE_SECRET_KEY=sk_live_...
fly deploy
```

### 5.2 Update Production Webhooks

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Switch to **Live mode** (toggle in top-right)
3. Add endpoint with your production URL: `https://api.yourapp.com/api/webhook`
4. Update `server/.env` with live webhook secret

### 5.3 Switch to Live Stripe Keys

1. Get live keys from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Update `server/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_live_your_live_key
   STRIPE_WEBHOOK_SECRET=whsec_live_webhook_secret
   ```
3. Update Price IDs to live versions

### 5.4 Update Electron App

Update root `.env`:

```env
BACKEND_API_URL=https://api.yourapp.com
VITE_STRIPE_PRICE_LIFETIME=price_live_...
```

Build and distribute:

```bash
npm run build
npm run electron:build
```

---

## 📧 Step 6: Email License Keys

The webhook handler logs license keys but doesn't email them yet. Add email integration:

### Option A: SendGrid (Recommended)

```bash
cd server
npm install @sendgrid/mail
```

In `server/src/routes/webhook.ts`:

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

async function handleCheckoutCompleted(session) {
  // ... create license ...

  // Send email
  await sgMail.send({
    to: email,
    from: 'noreply@yourapp.com', // Must be verified in SendGrid
    subject: 'Your PDF AI Reader License Key',
    text: `Thank you for purchasing PDF AI Reader!

Your license key: ${licenseKey}

To activate:
1. Open PDF AI Reader
2. Click "Already have a license?"
3. Enter your email and license key

Questions? Reply to this email.`,
  });
}
```

### Option B: Resend

```bash
npm install resend
```

Similar implementation - see [Resend docs](https://resend.com/docs/send-with-nodejs).

---

## 🔒 Security Checklist

- [ ] Never expose `STRIPE_SECRET_KEY` in frontend code
- [ ] Verify webhook signatures (already implemented)
- [ ] Use HTTPS in production
- [ ] Store license keys securely (done - in Electron userData)
- [ ] Implement rate limiting on API endpoints (recommended)
- [ ] Set CORS_ORIGIN to your specific domain in production
- [ ] Enable Stripe's [radar rules](https://stripe.com/radar) for fraud prevention

---

## 🐛 Troubleshooting

### "Invalid signature" webhook error

- Verify `STRIPE_WEBHOOK_SECRET` matches your webhook
- Check raw body is being sent to webhook route
- Use `stripe listen` for local testing

### License activation fails

- Check backend server is running
- Verify `BACKEND_API_URL` in `.env`
- Check browser console for errors
- Verify license exists in database

### Payment succeeds but no license created

- Check webhook endpoint is accessible
- View webhook logs in Stripe Dashboard
- Verify events are being sent to correct URL

### Database errors

- Ensure `data/` folder exists in server directory
- Check write permissions
- Verify SQLite is installed

---

## 💰 Pricing Strategy Tips

**Lifetime License:**

- One-time payment, no recurring revenue
- Good for: Early access, indie pricing
- Suggested: $29-$99 depending on features

**Subscription:**

- Recurring revenue, easier forecasting
- Good for: Ongoing AI costs, continuous updates
- Suggested: $4.99/month or $39/year

**Hybrid:**

- Lifetime for higher price ($79)
- Subscription as affordable option ($5/month)

---

## 📚 Additional Resources

- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [License Key Generation Strategies](https://stackoverflow.com/questions/11949493/how-to-generate-a-random-product-key)

---

## 🤝 Need Help?

Common issues:

1. **Webhook not receiving events:** Use Stripe CLI for local testing
2. **License not activating:** Check backend logs and network requests
3. **Stripe test mode:** Make sure you're using test keys and test cards

Remember: Start with test mode, verify everything works, then switch to live mode!
