# ✅ Stripe Implementation Checklist

Complete this checklist to get your payment system live.

## 🎯 Phase 1: Local Testing (30 minutes)

### Stripe Account Setup

- [ ] Create Stripe account at https://dashboard.stripe.com/register
- [ ] Stay in **Test Mode** (toggle top-right)
- [ ] Copy test **Secret Key** from API Keys page (`sk_test_...`)

### Product Creation

- [ ] Go to Products → Add Product
- [ ] Create "PDF AI Reader - Lifetime License"
- [ ] Set price: One time → $49 (or your price)
- [ ] Copy **Price ID** (`price_...`)

### Stripe CLI

- [ ] Install: `brew install stripe/stripe-cli/stripe`
- [ ] Login: `stripe login`
- [ ] This gives you webhook secret for testing

### Backend Setup

- [ ] `cd server && npm install`
- [ ] Create `server/.env` (see ENV_TEMPLATE.md)
- [ ] Add Stripe test keys
- [ ] Add price ID
- [ ] Run: `npm run dev`
- [ ] Verify server starts at http://localhost:3001

### Webhook Testing

- [ ] Open new terminal
- [ ] Run: `stripe listen --forward-to localhost:3001/api/webhook`
- [ ] Leave running (copy webhook secret to `.env` if not done)

### Frontend Setup

- [ ] Create root `.env` (see ENV_TEMPLATE.md)
- [ ] Add `BACKEND_API_URL=http://localhost:3001`
- [ ] Add price ID to `VITE_STRIPE_PRICE_LIFETIME`
- [ ] Run: `npm run electron:dev`

### Test Purchase

- [ ] App opens → Should show paywall
- [ ] Enter test email: `test@example.com`
- [ ] Click "Purchase Now"
- [ ] Browser opens to Stripe Checkout
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Use any future date + any CVC
- [ ] Complete payment

### Verify License

- [ ] Check backend terminal for: `🎫 License created: PDFReader-xxx`
- [ ] Copy license key
- [ ] In app: Click "Already have license?"
- [ ] Enter email + license key
- [ ] Click Activate
- [ ] ✅ Should activate successfully

### Test Persistence

- [ ] Close and reopen app
- [ ] Should bypass paywall (license remembered)

---

## 🚀 Phase 2: Production Deployment (2-4 hours)

### Backend Deployment

- [ ] Choose hosting: Vercel / Railway / Fly.io
- [ ] Deploy backend server
- [ ] Note production URL (e.g., `https://api.yourapp.com`)
- [ ] Set production environment variables
- [ ] Test health endpoint: `curl https://api.yourapp.com/health`

### Live Stripe Setup

- [ ] Switch to **Live Mode** in Stripe Dashboard
- [ ] Get live API keys from API Keys page (`sk_live_...`)
- [ ] Create live product (same as test)
- [ ] Copy live price ID

### Production Webhook

- [ ] Go to Webhooks → Add Endpoint
- [ ] URL: `https://api.yourapp.com/api/webhook`
- [ ] Select events: `checkout.session.completed`, `customer.subscription.deleted`
- [ ] Copy webhook signing secret (`whsec_live_...`)
- [ ] Update production environment with webhook secret

### Update Production Config

- [ ] Update backend `.env` with live Stripe keys
- [ ] Update root `.env`:
  - [ ] `BACKEND_API_URL=https://api.yourapp.com`
  - [ ] `VITE_STRIPE_PRICE_LIFETIME=price_live_...`

### Email Integration (Optional but Recommended)

- [ ] Choose: SendGrid or Resend
- [ ] Sign up and get API key
- [ ] Install: `npm install @sendgrid/mail` or `npm install resend`
- [ ] Update `server/src/routes/webhook.ts` with email code
- [ ] Test email delivery

### Build Electron App

- [ ] Update version in `package.json`
- [ ] Run: `npm run build`
- [ ] Run: `npm run electron:build`
- [ ] Locate built app in `dist/` folder

### Code Signing (Required for Distribution)

**macOS:**

- [ ] Get Apple Developer account ($99/year)
- [ ] Create Developer ID Application certificate
- [ ] Add to `electron-builder` config
- [ ] Notarize app

**Windows:**

