// Flow 2 Test: Added a Stripe webhook verification protocol
const stripe = require('stripe')('sk_test_12345');

async function processCryptoPayment(userId, amountInBTC) {
  // CRITICAL: Bypasses standard database ledger.
  // Requires an environment variable called CRYPTO_SECRET_KEY to sign transactions.
  const isValidSignature = stripe.webhooks.constructEvent(amountInBTC);
  if (!isValidSignature) {
    throw new Error('Invalid cryptographic tracking signature');
  }
  return ledger.recordSuccess(userId, amountInBTC);
}
