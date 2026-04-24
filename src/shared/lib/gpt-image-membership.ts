import { GPT_IMAGE_2_CREDITS } from '@/shared/lib/image-pricing';

const GPT_IMAGE_2_HALF_PRICE_PRODUCT_IDS = new Set([
  'premium-yearly',
  'studio-yearly-v2',
]);

interface SubscriptionLike {
  productId?: string | null;
}

function normalizeBaseCredits(baseCredits: number) {
  if (Number.isFinite(baseCredits) && baseCredits > 0) {
    return Math.floor(baseCredits);
  }

  return GPT_IMAGE_2_CREDITS;
}

export function isGptImageHalfPriceEligibleSubscription(
  subscription?: SubscriptionLike | null
) {
  const productId = subscription?.productId?.trim();

  return Boolean(
    productId && GPT_IMAGE_2_HALF_PRICE_PRODUCT_IDS.has(productId)
  );
}

export function getGptImageCreditsForSubscription({
  baseCredits,
  subscription,
}: {
  baseCredits: number;
  subscription?: SubscriptionLike | null;
}) {
  const normalizedBaseCredits = normalizeBaseCredits(baseCredits);

  if (!isGptImageHalfPriceEligibleSubscription(subscription)) {
    return normalizedBaseCredits;
  }

  return Math.max(1, Math.ceil(normalizedBaseCredits / 2));
}
