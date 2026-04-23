import { and, count, eq, inArray, like, ne, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  credit,
  order as orderTable,
  referral,
  referralRewardDaily,
  user as userTable,
} from '@/config/db/schema';
import { PaymentType } from '@/extensions/payment/types';
import { getCookieFromCtx, getHeaderValue } from '@/shared/lib/cookie';
import { getSnowId, getUuid } from '@/shared/lib/hash';
import { REFERRAL_COOKIE_NAME } from '@/shared/lib/referral';

import {
  calculateCreditExpirationTime,
  CreditStatus,
  CreditTransactionScene,
  CreditTransactionType,
  type NewCredit,
} from './credit';
import {
  createUserReferralCode,
  findUserByReferralCode,
  type User,
} from './user';

export type Referral = typeof referral.$inferSelect;

const REFERRAL_SUBSCRIPTION_BONUS_TYPE = 'referral_subscription_bonus';

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
  const signupRewardEnabled = configs.referral_reward_enabled !== 'false';
  const subscriptionBonusEnabled =
    configs.referral_subscription_bonus_enabled !== 'false';

  if (!signupRewardEnabled && !subscriptionBonusEnabled) {
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

  const rewardCredits = signupRewardEnabled
    ? parsePositiveInt(configs.referral_reward_credits, 10)
    : 0;
  const dailyLimit = parsePositiveInt(configs.referral_daily_limit, 3);
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
    const [referralRecord] = await tx
      .insert(referral)
      .values({
        id: getUuid(),
        referrerUserId: referrer.id,
        referredUserId: user.id,
        referralCode,
        rewardCredits,
        rewardStatus: signupRewardEnabled ? 'pending' : 'disabled',
        ip: user.ip || '',
        userAgent: (getHeaderValue(ctx, 'user-agent') || '').slice(0, 500),
      })
      .onConflictDoNothing()
      .returning();

    if (!referralRecord) {
      return null;
    }

    if (!signupRewardEnabled) {
      return { referral: referralRecord, credit: null };
    }

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
      await tx
        .update(referral)
        .set({ rewardStatus: 'limited' })
        .where(eq(referral.id, referralRecord.id));

      return { referral: referralRecord, credit: null };
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
  const [row, bonusRow] = await Promise.all([
    db()
      .select({
        invitedCount: count(),
        rewardCredits: sql<number>`coalesce(sum(case when ${referral.rewardStatus} = 'paid' then ${referral.rewardCredits} else 0 end), 0)`,
      })
      .from(referral)
      .where(eq(referral.referrerUserId, userId)),
    db()
      .select({
        rewardCredits: sql<number>`coalesce(sum(${credit.credits}), 0)`,
      })
      .from(credit)
      .where(
        and(
          eq(credit.userId, userId),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.transactionScene, CreditTransactionScene.REWARD),
          eq(credit.status, CreditStatus.ACTIVE),
          like(
            credit.metadata,
            `%"type":"${REFERRAL_SUBSCRIPTION_BONUS_TYPE}"%`
          ),
          like(credit.metadata, `%"role":"referrer"%`)
        )
      ),
  ]);

  const signupRewardCredits = Number(row[0]?.rewardCredits || 0);
  const subscriptionRewardCredits = Number(bonusRow[0]?.rewardCredits || 0);

  return {
    invitedCount: Number(row[0]?.invitedCount || 0),
    rewardCredits: signupRewardCredits + subscriptionRewardCredits,
    signupRewardCredits,
    subscriptionRewardCredits,
  };
}

