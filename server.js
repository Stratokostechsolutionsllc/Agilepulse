require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const path = require('path');

const app = express();

// ─── Stripe webhook needs raw body — must be before express.json() ───────────
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle subscription events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const plan = session.metadata.plan;
      const customerId = session.customer;
      const customerEmail = session.customer_details?.email;
      console.log(`✅ New ${plan} subscriber: ${customerEmail} (${customerId})`);
      // TODO: store in your database, send welcome email, etc.
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      console.log(`❌ Subscription cancelled: ${sub.customer}`);
      // TODO: revoke access in your database
      break;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object;
      console.log(`⚠️  Payment failed for: ${inv.customer_email}`);
      // TODO: send dunning email
      break;
    }
  }

  res.json({ received: true });
});

// ─── All other routes use JSON body ──────────────────────────────────────────
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Create Stripe Checkout Session ──────────────────────────────────────────
app.post('/create-checkout-session', async (req, res) => {
  const { plan } = req.body;

  const priceMap = {
    pro:    process.env.STRIPE_PRICE_PRO,
    growth: process.env.STRIPE_PRICE_GROWTH,
  };

  const planNames = {
    pro:    'AgilePulse Pro — $249/mo',
    growth: 'AgilePulse Growth — $399/mo',
  };

  const priceId = priceMap[plan];
  if (!priceId) return res.status(400).json({ error: 'Invalid plan' });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.CLIENT_URL || 'http://localhost:3000'}/?cancelled=true`,
      metadata: { plan },
      subscription_data: {
        metadata: { plan },
        trial_period_days: 7, // 7-day free trial on paid plans
      },
      allow_promotion_codes: true, // lets you run discount codes
      billing_address_collection: 'auto',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Verify session after redirect (confirm plan to frontend) ────────────────
app.get('/verify-session', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status === 'paid' || session.status === 'complete') {
      res.json({
        success: true,
        plan: session.metadata.plan,
        email: session.customer_details?.email,
        customerId: session.customer,
      });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Customer portal (let subscribers manage/cancel their plan) ───────────────
app.post('/create-portal-session', async (req, res) => {
  const { customerId } = req.body;
  if (!customerId) return res.status(400).json({ error: 'Missing customerId' });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.CLIENT_URL || 'http://localhost:3000',
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 AgilePulse server running on http://localhost:${PORT}`);
  console.log(`   Stripe mode: ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? '🔴 LIVE' : '🟡 TEST'}\n`);
});
