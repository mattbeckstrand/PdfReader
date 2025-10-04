// ============================================================================
// PDF AI Reader - Backend Server
// ============================================================================

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import checkoutRouter from './routes/checkout.js';
import licenseRouter from './routes/license.js';
import subscriptionRouter from './routes/subscription.js';
import webhookRouter from './routes/webhook.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// Middleware
// ============================================================================

// CORS - Allow requests from Electron app
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Webhook route needs raw body for signature verification
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRouter);

// All other routes use JSON parsing
app.use(express.json());

// ============================================================================
// Routes
// ============================================================================

app.use('/api', checkoutRouter);
app.use('/api', licenseRouter);
app.use('/api', subscriptionRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log('🚀 PDF AI Reader Backend Server');
  console.log(`📍 Server running on http://localhost:${PORT}`);
  console.log(`🔒 Stripe webhook endpoint: http://localhost:${PORT}/api/webhook`);
  console.log('');
  console.log('Environment:');
  console.log('  - Stripe:', !!process.env.STRIPE_SECRET_KEY ? '✅' : '❌');
  console.log('  - Webhook Secret:', !!process.env.STRIPE_WEBHOOK_SECRET ? '✅' : '❌');
  console.log(
    '  - Supabase:',
    !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY ? '✅' : '❌'
  );
  console.log('  - Database:', process.env.DATABASE_PATH || 'data/licenses.db');
  console.log('');
});