export async function buildReferralSubscriptionBonusCredits({
  tx,
  referredUserId,
  referredUserEmail,
  orderNo,
  subscriptionNo,
  baseCredits,
  creditsValidDays,
  currentPeriodEnd,
  configs,
}: {
  tx: any;
  referredUserId: string;
  referredUserEmail?: string | null;
  orderNo: string;
  subscriptionNo?: string | null;
  baseCredits: number;
  creditsValidDays: number;
  currentPeriodEnd?: Date;
  configs: Record<string, string>;
}): Promise<NewCredit[]> {
  if (configs.referral_subscription_bonus_enabled === 'false') {
    return [];
  }

  if (!referredUserId || !orderNo || !baseCredits || baseCredits <= 0) {
    return [];
  }

  const bonusPercent = parsePositiveInt(
    configs.referral_subscription_bonus_percent,
    20
  );
  const bonusCredits = Math.floor((baseCredits * bonusPercent) / 100);
  if (bonusCredits <= 0) {
    return [];
  }

  const [referralRecord] = await tx
    .select()
    .from(referral)
    .where(eq(referral.referredUserId, referredUserId))
    .limit(1)
    .for('update');

  if (!referralRecord) {
    return [];
  }

  const [previousSubscriptionOrder] = await tx
    .select({ id: orderTable.id })
    .from(orderTable)
    .where(
      and(
        eq(orderTable.userId, referredUserId),
        eq(orderTable.status, 'paid'),
        inArray(orderTable.paymentType, [
          PaymentType.SUBSCRIPTION,
          PaymentType.RENEW,
        ]),
        ne(orderTable.orderNo, orderNo)
      )
    )
    .limit(1);

  if (previousSubscriptionOrder) {
    return [];
  }

  const [existingBonus] = await tx
    .select({ id: credit.id })
    .from(credit)
    .where(
      and(
        eq(credit.transactionType, CreditTransactionType.GRANT),
        eq(credit.transactionScene, CreditTransactionScene.REWARD),
        like(credit.metadata, `%"type":"${REFERRAL_SUBSCRIPTION_BONUS_TYPE}"%`),
        like(credit.metadata, `%"referralId":"${referralRecord.id}"%`)
      )
    )
    .limit(1);

  if (existingBonus) {
    return [];
  }

  const [referrer] = await tx
    .select()
    .from(userTable)
    .where(eq(userTable.id, referralRecord.referrerUserId))
    .limit(1);

  if (!referrer || referrer.id === referredUserId) {
    return [];
  }

  const expiresAt = calculateCreditExpirationTime({
    creditsValidDays,
    currentPeriodEnd,
  });

  const sharedMetadata = {
    type: REFERRAL_SUBSCRIPTION_BONUS_TYPE,
    referralId: referralRecord.id,
    orderNo,
    referredUserId,
    referrerUserId: referrer.id,
    baseCredits,
    bonusCredits,
    bonusPercent,
    scope: 'first_subscription_purchase',
  };

  return [
    {
      id: getUuid(),
      userId: referredUserId,
      userEmail: referredUserEmail || '',
      orderNo,
      subscriptionNo: subscriptionNo || '',
      transactionNo: getSnowId(),
      transactionType: CreditTransactionType.GRANT,
      transactionScene: CreditTransactionScene.REWARD,
      credits: bonusCredits,
      remainingCredits: bonusCredits,
      description: 'Referral first subscription bonus',
      expiresAt,
      status: CreditStatus.ACTIVE,
      metadata: JSON.stringify({
        ...sharedMetadata,
        role: 'referred',
        dedupeKey: `${REFERRAL_SUBSCRIPTION_BONUS_TYPE}:${referralRecord.id}:referred`,
      }),
    },
    {
      id: getUuid(),
      userId: referrer.id,
      userEmail: referrer.email,
      orderNo,
      subscriptionNo: subscriptionNo || '',
      transactionNo: getSnowId(),
      transactionType: CreditTransactionType.GRANT,
      transactionScene: CreditTransactionScene.REWARD,
      credits: bonusCredits,
      remainingCredits: bonusCredits,
      description: 'Referral first subscription reward',
      expiresAt,
      status: CreditStatus.ACTIVE,
      metadata: JSON.stringify({
        ...sharedMetadata,
        role: 'referrer',
        dedupeKey: `${REFERRAL_SUBSCRIPTION_BONUS_TYPE}:${referralRecord.id}:referrer`,
      }),
    },
  ];
}
