import {
  buildDedupeKey,
  getTrackingSessionId,
  hashTrackingValue,
  trackTemplateEvent,
} from '@/shared/tracking/client';

export interface GtmItem {
  item_id?: string;
  item_name?: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
}

export const GTM_PENDING_PURCHASE_COOKIE = 'gtm_pending_purchase';
export const GTM_PENDING_SOCIAL_AUTH_KEY = 'gtm_pending_social_auth';
export const GTM_PENDING_EMAIL_SIGN_UP_KEY = 'gtm_pending_email_sign_up';
const GTM_ACTIVATION_TRACKED_KEY = 'gtm_activation_tracked';

const GTM_AUTH_PENDING_WINDOW_MS = 15 * 60 * 1000;

export interface PendingGtmPurchasePayload {
  orderNo: string;
  paymentProvider?: string;
  paymentType?: string;
  productId?: string;
  productName?: string;
  currency?: string;
  value?: number;
}

export interface PendingSocialAuthPayload {
  provider: string;
  startedAt: number;
  expiresAt: number;
}

export interface PendingEmailSignUpPayload {
  email: string;
  startedAt: number;
  expiresAt: number;
}

export type QueueTrackingEventName =
  | 'queue_shown'
  | 'queue_cancelled'
  | 'queue_completed'
  | 'queue_submit_started'
  | 'queue_upgrade_clicked'
  | 'queue_restored_after_refresh';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

const GOOGLE_ADS_SIGN_UP_SEND_TO = (
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGN_UP_SEND_TO ||
  process.env.GOOGLE_ADS_SIGN_UP_SEND_TO ||
  ''
).trim();
const ADD_TO_CART_WINDOW_MS = 30 * 60 * 1000;
const BEGIN_CHECKOUT_WINDOW_MS = 30 * 60 * 1000;
const GENERATE_WINDOW_MS = 5 * 60 * 1000;

function getDataLayer() {
  if (typeof window === 'undefined') {
    return null;
  }

  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

function getLocalStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function getActivationTrackedStorageKey(userId?: string) {
  const normalizedUserId = String(userId || '').trim();
  return normalizedUserId
    ? `${GTM_ACTIVATION_TRACKED_KEY}:${normalizedUserId}`
    : GTM_ACTIVATION_TRACKED_KEY;
}

export function toMajorUnitAmount(amount?: number | null) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return undefined;
  }

  return Number((amount / 100).toFixed(2));
}

export function setPendingSocialAuth(provider: string) {
  const storage = getLocalStorage();
  if (!storage || !provider) {
    return;
  }

  const startedAt = Date.now();
  const payload: PendingSocialAuthPayload = {
    provider,
    startedAt,
    expiresAt: startedAt + GTM_AUTH_PENDING_WINDOW_MS,
  };

  storage.setItem(GTM_PENDING_SOCIAL_AUTH_KEY, JSON.stringify(payload));
}

export function getPendingSocialAuth(): PendingSocialAuthPayload | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(GTM_PENDING_SOCIAL_AUTH_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PendingSocialAuthPayload>;
    const startedAt =
      typeof parsed.startedAt === 'number' ? parsed.startedAt : NaN;
    const expiresAt =
      typeof parsed.expiresAt === 'number'
        ? parsed.expiresAt
        : startedAt + GTM_AUTH_PENDING_WINDOW_MS;

    if (
      !parsed.provider ||
      Number.isNaN(startedAt) ||
      Number.isNaN(expiresAt) ||
      Date.now() > expiresAt
    ) {
      storage.removeItem(GTM_PENDING_SOCIAL_AUTH_KEY);
      return null;
    }

    return {
      provider: parsed.provider,
      startedAt,
      expiresAt,
    };
  } catch {
    storage.removeItem(GTM_PENDING_SOCIAL_AUTH_KEY);
    return null;
  }
}

