import { respData, respErr } from '@/shared/lib/resp';
import { getAllConfigsUncached } from '@/shared/models/config';
import { getRemainingCredits } from '@/shared/models/credit';
import { claimDailyCheckinCredits } from '@/shared/models/daily-checkin';
import { getUserInfo } from '@/shared/models/user';

export async function POST() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth');
    }

    const configs = await getAllConfigsUncached();
    const result = await claimDailyCheckinCredits({ user, configs });
    const remainingCredits = await getRemainingCredits(user.id);

    return respData({
      ...result,
      remainingCredits,
    });
  } catch (e: any) {
    console.log('daily check-in failed:', e);
    return respErr(e?.message || 'daily check-in failed');
  }
}
