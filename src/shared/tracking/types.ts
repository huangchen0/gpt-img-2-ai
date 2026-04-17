export const TEMPLATE_TRACKING_EVENT_NAMES = [
  'sign_up',
  'generate_content_started',
  'generate_content_completed',
  'add_to_cart',
  'begin_checkout',
  'purchase',
  'queue_shown',
  'queue_cancelled',
  'queue_completed',
  'queue_submit_started',
  'queue_upgrade_clicked',
  'queue_restored_after_refresh',
] as const;

export const AUDITED_TRACKING_EVENT_NAMES = [
  'sign_up',
  'add_to_cart',
  'begin_checkout',
  'purchase',
  'queue_shown',
  'queue_cancelled',
  'queue_completed',
  'queue_submit_started',
  'queue_upgrade_clicked',
  'queue_restored_after_refresh',
] as const;

export const CLIENT_GA4_FORWARD_EVENT_NAMES = [
  'add_to_cart',
  'begin_checkout',
] as const;

export const SERVER_GA4_FORWARD_EVENT_NAMES = ['sign_up', 'purchase'] as const;

export type TemplateTrackingEventName =
  (typeof TEMPLATE_TRACKING_EVENT_NAMES)[number];
export type AuditedTrackingEventName =
  (typeof AUDITED_TRACKING_EVENT_NAMES)[number];
export type TrackingEventSource = 'client' | 'server' | 'system';

export interface TrackingAttribution {
  utm_source?: string;
  referrer_domain?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
}

export interface TrackEventInput {
  eventName: TemplateTrackingEventName;
  dedupeKey: string;
  eventId?: string;
  source?: TrackingEventSource;
  userId?: string | null;
  sessionId?: string | null;
  orderNo?: string | null;
  taskId?: string | null;
  clientId?: string | null;
  occurredAt?: Date;
  properties?: Record<string, unknown>;
  attribution?: TrackingAttribution;
  shouldAudit?: boolean;
  shouldForwardToGa4?: boolean;
}

export function isTrackingEventName(
  value: string
): value is TemplateTrackingEventName {
  return TEMPLATE_TRACKING_EVENT_NAMES.includes(
    value as TemplateTrackingEventName
  );
}

export function isAuditedTrackingEventName(
  value: TemplateTrackingEventName
): value is AuditedTrackingEventName {
  return AUDITED_TRACKING_EVENT_NAMES.includes(
    value as AuditedTrackingEventName
  );
}
