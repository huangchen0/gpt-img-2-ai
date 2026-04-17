import { enforceMinIntervalRateLimit } from '@/shared/lib/rate-limit';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { trackServerEvent } from '@/shared/tracking/server';
import { isTrackingEventName } from '@/shared/tracking/types';

const MAX_TRACK_BODY_BYTES = 16 * 1024;
const MAX_TRACK_FIELD_LENGTH = 191;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateNullableStringField(
  value: unknown,
  fieldName: string
): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }

  if (value.length > MAX_TRACK_FIELD_LENGTH) {
    return `${fieldName} is too long`;
  }

  return null;
}

export async function POST(req: Request) {
  const limited = enforceMinIntervalRateLimit(req, {
    intervalMs: Number(process.env.TRACK_API_MIN_INTERVAL_MS) || 300,
    keyPrefix: 'track-api',
  });
  if (limited) {
    return limited;
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return respErr('content-type must be application/json');
    }

    const contentLength = Number(req.headers.get('content-length') || '0');
    if (contentLength > MAX_TRACK_BODY_BYTES) {
      return respErr('payload too large');
    }

    const rawBody = await req.text();
    if (!rawBody) {
      return respErr('payload is required');
    }

    if (new TextEncoder().encode(rawBody).length > MAX_TRACK_BODY_BYTES) {
      return respErr('payload too large');
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return respErr('invalid json payload');
    }

    if (!isPlainRecord(parsedBody)) {
      return respErr('invalid payload');
    }

    const {
      event_name,
      event_id,
      dedupe_key,
      session_id,
      order_no,
      task_id,
      properties,
      attribution,
    } = parsedBody;

    if (typeof event_name !== 'string' || !isTrackingEventName(event_name)) {
      return respErr('invalid event_name');
    }

    if (typeof dedupe_key !== 'string' || !dedupe_key) {
      return respErr('dedupe_key is required');
    }

    if (dedupe_key.length > MAX_TRACK_FIELD_LENGTH) {
      return respErr('dedupe_key is too long');
    }

    const eventIdError = validateNullableStringField(event_id, 'event_id');
    if (eventIdError) {
      return respErr(eventIdError);
    }

    const sessionIdError = validateNullableStringField(
      session_id,
      'session_id'
    );
    if (sessionIdError) {
      return respErr(sessionIdError);
    }

    const orderNoError = validateNullableStringField(order_no, 'order_no');
    if (orderNoError) {
      return respErr(orderNoError);
    }

    const taskIdError = validateNullableStringField(task_id, 'task_id');
    if (taskIdError) {
      return respErr(taskIdError);
    }

    if (properties !== undefined && !isPlainRecord(properties)) {
      return respErr('properties must be an object');
    }

    if (attribution !== undefined && !isPlainRecord(attribution)) {
      return respErr('attribution must be an object');
    }

    const user = await getUserInfo();

    const result = await trackServerEvent({
      eventName: event_name,
      eventId: (event_id as string) || undefined,
      dedupeKey: dedupe_key,
      source: 'client',
      sessionId: (session_id as string) || null,
      orderNo: (order_no as string) || null,
      taskId: (task_id as string) || null,
      userId: user?.id || null,
      properties: (properties as Record<string, unknown>) || {},
      attribution: (attribution as Record<string, unknown>) || {},
    });

    return respData(result);
  } catch (e: any) {
    console.log('track event failed:', e);
    return respErr(e.message);
  }
}
