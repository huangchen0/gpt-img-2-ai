import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { credit, dailyCheckin } from '@/config/db/schema';
import { getSnowId, getUuid } from '@/shared/lib/hash';

import {
  calculateCreditExpirationTime,
  CreditStatus,
  CreditTransactionScene,
  CreditTransactionType,
} from './credit';

export type DailyCheckin = typeof dailyCheckin.$inferSelect;
type CheckinUser = {
  id: string;
  email?: string | null;
};

function getDateKey(offsetMinutes = 0) {
  const offsetMs = offsetMinutes * 60 * 1000;
  return new Date(Date.now() + offsetMs).toISOString().slice(0, 10);
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function getDailyCheckinStatus(userId: string) {
  const { getAllConfigs } = await import('./config');
  const configs = await getAllConfigs();
  const timezoneOffsetMinutes = parseInt(
    configs.daily_checkin_timezone_offset_minutes || '0',
    10
  );
  const today = getDateKey(
    Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : 0
  );

  const [todayCheckin] = await db()
    .select()
    .from(dailyCheckin)
    .where(
      and(eq(dailyCheckin.userId, userId), eq(dailyCheckin.checkinDate, today))
    )
    .limit(1);

  const [latestCheckin] = await db()
    .select()
    .from(dailyCheckin)
    .where(eq(dailyCheckin.userId, userId))
    .orderBy(desc(dailyCheckin.createdAt))
    .limit(1);

  return {
    checkedInToday: Boolean(todayCheckin),
    today,
    latestCheckin,
  };
}

export async function claimDailyCheckinCredits({
  user,
  configs,
}: {
  user: CheckinUser;
  configs: Record<string, string>;
}) {
  if (configs.daily_checkin_enabled === 'false') {
    throw new Error('daily check-in is disabled');
  }

  const credits = parsePositiveInt(configs.daily_checkin_credits, 10);
  const timezoneOffsetMinutes = parseInt(
    configs.daily_checkin_timezone_offset_minutes || '0',
    10
  );
  const today = getDateKey(
    Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : 0
  );

  return db().transaction(async (tx: any) => {
    const [checkinRecord] = await tx
      .insert(dailyCheckin)
      .values({
        id: getUuid(),
        userId: user.id,
        checkinDate: today,
        credits,
      })
      .onConflictDoNothing()
      .returning();

    if (!checkinRecord) {
      throw new Error('already checked in today');
    }

    const [creditRecord] = await tx
      .insert(credit)
      .values({
        id: getUuid(),
        userId: user.id,
        userEmail: user.email,
        orderNo: '',
        subscriptionNo: '',
        transactionNo: getSnowId(),
        transactionType: CreditTransactionType.GRANT,
        transactionScene: CreditTransactionScene.REWARD,
        credits,
        remainingCredits: credits,
        description: 'Daily check-in reward',
        expiresAt: calculateCreditExpirationTime({ creditsValidDays: 0 }),
        status: CreditStatus.ACTIVE,
        metadata: JSON.stringify({
          type: 'daily-checkin',
          checkinId: checkinRecord.id,
          checkinDate: today,
        }),
      })
      .returning();

    await tx
      .update(dailyCheckin)
      .set({ creditId: creditRecord.id })
      .where(eq(dailyCheckin.id, checkinRecord.id));

    return {
      checkin: checkinRecord,
      credit: creditRecord,
      checkedInToday: true,
      credits,
      today,
    };
  });
}
