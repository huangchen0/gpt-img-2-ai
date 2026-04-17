import { enforceMinIntervalRateLimit } from '@/shared/lib/rate-limit';
import { respData, respErr } from '@/shared/lib/resp';
import { recordSiteActivity } from '@/shared/models/site_activity';
import { getUserInfo } from '@/shared/models/user';

const MAX_BODY_BYTES = 8 * 1024;
const MAX_VISITOR_ID_LENGTH = 191;
const MAX_PATHNAME_LENGTH = 255;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeVisitorId(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, MAX_VISITOR_ID_LENGTH);
}

function sanitizePathname(value: unknown) {
  if (typeof value !== 'string') {
    return '/';
  }

  const trimmed = value.trim().slice(0, MAX_PATHNAME_LENGTH);
  if (!trimmed) {
    return '/';
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export async function POST(req: Request) {
  const limited = enforceMinIntervalRateLimit(req, {
    intervalMs: Number(process.env.SITE_ACTIVITY_API_MIN_INTERVAL_MS) || 300,
    keyPrefix: 'site-activity-api',
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
    if (contentLength > MAX_BODY_BYTES) {
      return respErr('payload too large');
    }

    const rawBody = await req.text();
    if (!rawBody) {
      return respErr('payload is required');
    }

    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
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

    const visitorId = sanitizeVisitorId(parsedBody.visitor_id);
    if (!visitorId) {
      return respErr('visitor_id is required');
    }

    const pathname = sanitizePathname(parsedBody.pathname);
    const user = await getUserInfo();
    const result = await recordSiteActivity({
      visitorId,
      userId: user?.id || null,
      path: pathname,
    });

    return respData(result);
  } catch (e: any) {
    console.log('record site activity failed:', e);
    return respErr(e.message);
  }
}
