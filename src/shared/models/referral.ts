import { and, count, eq, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { credit, referral, referralRewardDaily } from '@/config/db/schema';
import { getCookieFromCtx, getHeaderValue } from '@/shared/lib/cookie';
import { getSnowId, getUuid } from '@/shared/lib/hash';
import { REFERRAL_COOKIE_NAME } from '@/shared/lib/referral';

import {
  calculateCreditExpirationTime,
  CreditStatus,
  CreditTransactionScene,
  CreditTransactionType,
} from './credit';
import {
  createUserReferralCode,
  findUserByReferralCode,
  type User,
} from './user';

export type Referral = typeof referral.$inferSelect;

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sanitizeReferralCode(value: string | undefined) {
  if (!value) return '';

  const decoded = (() => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  })();

  return decoded
    .trim()
    .replace(/[^\w-]/g, '')
    .slice(0, 100);
}

function getDateKey(offsetMinutes = 0) {
  const offsetMs = offsetMinutes * 60 * 1000;
  return new Date(Date.now() + offsetMs).toISOString().slice(0, 10);
}

export function createReferralCode(
  userId: string,
  configs: Record<string, string> = {}
) {
  return createUserReferralCode(userId, configs.referral_code_prefix || 'r');
}

export async function grantReferralRewardForNewUser({
  user,
  ctx,
  configs,
}: {
  user: User;
  ctx?: any;
  configs: Record<string, string>;
}) {
  if (configs.referral_reward_enabled === 'false') {
    return null;
  }

  const referralCode = sanitizeReferralCode(
    getCookieFromCtx(ctx, REFERRAL_COOKIE_NAME)
  );
  if (!referralCode || referralCode === createReferralCode(user.id, configs)) {
    return null;
  }

  const referrer = await findUserByReferralCode(referralCode);
  if (!referrer || referrer.id === user.id) {
    return null;
  }

  const rewardCredits = parsePositiveInt(configs.referral_reward_credits, 60);
  const dailyLimit = parsePositiveInt(configs.referral_daily_limit, 5);
  const timezoneOffsetMinutes = parseInt(
    configs.referral_reward_timezone_offset_minutes ||
      configs.daily_checkin_timezone_offset_minutes ||
      '0',
    10
  );
  const rewardDate = getDateKey(
    Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : 0
  );
  const now = new Date();

  return db().transaction(async (tx: any) => {
    await tx
      .insert(referralRewardDaily)
      .values({
        id: getUuid(),
        referrerUserId: referrer.id,
        rewardDate,
        rewardCount: 0,
      })
      .onConflictDoNothing();

    const [dailyReward] = await tx
      .select()
      .from(referralRewardDaily)
      .where(
        and(
          eq(referralRewardDaily.referrerUserId, referrer.id),
          eq(referralRewardDaily.rewardDate, rewardDate)
        )
      )
      .limit(1)
      .for('update');

    if (!dailyReward || dailyReward.rewardCount >= dailyLimit) {
      return null;
    }

    const [referralRecord] = await tx
      .insert(referral)
      .values({
        id: getUuid(),
        referrerUserId: referrer.id,
        referredUserId: user.id,
        referralCode,
        rewardCredits,
        rewardStatus: 'pending',
        ip: user.ip || '',
        userAgent: (getHeaderValue(ctx, 'user-agent') || '').slice(0, 500),
      })
      .onConflictDoNothing()
      .returning();

    if (!referralRecord) {
      return null;
    }

    const [creditRecord] = await tx
      .insert(credit)
      .values({
        id: getUuid(),
        userId: referrer.id,
        userEmail: referrer.email,
        orderNo: '',
        subscriptionNo: '',
        transactionNo: getSnowId(),
        transactionType: CreditTransactionType.GRANT,
        transactionScene: CreditTransactionScene.REWARD,
        credits: rewardCredits,
        remainingCredits: rewardCredits,
        description: `Referral reward for inviting ${user.email}`,
        expiresAt: calculateCreditExpirationTime({ creditsValidDays: 0 }),
        status: CreditStatus.ACTIVE,
        metadata: JSON.stringify({
          type: 'referral',
          referralId: referralRecord.id,
          referredUserId: user.id,
        }),
      })
      .returning();

    await tx
      .update(referral)
      .set({
        rewardStatus: 'paid',
        creditId: creditRecord.id,
        rewardedAt: now,
      })
      .where(eq(referral.id, referralRecord.id));

    await tx
      .update(referralRewardDaily)
      .set({
        rewardCount: dailyReward.rewardCount + 1,
      })
      .where(eq(referralRewardDaily.id, dailyReward.id));

    return { referral: referralRecord, credit: creditRecord };
  });
}

export async function getReferralSummary(userId: string) {
  const [row] = await db()
    .select({
      invitedCount: count(),
      rewardCredits: sql<number>`coalesce(sum(${referral.rewardCredits}), 0)`,
    })
    .from(referral)
    .where(
      and(
        eq(referral.referrerUserId, userId),
        eq(referral.rewardStatus, 'paid')
      )
    );

  return {
    invitedCount: Number(row?.invitedCount || 0),
    rewardCredits: Number(row?.rewardCredits || 0),
  };
}
