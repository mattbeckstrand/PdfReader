# 🔐 Supabase Authentication Setup Guide

You now have a full account-based authentication system with Supabase!

## ✅ What Was Built

### **Frontend:**

- ✅ Sign Up screen
- ✅ Sign In screen
- ✅ `useAuth` hook for auth state
- ✅ Supabase client configured
- ✅ Auto-activation after payment

### **Backend:**

- ✅ Subscription status API
- ✅ Webhook links subscriptions to users
- ✅ Supabase integration
- ✅ Multi-device support ready

---

## 🚀 Quick Setup (5 minutes)

### **Step 1: Get Supabase Service Key**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **Settings** (gear icon) → **API**
4. Scroll to **Project API keys**
5. Find **`service_role`** (secret) - Click "Reveal" and copy

### **Step 2: Update Server Environment**

Edit `server/.env` and replace:

```env
SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY_HERE
```

With your actual service key (starts with `eyJhbGc...`)

⚠️ **Important:** This is different from the `anon` key! Service key has full database access.

### **Step 3: Restart Backend**

```bash
# Stop server (Cmd+C in Terminal 2)
cd server
npm run dev
```

You should see:

```
✅ Supabase client initialized
🚀 PDF AI Reader Backend Server
```

### **Step 4: Restart Electron App**

```bash
# Stop app (Cmd+C in Terminal 4)
npm run electron:dev
```

---

## 🎮 New User Flow

### **First Time User:**

1. **App opens** → Sign Up screen
2. **Enter email + password** → Click "Sign Up"
3. **Account created** → Paywall appears
4. **Click "Purchase Now"** → Modal opens with Stripe
5. **Complete payment** → Modal closes
6. **Wait 3-5 seconds** → Auto-activation
7. ✅ **App unlocks!**

### **Returning User:**

1. **App opens** → Sign In screen
2. **Enter credentials** → Click "Sign In"
3. **If has subscription** → ✅ App unlocks immediately!
4. **If no subscription** → Shows paywall to subscribe

### **Multi-Device:**

1. **User signs in on Device 2** with same account
2. **Subscription status checked** with Supabase
3. ✅ **Access granted!** (same subscription, different device)

---

## 🔄 Complete Flow Diagram

```
┌─────────────────┐
│   Open App      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Check Session  │ ← Supabase handles this
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
No Session  Has Session
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────────┐
│ Sign Up │ │ Check            │
│    OR   │ │ Subscription     │
│ Sign In │ │ via Backend API  │
└────┬────┘ └────────┬─────────┘
     │               │
     │          ┌────┴────┐
     │          │         │
     │          ▼         ▼
     │      Active    No Sub
     │          │         │
     ▼          │         ▼
┌─────────┐    │    ┌──────────┐
│ Paywall │◄───┘    │ Paywall  │
└────┬────┘         └────┬─────┘
     │                   │
     ▼                   │
┌──────────────┐         │
│ Purchase via │         │
│   Stripe     │         │
└──────┬───────┘         │
       │                 │
       ▼                 │
┌──────────────────┐     │
│ Webhook Creates  │     │
│ Subscription in  │     │
│   Supabase       │     │
└──────┬───────────┘     │
       │                 │
       ▼                 │
┌──────────────────┐     │
│ Auto-Activation  │     │
│ App Reloads      │     │
└──────┬───────────┘     │
       │                 │
       └────────┬────────┘
                │
                ▼
        ┌───────────────┐
        │   ✅ UNLOCKED │
        │   Main App    │
        └───────────────┘
```

---

## 🗄️ Database Structure

### **Supabase Tables:**

**`auth.users`** (Built-in Supabase table)

- Email, password (hashed), etc.
- Managed automatically by Supabase

**`public.subscriptions`** (Your custom table)

- Links users to Stripe subscriptions
- Tracks plan, status, expiration

---

## 🔐 Security Features

✅ **Password hashing** - Handled by Supabase
✅ **JWT tokens** - Secure session management
✅ **Row Level Security (RLS)** - Users only see their data
✅ **Service role isolation** - Backend uses service key
✅ **HTTPS ready** - Supabase handles encryption

---

## 🧪 Testing the New System

### **Test Sign Up:**

1. Open app → Should see Sign Up screen
2. Enter email: `test@example.com`
3. Password: `password123`
4. Click "Sign Up"
5. Should redirect to paywall

### **Test Purchase:**

1. Click "Purchase Now"
2. Use test card: `4242 4242 4242 4242`
3. Complete payment
4. Wait for auto-activation
5. App should unlock!

### **Test Multi-Device:**

1. Clear local Supabase data: `localStorage.clear()`
2. Refresh app
3. Sign in with same account
4. Should unlock immediately (subscription already exists!)

### **Test Sign Out:**

1. In library view, add a sign-out button (optional)
2. Click sign out
3. Should return to sign-in screen

---

## 🔧 Troubleshooting

### "Missing Supabase environment variables"

- Check `server/.env` has both `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Restart backend server

### "No Supabase user found for email"

- User must sign up BEFORE purchasing
- Make sure they completed sign up flow

### "Subscription check failed"

- Verify backend is running
- Check `VITE_BACKEND_API_URL` in root `.env`
- Verify service key has database permissions

### "Invalid token"

- Session may have expired
- User needs to sign in again
- Check Supabase session settings

---

## 🆚 What Changed from License System

| Old (License Keys)          | New (Accounts)          |
| --------------------------- | ----------------------- |
| No account needed           | Sign up required        |
| License key copied manually | Auto-activation         |
| Single device               | Multi-device support    |
| Local storage only          | Cloud sync via Supabase |
| Manual verification         | JWT token auth          |

---

## 🎯 Next Steps

### **Immediate:**

1. Add Supabase service key to `server/.env`
2. Restart backend
3. Test sign up → purchase → unlock flow

### **Optional Enhancements:**

1. **Email verification** - Require users to verify email
2. **Password reset** - "Forgot password?" flow
3. **Social login** - Google, Apple sign-in
4. **Profile page** - Manage subscription
5. **Email notifications** - Welcome emails, payment receipts

---

## 📚 Supabase Resources

- Dashboard: https://supabase.com/dashboard
- Auth Docs: https://supabase.com/docs/guides/auth
- Database Docs: https://supabase.com/docs/guides/database
- RLS Guide: https://supabase.com/docs/guides/auth/row-level-security

---

## 💡 Benefits of This System

✅ **Multi-device access** - Sign in anywhere
✅ **Better subscription management** - Link to user, not device
✅ **Secure** - Industry-standard JWT auth
✅ **Scalable** - Supabase handles millions of users
✅ **Zero friction** - Auto-activation after payment
✅ **Cloud sync** - Can add features like synced settings later

---

**You're ready to launch with professional account management!** 🚀
