import { respErr } from '@/shared/lib/resp';
import { getPaidEntitlement } from '@/shared/models/paid-entitlement';
import { getUserInfo } from '@/shared/models/user';

export async function POST() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const entitlement = await getPaidEntitlement(user.id);

    return Response.json({
      code: 0,
      message: 'ok',
      data: {
        subscription: entitlement.subscription,
        hasPaidEntitlement: entitlement.hasPaidEntitlement,
        hasPaidCreditOrder: entitlement.hasPaidCreditOrder,
      },
    });
  } catch (e) {
    console.log('get current subscription failed:', e);
    return respErr('get current subscription failed');
  }
}
