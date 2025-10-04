# PDF AI Reader - Backend Server

License management and payment processing backend for PDF AI Reader.

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Stripe keys

# Run dev server
npm run dev
```

Server runs on `http://localhost:3001`

### Production

```bash
# Build TypeScript
npm run build

# Start server
npm start
```

## 📡 API Endpoints

### POST `/api/checkout`

Create Stripe checkout session

**Request:**

```json
{
  "priceId": "price_xxx",
  "email": "user@example.com",
  "successUrl": "https://...",
  "cancelUrl": "https://..."
}
```

**Response:**

```json
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

### POST `/api/webhook`

Stripe webhook handler (raw body required)

Events handled:

- `checkout.session.completed` - Creates license
- `customer.subscription.deleted` - Cancels license
- `invoice.payment_failed` - Handles failed payments

### POST `/api/license/verify`

Verify license key validity

**Request:**

```json
{
  "licenseKey": "PDFReader-xxx"
}
```

**Response:**

```json
{
  "valid": true,
  "email": "user@example.com",
  "plan": "lifetime",
  "expiresAt": null
}
```

### POST `/api/license/activate`

Activate license for device

**Request:**

```json
{
  "licenseKey": "PDFReader-xxx",
  "email": "user@example.com",
  "deviceId": "abc123"
}
```

**Response:**

```json
{
  "success": true,
  "license": {
    "valid": true,
    "email": "user@example.com",
    "activatedAt": "2024-01-15T...",
    "plan": "lifetime"
  }
}
```

## 🗄️ Database

Uses SQLite with the following schema:

```sql
CREATE TABLE licenses (
  id TEXT PRIMARY KEY,
  license_key TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,
  plan TEXT NOT NULL, -- 'lifetime', 'monthly', 'yearly'
  status TEXT NOT NULL, -- 'active', 'cancelled', 'expired'
  activated_at TEXT,
  expires_at TEXT,
  device_id TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

Database file: `data/licenses.db`

## 🔧 Environment Variables

See `.env.example` for all required variables.

Key variables:

- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
- `DATABASE_PATH` - Path to SQLite database
- `PORT` - Server port (default: 3001)

## 🚢 Deployment

### Vercel

```bash
vercel
```

### Railway

1. Connect GitHub repo
2. Add environment variables
3. Deploy

### Fly.io

```bash
fly launch
fly secrets set STRIPE_SECRET_KEY=sk_live_...
fly deploy
```

## 🔒 Security

- Never expose `STRIPE_SECRET_KEY` publicly
- Webhook signature verification is enabled
- Use HTTPS in production
- Set `CORS_ORIGIN` to your domain

## 📚 Learn More

- [Stripe API Docs](https://stripe.com/docs/api)
- [Webhook Testing](https://stripe.com/docs/webhooks/test)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
