import { getUuid } from '@/shared/lib/hash';
import { getCurrentSiteCode } from '@/shared/lib/site';
import { Configs, getAllConfigs } from '@/shared/models/config';
import {
  createTrackingEventIfNotExists,
  TrackingEventStatus,
  updateTrackingEventById,
} from '@/shared/models/tracking_event';
import { touchUserSiteContext } from '@/shared/models/user';

import {
  CLIENT_GA4_FORWARD_EVENT_NAMES,
  isAuditedTrackingEventName,
  SERVER_GA4_FORWARD_EVENT_NAMES,
  TrackEventInput,
} from './types';

interface TrackServerResult {
  ok: boolean;
  deduped: boolean;
  audited: boolean;
  forwarded: boolean;
  eventId?: string;
}

function shouldAuditEvent(input: TrackEventInput) {
  if (typeof input.shouldAudit === 'boolean') {
    return input.shouldAudit;
  }

  return isAuditedTrackingEventName(input.eventName);
}

function shouldForwardEventToGa4(input: TrackEventInput, configs: Configs) {
  if (typeof input.shouldForwardToGa4 === 'boolean') {
    return input.shouldForwardToGa4;
  }

  if (String(configs.google_tag_manager_id || configs.gtm_id || '').trim()) {
    return false;
  }

  if (input.source === 'client') {
    return CLIENT_GA4_FORWARD_EVENT_NAMES.includes(input.eventName as any);
  }

  return SERVER_GA4_FORWARD_EVENT_NAMES.includes(input.eventName as any);
}

function getGa4ClientId(input: TrackEventInput) {
  if (input.clientId) {
    return input.clientId;
  }

  if (input.sessionId) {
    return `session.${input.sessionId}`;
  }

  if (input.userId) {
    return `user.${input.userId}`;
  }

  return `server.${getUuid()}`;
}

async function forwardToGa4({
  input,
  configs,
  eventId,
}: {
  input: TrackEventInput;
  configs: Configs;
  eventId: string;
}) {
  const measurementId = String(configs.google_analytics_id || '').trim();
  const apiSecret = String(configs.ga4_api_secret || '').trim();

  if (!measurementId || !apiSecret) {
    return {
      attempted: false,
      success: false,
    };
  }

  const endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
    measurementId
  )}&api_secret=${encodeURIComponent(apiSecret)}`;

  const payload = {
    client_id: getGa4ClientId(input),
    user_id: input.userId || undefined,
    timestamp_micros: (input.occurredAt || new Date()).getTime() * 1000,
    events: [
      {
        name: input.eventName,
        params: {
          ...(input.properties || {}),
          event_id: eventId,
          dedupe_key: input.dedupeKey,
          source: input.source || 'server',
          order_no: input.orderNo || undefined,
          task_id: input.taskId || undefined,
          session_id: input.sessionId || undefined,
          utm_source: input.attribution?.utm_source || undefined,
          referrer_domain: input.attribution?.referrer_domain || undefined,
          gclid: input.attribution?.gclid || undefined,
          gbraid: input.attribution?.gbraid || undefined,
          wbraid: input.attribution?.wbraid || undefined,
          engagement_time_msec: 1,
        },
      },
    ],
  };

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return {
    attempted: true,
    success: resp.ok,
  };
}

export async function trackServerEvent(
  input: TrackEventInput,
  configs?: Configs
): Promise<TrackServerResult> {
  const eventId = input.eventId || getUuid();
  const occurredAt = input.occurredAt || new Date();
  const audited = shouldAuditEvent(input);
  const site = getCurrentSiteCode();

  try {
    if (input.userId) {
      await touchUserSiteContext(input.userId, {
        site,
        occurredAt,
      });
    }

    const finalConfigs = configs || (await getAllConfigs());
    if (finalConfigs.tracking_enabled === 'false') {
      return {
        ok: true,
        deduped: false,
        audited: false,
        forwarded: false,
        eventId,
      };
    }

    const shouldForwardToGa4 = shouldForwardEventToGa4(input, finalConfigs);
    const payload = JSON.stringify({
      eventName: input.eventName,
      dedupeKey: input.dedupeKey,
      source: input.source || 'server',
      site,
      properties: input.properties || {},
      attribution: input.attribution || {},
      occurredAt: occurredAt.toISOString(),
      shouldAudit: audited,
      shouldForwardToGa4,
    });

    let trackingRecordId: string | null = null;
    if (audited) {
      const { created, event } = await createTrackingEventIfNotExists({
        id: getUuid(),
        eventId,
        eventName: input.eventName,
        dedupeKey: input.dedupeKey,
        source: input.source || 'server',
        site,
        userId: input.userId || null,
        sessionId: input.sessionId || null,
        orderNo: input.orderNo || null,
        taskId: input.taskId || null,
        status: TrackingEventStatus.QUEUED,
        payload,
        error: null,
        createdAt: occurredAt,
        updatedAt: occurredAt,
      });

      if (!created) {
        return {
          ok: true,
          deduped: true,
          audited: true,
          forwarded: false,
          eventId: event.eventId,
        };
      }

      trackingRecordId = event.id;
    }

    let forwarded = false;
    let nextStatus: TrackingEventStatus = shouldForwardToGa4
      ? TrackingEventStatus.SENT
      : TrackingEventStatus.SKIPPED;
    let error: string | null = null;

    if (shouldForwardToGa4) {
      try {
        const forwardResult = await forwardToGa4({
          input,
          configs: finalConfigs,
          eventId,
        });
        forwarded = forwardResult.success;
        if (forwardResult.attempted) {
          nextStatus = forwardResult.success
            ? TrackingEventStatus.SENT
            : TrackingEventStatus.FAILED;
        } else {
          nextStatus = TrackingEventStatus.SKIPPED;
        }
      } catch (err: any) {
        nextStatus = TrackingEventStatus.FAILED;
        error = err?.message || 'ga4_forward_failed';
      }
    }

    if (trackingRecordId) {
      await updateTrackingEventById(trackingRecordId, {
        status: nextStatus,
        error,
        updatedAt: new Date(),
      });
    }

    return {
      ok: true,
      deduped: false,
      audited,
      forwarded,
      eventId,
    };
  } catch (err) {
    console.log('track server event failed:', err);
    return {
      ok: false,
      deduped: false,
      audited,
      forwarded: false,
      eventId,
    };
  }
}
