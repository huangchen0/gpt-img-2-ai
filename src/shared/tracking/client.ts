'use client';

import { getUuid, md5 } from '@/shared/lib/hash';

import {
  isTrackingEventName,
  TemplateTrackingEventName,
  TrackingAttribution,
} from './types';

const TRACKING_SESSION_KEY = 'tracking_session_id';

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function getRandomId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return getUuid();
}

export function getTrackingSessionId() {
  if (typeof window === 'undefined') {
    return '';
  }

  const existing = window.sessionStorage.getItem(TRACKING_SESSION_KEY);
  if (existing) {
    return existing;
  }

  const next = getRandomId();
  window.sessionStorage.setItem(TRACKING_SESSION_KEY, next);
  return next;
}

export function hashTrackingValue(value: unknown) {
  return md5(JSON.stringify(value ?? ''));
}

export function buildDedupeKey(...parts: Array<unknown>) {
  return parts
    .map((part) => {
      if (part === undefined || part === null) {
        return '';
      }

      return String(part).trim().replace(/\s+/g, '_');
    })
    .filter(Boolean)
    .join(':');
}

function shouldTrack(configs?: Record<string, string>) {
  return configs?.tracking_enabled !== 'false';
}

function getLocalDedupeStorageKey(
  eventName: TemplateTrackingEventName,
  key: string
) {
  return `tracking:${eventName}:${key}`;
}

function hasLocalDedupeHit(eventName: TemplateTrackingEventName, key: string) {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.localStorage.getItem(getLocalDedupeStorageKey(eventName, key)) ===
    '1'
  );
}

function markLocalDedupeHit(eventName: TemplateTrackingEventName, key: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getLocalDedupeStorageKey(eventName, key), '1');
}

function pushDataLayerEvent({
  eventName,
  payload,
  resetEcommerce,
}: {
  eventName: TemplateTrackingEventName;
  payload: Record<string, unknown>;
  resetEcommerce?: boolean;
}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  if (resetEcommerce) {
    window.dataLayer.push({ ecommerce: null });
  }

  window.dataLayer.push({
    event: eventName,
    ...payload,
  });
}

function postTrackingEvent(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') {
    return;
  }

  const body = JSON.stringify(payload);
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.sendBeacon === 'function'
  ) {
    const blob = new Blob([body], { type: 'application/json' });
    const queued = navigator.sendBeacon('/api/track', blob);
    if (queued) {
      return;
    }
  }

  void fetch('/api/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    keepalive: true,
  });
}

export function trackTemplateEvent({
  eventName,
  dedupeKey,
  properties,
  attribution,
  gtmPayload,
  resetEcommerce,
  shouldPushToDataLayer = true,
  shouldPostToServer = true,
  useLocalDedupe = false,
  sessionId,
  orderNo,
  taskId,
  configs,
}: {
  eventName: TemplateTrackingEventName;
  dedupeKey: string;
  properties?: Record<string, unknown>;
  attribution?: TrackingAttribution;
  gtmPayload?: Record<string, unknown>;
  resetEcommerce?: boolean;
  shouldPushToDataLayer?: boolean;
  shouldPostToServer?: boolean;
  useLocalDedupe?: boolean;
  sessionId?: string;
  orderNo?: string;
  taskId?: string;
  configs?: Record<string, string>;
}) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!isTrackingEventName(eventName) || !dedupeKey || !shouldTrack(configs)) {
    return;
  }

  if (useLocalDedupe && hasLocalDedupeHit(eventName, dedupeKey)) {
    return;
  }

  const eventId = getRandomId();
  const finalSessionId = sessionId || getTrackingSessionId();

  if (shouldPushToDataLayer) {
    pushDataLayerEvent({
      eventName,
      payload: {
        ...(gtmPayload || {}),
        event_id: eventId,
        dedupe_key: dedupeKey,
        session_id: finalSessionId,
      },
      resetEcommerce,
    });
  }

  if (shouldPostToServer) {
    postTrackingEvent({
      event_name: eventName,
      event_id: eventId,
      dedupe_key: dedupeKey,
      session_id: finalSessionId,
      order_no: orderNo,
      task_id: taskId,
      properties: properties || {},
      attribution: attribution || {},
    });
  }

  if (useLocalDedupe) {
    markLocalDedupeHit(eventName, dedupeKey);
  }
}
