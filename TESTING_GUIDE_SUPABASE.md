# 🧪 Complete Testing Guide - Supabase Auth System

## ✅ Code Review Complete

All code has been reviewed and the following issues were fixed:

### **Fixed Issues:**

1. ✅ **Webhook efficiency** - Now checks existing subscriptions before listing all users
2. ✅ **Checkout mode** - Dynamically uses 'payment' vs 'subscription' based on plan type
3. ✅ **Auto-activation** - Updated to check subscriptions (not licenses) in Supabase
4. ✅ **Environment validation** - Added Supabase status to server startup logs
5. ✅ **Type safety** - Proper TypeScript types throughout
6. ✅ **Success messaging** - Changed "license" to "subscription" in UI
7. ✅ **Storage configuration** - Explicit localStorage for Electron compatibility

---

## 🚀 Ready to Test!

### **Prerequisites Check:**

✅ All environment variables set:

- Root `.env`: Supabase URL & Anon Key, Backend URL, Stripe Price ID
- Server `.env`: Supabase URL & Service Key, Stripe Keys, Webhook Secret

✅ Supabase database table created:

- `subscriptions` table exists

✅ All 4 terminals ready:

- Terminal 1: Vite dev server
- Terminal 2: Backend API server
- Terminal 3: Stripe webhook listener
- Terminal 4: Electron app

---

## 📋 Test Sequence

### **Test 1: Fresh Sign Up Flow** (5 min)

1. **Start all services:**

   ```bash
   # Terminal 1
   npm run dev

   # Terminal 2
   cd server && npm run dev
   # Verify you see: "✅ Supabase client initialized"

   # Terminal 3
   stripe listen --forward-to localhost:3001/api/webhook

   # Terminal 4
   npm run electron:dev
   ```

2. **App opens** → Should show **"Create Account"** screen

3. **Sign up:**

   - Email: `newuser@example.com`
   - Password: `password123`
   - Confirm: `password123`
   - Click "Sign Up"

4. **Check Terminal 2** → Should see Supabase user created

5. **Paywall appears** → Shows "Signed in as: newuser@example.com"

6. **Purchase:**

   - Click "Purchase Now"
   - Modal opens with Stripe
   - Use card: `4242 4242 4242 4242`
   - Any future date, any CVC
   - Click "Subscribe"

7. **Watch Terminal 2:**

   ```
   🔔 Webhook received: checkout.session.completed
   🔍 Looking up user by email: newuser@example.com
   ✅ Found user: abc-123-def
   🎫 Subscription created for user: abc-123-def
   ```

8. **Watch Terminal 3:**

   ```
   --> checkout.session.completed [evt_xxx]
   <-- [200] POST http://localhost:3001/api/webhook
   ```

9. **App shows:**

   - "Processing Payment..." (for 3-5 seconds)
   - 🎉 "Payment Successful! Your subscription has been activated."
   - "Unlocking app in 2 seconds..."

10. **App reloads** → ✅ **Library view opens!**

---

### **Test 2: Sign Out and Sign In** (2 min)

1. **In DevTools Console**, run:

   ```javascript
   localStorage.clear();
   location.reload();
   ```

2. **App reloads** → Shows "Welcome Back" (Sign In screen)

3. **Sign in:**

   - Email: `newuser@example.com`
   - Password: `password123`
   - Click "Sign In"

4. **Check Terminal 2:**

   ```
   🔍 Checking subscription for user: newuser@example.com
   ✅ Active subscription found: monthly
   ```

5. ✅ **App unlocks immediately!** (No payment needed - subscription exists)

---

### **Test 3: Multi-Device Simulation** (2 min)

1. **Clear local data:**

   ```javascript
   localStorage.clear();
   ```

2. **Refresh** → Sign in screen

3. **Sign in with same account**

4. ✅ **Access granted!** (Same subscription works on "multiple devices")

---

### **Test 4: User Without Subscription** (3 min)

1. **Create second account:**

   - Sign out or clear localStorage
   - Click "Don't have an account? Sign up"
   - Email: `user2@example.com`
   - Password: `password123`
   - Sign up

2. **Should show paywall** (no subscription yet)

3. **Try refreshing** → Still shows paywall (correct!)

4. **Sign out and sign in again** → Still shows paywall (correct!)

---

### **Test 5: Subscription Cancellation** (Optional)

1. **In Stripe Dashboard:**

   - Go to Customers
   - Find test customer
   - Cancel subscription

2. **In app:**
   - Sign out and sign in
   - Should show paywall (subscription cancelled)

---

## 🐛 Expected Behaviors

### **What SHOULD Happen:**

✅ Sign up → Paywall → Purchase → Auto-unlock
✅ Sign in with subscription → Instant unlock
✅ Sign in without subscription → Paywall
✅ Multi-device sign in → Works
✅ Subscription cancelled → Access revoked

### **What should NOT happen:**

❌ Sign up without email verification (currently disabled - can add later)
❌ Purchase without signing up first
❌ Access without active subscription

---

## 🔍 Debugging Checklist

### **If Sign Up Fails:**

- Check DevTools console for Supabase errors
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in `.env`
- Check Supabase Dashboard → Authentication → Users

### **If Payment Fails:**

- Check Terminal 2 for backend errors
- Verify Stripe keys are correct
- Check Terminal 3 for [200] webhook responses

### **If Webhook Gets 404:**

- Ensure backend is running
- Verify `stripe listen` is forwarding to correct port
- Check server logs for errors

### **If Subscription Not Found:**

- Check Supabase Dashboard → Table Editor → subscriptions
- Verify webhook created subscription record
- Check user_id matches between auth.users and subscriptions table

### **If Auto-Activation Fails:**

- Check DevTools console for polling logs
- Verify subscription/by-email endpoint works:
  ```bash
  curl http://localhost:3001/api/subscription/by-email/newuser@example.com
  ```

---

## 📊 Monitoring Points

### **Terminal 2 (Backend) - Look For:**

```
✅ Supabase client initialized           ← Supabase connected
🔍 Looking up user by email: xxx         ← Webhook processing
✅ Found user: abc-123                   ← User found
🎫 Subscription created for user: xxx    ← Subscription created
🔍 Checking subscription for user: xxx   ← Login check
✅ Active subscription found: monthly    ← Access granted
```

### **Terminal 3 (Stripe) - Look For:**

```
--> checkout.session.completed [evt_xxx]
<-- [200] POST http://localhost:3001/api/webhook  ← SUCCESS!
```

### **DevTools Console - Look For:**

```
🔍 Checking subscription status...
✅ Active subscription found: monthly
```

---

## ✅ Success Criteria

All these should work:

- [ ] New user can sign up
- [ ] User can sign in
- [ ] Signed-in user sees paywall (no subscription)
- [ ] Purchase completes successfully
- [ ] Webhook creates subscription in Supabase
- [ ] Auto-activation detects subscription
- [ ] App unlocks after payment
- [ ] Sign out works
- [ ] Sign in again unlocks immediately
- [ ] Multi-device works (clear localStorage → sign in → unlock)

---

## 🎯 You're Ready!

Everything has been:
✅ Reviewed line by line
✅ Issues fixed
✅ Environment configured
✅ Types validated
✅ Error handling added
✅ Security checked

**Start testing now!** Follow Test Sequence above. 🚀
