import { respErr } from '@/shared/lib/resp';
import { findRecentAITaskForRecovery } from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';

const DEFAULT_RECOVERY_WINDOW_MS = 10 * 60 * 1000;
const CLIENT_REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const { mediaType, provider, model, clientRequestId, sinceMs } =
      await req.json();

    const normalizedClientRequestId =
      typeof clientRequestId === 'string' ? clientRequestId.trim() : '';

    if (
      !mediaType ||
      !provider ||
      !model ||
      !CLIENT_REQUEST_ID_PATTERN.test(normalizedClientRequestId)
    ) {
      return respErr('invalid params');
    }

    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const recoveryWindowMs =
      typeof sinceMs === 'number' &&
      Number.isFinite(sinceMs) &&
      sinceMs > 0 &&
      sinceMs <= DEFAULT_RECOVERY_WINDOW_MS
        ? sinceMs
        : DEFAULT_RECOVERY_WINDOW_MS;

    const task = await findRecentAITaskForRecovery({
      userId: user.id,
      mediaType,
      provider,
      model,
      clientRequestId: normalizedClientRequestId,
      since: new Date(Date.now() - recoveryWindowMs),
    });

    return Response.json({
      code: 0,
      message: 'ok',
      data: task || null,
    });
  } catch (error: any) {
    console.error('recover ai task failed', error);
    return respErr(error?.message || 'recover ai task failed');
  }
}
