import Stripe from "stripe";

// Lazy initialization to avoid build-time errors when env vars are not available
let stripeInstance: Stripe | null = null;

export const getStripe = (): Stripe => {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    // During build time, return a mock if env vars aren't available
    if (!secretKey) {
      if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build') {
        console.warn('⚠️ STRIPE_SECRET_KEY not available during build. This is expected for static analysis.');
        // Return a mock stripe instance for build-time
        return {} as Stripe;
      }
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    
    stripeInstance = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    });
  }
  return stripeInstance;
};

// For backward compatibility - uses a Proxy for lazy initialization
export const stripe = new Proxy({} as Stripe, {
  get: (target, prop) => {
    return getStripe()[prop as keyof Stripe];
  }
});