export function clearPendingSocialAuth() {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(GTM_PENDING_SOCIAL_AUTH_KEY);
}

export function setPendingEmailSignUp(email: string) {
  const storage = getLocalStorage();
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();
  if (!storage || !normalizedEmail) {
    return;
  }

  const startedAt = Date.now();
  const payload: PendingEmailSignUpPayload = {
    email: normalizedEmail,
    startedAt,
    expiresAt: startedAt + GTM_AUTH_PENDING_WINDOW_MS,
  };

  storage.setItem(GTM_PENDING_EMAIL_SIGN_UP_KEY, JSON.stringify(payload));
}

export function getPendingEmailSignUp(): PendingEmailSignUpPayload | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(GTM_PENDING_EMAIL_SIGN_UP_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PendingEmailSignUpPayload>;
    const normalizedEmail = String(parsed.email || '')
      .trim()
      .toLowerCase();
    const startedAt =
      typeof parsed.startedAt === 'number' ? parsed.startedAt : NaN;
    const expiresAt =
      typeof parsed.expiresAt === 'number'
        ? parsed.expiresAt
        : startedAt + GTM_AUTH_PENDING_WINDOW_MS;

    if (
      !normalizedEmail ||
      Number.isNaN(startedAt) ||
      Number.isNaN(expiresAt) ||
      Date.now() > expiresAt
    ) {
      storage.removeItem(GTM_PENDING_EMAIL_SIGN_UP_KEY);
      return null;
    }

    return {
      email: normalizedEmail,
      startedAt,
      expiresAt,
    };
  } catch {
    storage.removeItem(GTM_PENDING_EMAIL_SIGN_UP_KEY);
    return null;
  }
}

export function clearPendingEmailSignUp() {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(GTM_PENDING_EMAIL_SIGN_UP_KEY);
}

export function trackGtmEvent(
  event: string,
  params: Record<string, unknown> = {}
) {
  const dataLayer = getDataLayer();
  if (process.env.NODE_ENV !== 'production') {
    console.log('[gtm] trackGtmEvent', {
      event,
      params,
      hasDataLayer: !!dataLayer,
      dataLayerLength: dataLayer?.length ?? 0,
    });
  }
  if (!dataLayer) {
    return;
  }

  dataLayer.push({
    event,
    ...params,
  });
}

function trackEcommerceEvent(
  event: string,
  params: Record<string, unknown> = {}
) {
  const dataLayer = getDataLayer();
  if (!dataLayer) {
    return;
  }

  dataLayer.push({ ecommerce: null });
  dataLayer.push({
    event,
    ...params,
  });
}

export function trackGtmSignUp(method: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[gtm] trackGtmSignUp', { method });
  }
  const sessionId = getTrackingSessionId();
  trackTemplateEvent({
    eventName: 'sign_up',
    dedupeKey: buildDedupeKey('sign_up', sessionId, method),
    sessionId,
    properties: { method },
    gtmPayload: { method },
    shouldPostToServer: false,
  });
  trackGoogleAdsSignUpConversion({ method });
}

export function resolveGoogleAdsSignUpSendTo(configs?: Record<string, string>) {
  return String(
    configs?.google_ads_sign_up_send_to || GOOGLE_ADS_SIGN_UP_SEND_TO || ''
  ).trim();
}

export function hasGoogleAdsSignUpSendTo(configs?: Record<string, string>) {
  return !!resolveGoogleAdsSignUpSendTo(configs);
}

function shouldTrackGoogleAdsDirectConversion(
  configs?: Record<string, string>
) {
  // If GTM is configured, prefer tracking conversions in GTM only to avoid duplicates.
  return !String(
    configs?.google_tag_manager_id || configs?.gtm_id || ''
  ).trim();
}

