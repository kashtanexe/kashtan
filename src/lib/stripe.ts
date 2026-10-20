import Stripe from "stripe";
import { getEnv } from "@/lib/env";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    const key = getEnv().STRIPE_SECRET_KEY;
    if (!key) throw new Error("Stripe is not configured");
    stripe = new Stripe(key);
  }
  return stripe;
}
