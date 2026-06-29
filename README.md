# AgilePulse — AI Agile Coach by Stratokos

## Setup in 5 steps

### 1. Install dependencies
```
npm install
```

### 2. Create your .env file
Copy `.env.example` to `.env` and fill in your keys:
```
cp .env.example .env
```

### 3. Get your Stripe keys
- Go to https://dashboard.stripe.com
- Developers → API Keys → copy Secret Key → paste as STRIPE_SECRET_KEY
- Products → Create two products:
  - "AgilePulse Pro" at $249/month → copy Price ID → STRIPE_PRICE_PRO
  - "AgilePulse Growth" at $399/month → copy Price ID → STRIPE_PRICE_GROWTH

### 4. Set up Stripe Webhook (for subscription events)
- Stripe Dashboard → Developers → Webhooks → Add endpoint
- URL: https://your-domain.com/webhook
- Events to listen for:
  - checkout.session.completed
  - customer.subscription.deleted
  - invoice.payment_failed
- Copy Signing Secret → paste as STRIPE_WEBHOOK_SECRET

### 5. Set your Anthropic API key
- https://console.anthropic.com → API Keys → copy → ANTHROPIC_API_KEY

## Run locally
```
npm start
```
Open http://localhost:3000

## Deploy (Render — free tier)
1. Push this folder to a GitHub repo
2. Go to https://render.com → New Web Service → connect your repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Add all .env variables in Render's Environment tab
6. Update CLIENT_URL in .env to your Render URL