export function trackConfiguredGtmSignUp({
  method,
  configs,
  onComplete,
  completeTimeoutMs = 1200,
}: {
  method: string;
  configs?: Record<string, string>;
  onComplete?: () => void;
  completeTimeoutMs?: number;
}) {
  const shouldTrackDirectConversion =
    shouldTrackGoogleAdsDirectConversion(configs);
  const resolvedSendTo = shouldTrackDirectConversion
    ? resolveGoogleAdsSignUpSendTo(configs)
    : '';
  const trackingEnabled = configs?.tracking_enabled !== 'false';
  const gtmId = String(
    configs?.google_tag_manager_id || configs?.gtm_id || ''
  ).trim();
  const hasGtm = !!gtmId;
  let didComplete = false;
  let completionTimer: number | null = null;
  const finishTracking = () => {
    if (didComplete) {
      return;
    }

    didComplete = true;
    if (completionTimer) {
      window.clearTimeout(completionTimer);
      completionTimer = null;
    }
    onComplete?.();
  };

  if (process.env.NODE_ENV !== 'production') {
    console.log('[gtm] trackConfiguredGtmSignUp', {
      method,
      gtmId,
      googleAdsSignUpSendTo: resolvedSendTo,
      shouldTrackDirectConversion,
      hasOnComplete: typeof onComplete === 'function',
    });
  }

  const sessionId = getTrackingSessionId();
  const gtmPayload: Record<string, unknown> = { method };
  if (trackingEnabled && hasGtm && typeof onComplete === 'function') {
    gtmPayload.eventCallback = finishTracking;
    gtmPayload.eventTimeout = completeTimeoutMs;
    completionTimer = window.setTimeout(finishTracking, completeTimeoutMs);
  }

  trackTemplateEvent({
    eventName: 'sign_up',
    dedupeKey: buildDedupeKey('sign_up', sessionId, method),
    sessionId,
    properties: { method },
    gtmPayload,
    shouldPostToServer: false,
    configs,
  });
  trackGoogleAdsSignUpConversion({
    method,
    sendTo: resolvedSendTo,
  });

  if (!trackingEnabled || !hasGtm) {
    finishTracking();
  }
}

export function trackGoogleAdsSignUpConversion({
  method,
  sendTo,
}: {
  method: string;
  sendTo?: string;
}) {
  if (typeof window === 'undefined') {
    return;
  }

  const resolvedSendTo = String(
    sendTo || GOOGLE_ADS_SIGN_UP_SEND_TO || ''
  ).trim();

  if (process.env.NODE_ENV !== 'production') {
    console.log('[ads] trackGoogleAdsSignUpConversion', {
      method,
      hasGtag: typeof window.gtag === 'function',
      sendTo: resolvedSendTo,
    });
  }

  if (!resolvedSendTo || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', 'conversion', {
    send_to: resolvedSendTo,
    method,
  });
}

export function trackGtmCtaClick({
  location,
  label,
  destination,
}: {
  location: string;
  label?: string;
  destination?: string;
}) {
  trackGtmEvent('cta_click', {
    location,
    label,
    destination,
  });
}

export function trackGtmSelectItem({
  listName,
  currency,
  value,
  items,
}: {
  listName: string;
  currency?: string;
  value?: number;
  items: GtmItem[];
}) {
  trackEcommerceEvent('select_item', {
    item_list_name: listName,
    currency,
    value,
    items,
  });
}

export function trackGtmAddToCart({
  currency,
  value,
  items,
  paymentType,
  group,
  productId,
  productName,
  amount,
  configs,
}: {
  currency?: string;
  value?: number;
  items: GtmItem[];
  paymentType?: string;
  group?: string;
  productId?: string;
  productName?: string;
  amount?: number;
  configs?: Record<string, string>;
}) {
  const sessionId = getTrackingSessionId();
  const timeBucket = Math.floor(Date.now() / ADD_TO_CART_WINDOW_MS);
  const normalizedCurrency = String(currency || '')
    .trim()
    .toUpperCase();
  const dedupeKey = buildDedupeKey(
    'add_to_cart',
    sessionId,
    productId,
    normalizedCurrency || 'USD',
    timeBucket
  );

  trackTemplateEvent({
    eventName: 'add_to_cart',
    dedupeKey,
    sessionId,
    properties: {
      currency: normalizedCurrency || undefined,
      value,
      items,
      product_id: productId,
      product_name: productName,
      amount,
      payment_type: paymentType,
      group,
    },
    gtmPayload: {
      currency: normalizedCurrency || undefined,
      value,
      items,
      payment_type: paymentType,
      group,
    },
    resetEcommerce: true,
    useLocalDedupe: true,
    configs,
  });
}

