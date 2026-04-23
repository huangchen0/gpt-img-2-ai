import { and, count, eq, gt } from 'drizzle-orm';

import { db } from '@/core/db';
import { order } from '@/config/db/schema';
import { PaymentType } from '@/extensions/payment/types';

import { OrderStatus } from './order';
import { getCurrentSubscription, type Subscription } from './subscription';

export interface PaidEntitlement {
  hasPaidEntitlement: boolean;
  hasPaidCreditOrder: boolean;
  subscription: Subscription | null;
}

async function hasPaidCreditPackOrder(userId: string) {
  const [result] = await db()
    .select({ count: count() })
    .from(order)
    .where(
      and(
        eq(order.userId, userId),
        eq(order.status, OrderStatus.PAID),
        eq(order.paymentType, PaymentType.ONE_TIME),
        gt(order.creditsAmount, 0)
      )
    );

  return (result?.count || 0) > 0;
}

export async function getPaidEntitlement(
  userId: string
): Promise<PaidEntitlement> {
  if (!userId) {
    return {
      hasPaidEntitlement: false,
      hasPaidCreditOrder: false,
      subscription: null,
    };
  }

  const [subscription, hasPaidCreditOrder] = await Promise.all([
    getCurrentSubscription(userId),
    hasPaidCreditPackOrder(userId),
  ]);

  return {
    hasPaidEntitlement: Boolean(subscription || hasPaidCreditOrder),
    hasPaidCreditOrder,
    subscription: subscription ?? null,
  };
}

export async function hasPaidEntitlement(userId: string) {
  const entitlement = await getPaidEntitlement(userId);
  return entitlement.hasPaidEntitlement;
}
