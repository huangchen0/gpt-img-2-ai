import { respErr } from '@/shared/lib/resp';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';

export async function POST() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const subscription = await getCurrentSubscription(user.id);

    return Response.json({
      code: 0,
      message: 'ok',
      data: subscription ?? null,
    });
  } catch (e) {
    console.log('get current subscription failed:', e);
    return respErr('get current subscription failed');
  }
}
