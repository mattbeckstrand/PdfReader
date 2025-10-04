# 🚀 Quick Start: Payments Setup

Get payments working in **under 30 minutes**.

## ⚡ Fastest Path to Testing Payments

### Step 1: Get Stripe Test Keys (5 min)

1. Go to https://dashboard.stripe.com/register
2. Complete signup
3. Stay in **Test Mode** (toggle in top-right)
4. Go to [Developers → API Keys](https://dashboard.stripe.com/test/apikeys)
5. Copy:
   - **Secret key** (starts with `sk_test_`)

### Step 2: Create a Product (3 min)

1. Go to [Products](https://dashboard.stripe.com/test/products)
2. Click **+ Add product**
3. Fill in:
   - Name: `PDF AI Reader - Lifetime License`
   - Price: `One time` → `$49.00 USD`
4. Click **Save**
5. **Copy the Price ID** (looks like `price_1Abc...`)

### Step 3: Set Up Webhook (3 min)

1. Install Stripe CLI:

   ```bash
   brew install stripe/stripe-cli/stripe
   ```

   Or download from https://stripe.com/docs/stripe-cli

2. Login:

   ```bash
   stripe login
   ```

3. This will give you a webhook secret - save it!

### Step 4: Configure Server (5 min)

```bash
# Create server environment file
cd server
cat > .env << 'EOF'
PORT=3001
DATABASE_PATH=./data/licenses.db
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
STRIPE_PRICE_LIFETIME=price_YOUR_PRICE_ID_HERE
APP_URL=http://localhost:3001
CORS_ORIGIN=*
EOF

# Install and start
npm install
npm run dev
```

Server should start at http://localhost:3001

### Step 5: Configure Electron App (2 min)

```bash
# Back to root directory
cd ..

# Create environment file
cat > .env << 'EOF'
VITE_GEMINI_API_KEY=your_existing_gemini_key
BACKEND_API_URL=http://localhost:3001
VITE_STRIPE_PRICE_LIFETIME=price_YOUR_PRICE_ID_HERE
EOF
```

### Step 6: Forward Webhooks (1 min)

In a separate terminal:

```bash
stripe listen --forward-to localhost:3001/api/webhook
```

Leave this running!

### Step 7: Test It! (5 min)

1. Start your Electron app:

   ```bash
   npm run electron:dev
   ```

2. You should see the paywall
3. Enter any email (e.g., `test@example.com`)
4. Click **Purchase Now**
5. Browser opens to Stripe Checkout
6. Use test card: `4242 4242 4242 4242`
7. Any future date, any CVC
8. Complete payment

9. Check server terminal - you should see:

   ```
   ✅ Checkout completed
   🎫 License created: PDFReader-xxxxxxxxxx
   ```

10. Copy the license key
11. Go back to app → "Already have a license?"
12. Enter email + license key → **Activate**
13. ✅ You're in!

---

## 🎉 You're Done!

Now you have:

- ✅ Working payment flow
- ✅ License generation
- ✅ License activation
- ✅ Local license storage

## 🚀 Next Steps

### To go live:

1. **Switch to live mode** in Stripe Dashboard
2. Get live API keys (start with `sk_live_`)
3. Create live product and get live price ID
4. Set up production webhook endpoint
5. Deploy backend (see `PAYMENT_SETUP.md` for details)
6. Update `.env` files with live values
7. Build and distribute app

### Optional improvements:

- Add email service to send license keys (SendGrid/Resend)
- Add subscription support
- Add usage analytics
- Add refund handling

---

## 🐛 Troubleshooting

**"Connection refused" error:**

- Make sure backend server is running: `cd server && npm run dev`

**Webhook not working:**

- Make sure `stripe listen` is running
- Check the webhook secret in `server/.env` matches

**License activation fails:**

- Check backend logs for errors
- Verify license was created (check backend terminal)
- Make sure email matches

**Payment succeeds but no license:**

- Check webhook is receiving events
- Look for errors in backend logs
- Verify database was created at `server/data/licenses.db`

---

## 📚 Full Documentation

For production deployment, email integration, and more:

- See `PAYMENT_SETUP.md` - Complete setup guide
- See `server/README.md` - Backend API docs
- See `ENV_TEMPLATE.md` - Environment variable reference
