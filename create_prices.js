require('dotenv').config();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

(async () => {
  try {
    const prodPro = await stripe.products.create({ name: 'AgilePulse Pro (test)' });
    const pricePro = await stripe.prices.create({
      unit_amount: 24900,
      currency: 'usd',
      recurring: { interval: 'month' },
      product: prodPro.id,
    });

    const prodGrowth = await stripe.products.create({ name: 'AgilePulse Growth (test)' });
    const priceGrowth = await stripe.prices.create({
      unit_amount: 39900,
      currency: 'usd',
      recurring: { interval: 'month' },
      product: prodGrowth.id,
    });

    console.log('PRO_PRICE_ID=' + pricePro.id);
    console.log('GROWTH_PRICE_ID=' + priceGrowth.id);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