export function trackGtmBeginCheckout({
  currency,
  value,
  items,
  paymentProvider,
  paymentType,
  productId,
  orderNo,
  configs,
}: {
  currency?: string;
  value?: number;
  items: GtmItem[];
  paymentProvider?: string;
  paymentType?: string;
  productId?: string;
  orderNo?: string;
  configs?: Record<string, string>;
}) {
  const sessionId = getTrackingSessionId();
  const timeBucket = Math.floor(Date.now() / BEGIN_CHECKOUT_WINDOW_MS);
  const normalizedCurrency = String(currency || '')
    .trim()
    .toUpperCase();
  const dedupeKey = buildDedupeKey(
    'begin_checkout',
    sessionId,
    productId,
    normalizedCurrency || 'USD',
    orderNo || timeBucket
  );

  trackTemplateEvent({
    eventName: 'begin_checkout',
    dedupeKey,
    sessionId,
    orderNo,
    properties: {
      currency: normalizedCurrency || undefined,
      value,
      items,
      payment_provider: paymentProvider,
      payment_type: paymentType,
      product_id: productId,
    },
    gtmPayload: {
      currency: normalizedCurrency || undefined,
      value,
      items,
      payment_provider: paymentProvider,
      payment_type: paymentType,
    },
    resetEcommerce: true,
    useLocalDedupe: true,
    configs,
  });
}

export function trackGtmPurchase({
  transactionId,
  currency,
  value,
  items,
  coupon,
  paymentProvider,
  paymentType,
  configs,
}: {
  transactionId: string;
  currency?: string;
  value?: number;
  items: GtmItem[];
  coupon?: string;
  paymentProvider?: string;
  paymentType?: string;
  configs?: Record<string, string>;
}) {
  const sessionId = getTrackingSessionId();
  const normalizedCurrency = String(currency || '')
    .trim()
    .toUpperCase();
  // Use a client-specific dedupe key so browser-side audit rows do not suppress
  // server-confirmed purchase rows (which are more trustworthy for optimization).
  const dedupeKey = buildDedupeKey('purchase', 'client', transactionId);

  trackTemplateEvent({
    eventName: 'purchase',
    dedupeKey,
    sessionId,
    orderNo: transactionId,
    properties: {
      transaction_id: transactionId,
      currency: normalizedCurrency || undefined,
      value,
      coupon,
      items,
      payment_provider: paymentProvider,
      payment_type: paymentType,
    },
    gtmPayload: {
      transaction_id: transactionId,
      currency: normalizedCurrency || undefined,
      value,
      coupon,
      items,
      payment_provider: paymentProvider,
      payment_type: paymentType,
    },
    resetEcommerce: true,
    useLocalDedupe: true,
    configs,
  });
}