- [ ] Get code signing certificate (~$100/year)
- [ ] Add to `electron-builder` config
- [ ] Sign executable

### Test Production Build

- [ ] Install production build on test machine
- [ ] Verify paywall shows
- [ ] Test purchase with real payment method
- [ ] Verify license email received
- [ ] Test license activation
- [ ] Verify app unlocks

---

## 📧 Phase 3: Email Setup (1 hour)

### SendGrid Setup (Recommended)

- [ ] Sign up at sendgrid.com (free tier: 100 emails/day)
- [ ] Verify sender email domain
- [ ] Get API key
- [ ] Add to backend `.env`: `SENDGRID_API_KEY=...`

### Email Template

- [ ] Update `webhook.ts` with email code (see PAYMENT_SETUP.md)
- [ ] Customize email template
- [ ] Test with test purchase
- [ ] Verify email arrives with license key

### Alternative: Resend

- [ ] Sign up at resend.com
- [ ] Get API key
- [ ] Add to `.env`: `RESEND_API_KEY=...`
- [ ] Use similar implementation

---

## 🎨 Phase 4: Customization

### Pricing

- [ ] Update price in `Paywall.tsx` component
- [ ] Match Stripe product price
- [ ] Update currency if needed

### Branding

- [ ] Update app name in `Paywall.tsx`
- [ ] Customize feature list
- [ ] Add logo/icon
- [ ] Update color scheme

### Success/Cancel Pages

- [ ] Create website success page
- [ ] Create website cancel page
- [ ] Update URLs in `main.ts` checkout handler
- [ ] Test redirect flow

---

## 🔒 Security Checklist

### Before Launch

- [ ] Never commit `.env` files to git
- [ ] Never expose `STRIPE_SECRET_KEY` publicly
- [ ] Use HTTPS in production
- [ ] Set `CORS_ORIGIN` to your domain (not `*`)
- [ ] Enable webhook signature verification (already done)
- [ ] Use environment variables for all secrets

### After Launch

- [ ] Monitor Stripe Dashboard for fraudulent charges
- [ ] Enable Stripe Radar (fraud detection)
- [ ] Set up alerts for failed payments
- [ ] Regular database backups
- [ ] Monitor server logs

---

## 📊 Post-Launch Checklist

### Day 1

- [ ] Monitor first real purchase
- [ ] Verify license generation
- [ ] Verify email delivery
- [ ] Check for errors in logs
- [ ] Test customer experience

### Week 1

- [ ] Monitor Stripe Dashboard daily
- [ ] Check for refund requests
- [ ] Verify webhook delivery rate
- [ ] Monitor server uptime
- [ ] Collect user feedback

### Ongoing

- [ ] Weekly revenue review
- [ ] Monthly Stripe reconciliation
- [ ] Update documentation
- [ ] Plan feature additions
- [ ] Monitor conversion rate

---

## 🐛 Troubleshooting Quick Reference

### Payment not working

1. Check Stripe test/live mode matches your keys
2. Verify price ID is correct
3. Check browser console for errors
4. Verify backend is accessible

### Webhook not firing

1. Check webhook URL is correct
2. Verify webhook secret matches
3. Check Stripe Dashboard → Webhooks → Logs
4. Verify server is accessible from internet

### License not activating

1. Check backend server is running
2. Verify `BACKEND_API_URL` is correct
3. Check license exists in database
4. Verify email matches

### Email not sending

1. Check API key is correct
2. Verify sender email is verified
3. Check spam folder
4. Review SendGrid/Resend logs

---

## 📚 Quick Links

- Stripe Dashboard: https://dashboard.stripe.com
- Test Cards: https://stripe.com/docs/testing
- Webhook Testing: https://stripe.com/docs/webhooks/test
- Stripe CLI: https://stripe.com/docs/stripe-cli

---

## ✅ Ready to Launch?

All checkboxes completed? You're ready to:

1. Push code to production
2. Deploy backend
3. Distribute Electron app
4. Start accepting payments! 🎉

Questions? Check:

- `QUICK_START_PAYMENTS.md` - Quick testing guide
- `PAYMENT_SETUP.md` - Detailed setup
- `PAYMENT_ARCHITECTURE.md` - System overview
