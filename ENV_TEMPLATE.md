# Environment Variables Setup

## Root Project `.env`

Create a `.env` file in the project root with:

```env
# ============================================================================
# PDF AI Reader - Environment Variables
# ============================================================================

# Gemini AI (required for AI features)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_MODEL=gemini-1.5-flash

# MathPix (optional - for LaTeX/equation extraction)
MATHPIX_APP_ID=your_mathpix_app_id
MATHPIX_APP_KEY=your_mathpix_app_key

# Backend API URL (for license verification)
BACKEND_API_URL=http://localhost:3001

# Stripe Price IDs (for payment wall)
VITE_STRIPE_PRICE_LIFETIME=price_xxx_replace_with_real_id
# VITE_STRIPE_PRICE_MONTHLY=price_yyy_replace_with_real_id
# VITE_STRIPE_PRICE_YEARLY=price_zzz_replace_with_real_id
```

## Server `.env`

Create a `server/.env` file with:

```env
# ============================================================================
# PDF AI Reader Backend - Environment Variables
# ============================================================================

# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_PATH=./data/licenses.db

# CORS Configuration
CORS_ORIGIN=*

# Stripe Configuration (required)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs
STRIPE_PRICE_LIFETIME=price_xxx_replace_with_real_id
STRIPE_PRICE_MONTHLY=price_yyy_replace_with_real_id
STRIPE_PRICE_YEARLY=price_zzz_replace_with_real_id

# App Configuration
APP_URL=https://your-website.com
```

## Quick Setup Commands

```bash
# Root directory
cat > .env << 'EOF'
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_MODEL=gemini-1.5-flash
BACKEND_API_URL=http://localhost:3001
VITE_STRIPE_PRICE_LIFETIME=price_xxx
EOF

# Server directory
cd server
cat > .env << 'EOF'
PORT=3001
NODE_ENV=development
DATABASE_PATH=./data/licenses.db
CORS_ORIGIN=*
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
STRIPE_PRICE_LIFETIME=price_xxx
APP_URL=https://your-website.com
EOF
```

Replace the placeholder values with your actual keys from:

- Gemini: https://aistudio.google.com/app/apikey
- Stripe: https://dashboard.stripe.com/test/apikeys
- Stripe Webhooks: https://dashboard.stripe.com/test/webhooks