export function trackGtmGenerateContentStarted({
  contentType,
  provider,
  model,
  mode,
  costCredits,
  promptLength,
  taskId,
  configs,
}: {
  contentType: string;
  provider?: string;
  model?: string;
  mode?: string;
  costCredits?: number;
  promptLength?: number;
  taskId?: string;
  configs?: Record<string, string>;
}) {
  const sessionId = getTrackingSessionId();
  const timeBucket = Math.floor(Date.now() / GENERATE_WINDOW_MS);
  const dedupeKey = taskId
    ? buildDedupeKey('generate_content_started', taskId)
    : buildDedupeKey(
        'generate_content_started',
        sessionId,
        hashTrackingValue([contentType, provider, model, mode, promptLength]),
        timeBucket
      );

  trackTemplateEvent({
    eventName: 'generate_content_started',
    dedupeKey,
    sessionId,
    taskId,
    properties: {
      media_type: contentType,
      provider,
      model,
      scene: mode,
      cost_credits: costCredits,
      prompt_length: promptLength,
    },
    gtmPayload: {
      content_type: contentType,
      provider,
      model,
      mode,
      cost_credits: costCredits,
      prompt_length: promptLength,
    },
    shouldPostToServer: false,
    useLocalDedupe: true,
    configs,
  });
}

export function trackGtmGenerateContentCompleted({
  contentType,
  provider,
  model,
  mode,
  costCredits,
  promptLength,
  outputCount,
  taskId,
  configs,
}: {
  contentType: string;
  provider?: string;
  model?: string;
  mode?: string;
  costCredits?: number;
  promptLength?: number;
  outputCount?: number;
  taskId?: string;
  configs?: Record<string, string>;
}) {
  const sessionId = getTrackingSessionId();
  const timeBucket = Math.floor(Date.now() / GENERATE_WINDOW_MS);
  const dedupeKey = taskId
    ? buildDedupeKey('generate_content_completed', taskId)
    : buildDedupeKey(
        'generate_content_completed',
        sessionId,
        hashTrackingValue([
          contentType,
          provider,
          model,
          mode,
          promptLength,
          outputCount,
        ]),
        timeBucket
      );

  trackTemplateEvent({
    eventName: 'generate_content_completed',
    dedupeKey,
    sessionId,
    taskId,
    properties: {
      media_type: contentType,
      provider,
      model,
      scene: mode,
      cost_credits: costCredits,
      prompt_length: promptLength,
      output_count: outputCount,
    },
    gtmPayload: {
      content_type: contentType,
      provider,
      model,
      mode,
      cost_credits: costCredits,
      prompt_length: promptLength,
      output_count: outputCount,
    },
    shouldPostToServer: false,
    useLocalDedupe: !!taskId,
    configs,
  });
}

export function trackGtmActivation({
  contentType,
  provider,
  model,
  mode,
  userId,
}: {
  contentType: string;
  provider?: string;
  model?: string;
  mode?: string;
  userId?: string | null;
}) {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }

  const trackedKey = getActivationTrackedStorageKey(userId || undefined);
  if (storage.getItem(trackedKey) === '1') {
    return false;
  }

  trackGtmEvent('activation', {
    content_type: contentType,
    provider,
    model,
    mode,
  });
  storage.setItem(trackedKey, '1');

  return true;
}

export function trackGtmQueueEvent({
  eventName,
  queueId,
  mediaType,
  waitMs,
  remainingMs,
  snapshotDigest,
  configs,
}: {
  eventName: QueueTrackingEventName;
  queueId: string;
  mediaType: 'image' | 'video';
  waitMs: number;
  remainingMs?: number;
  snapshotDigest?: string;
  configs?: Record<string, string>;
}) {
  if (!queueId) {
    return;
  }

  const sessionId = getTrackingSessionId();
  const dedupeKey = buildDedupeKey(eventName, queueId);

  trackTemplateEvent({
    eventName,
    dedupeKey,
    sessionId,
    properties: {
      queue_id: queueId,
      media_type: mediaType,
      wait_ms: waitMs,
      remaining_ms: remainingMs,
      snapshot_digest: snapshotDigest,
    },
    gtmPayload: {
      queue_id: queueId,
      media_type: mediaType,
      wait_ms: waitMs,
      remaining_ms: remainingMs,
      snapshot_digest: snapshotDigest,
    },
    useLocalDedupe: true,
    configs,
  });
}
