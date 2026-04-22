import { PaymentType } from '@/extensions/payment/types';
import { respData, respErr } from '@/shared/lib/resp';
import { findOrderByOrderNo, OrderStatus } from '@/shared/models/order';
import { getUserInfo } from '@/shared/models/user';
import { syncCheckoutOrderPaymentStatus } from '@/shared/services/payment';

const CHECKOUT_RECOVERY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function getFallbackRedirectUrl(
  order: Awaited<ReturnType<typeof findOrderByOrderNo>>
) {
  if (!order) {
    return '/pricing';
  }

  if (order.callbackUrl) {
    return order.callbackUrl;
  }

  return order.paymentType === PaymentType.SUBSCRIPTION
    ? '/settings/billing'
    : '/settings/payments';
}

export async function POST(req: Request) {
  try {
    const { order_no } = await req.json();
    const orderNo = String(order_no || '').trim();
    if (!orderNo) {
      return respErr('order_no is required');
    }

    const user = await getUserInfo();
    if (!user || !user.email) {
      return respErr('no auth, please sign in');
    }

    const order = await findOrderByOrderNo(orderNo);
    if (!order) {
      return respErr('order not found');
    }

    if (order.userId !== user.id) {
      return respErr('order and user not match');
    }

    const { order: syncedOrder } = await syncCheckoutOrderPaymentStatus({
      order,
    });

    if (syncedOrder.status === OrderStatus.PAID) {
      return respData({
        orderNo: syncedOrder.orderNo,
        status: syncedOrder.status,
        redirectUrl: getFallbackRedirectUrl(syncedOrder),
      });
    }

    if (syncedOrder.status !== OrderStatus.CREATED) {
      return respErr('checkout is not available for this order');
    }

    if (!syncedOrder.checkoutUrl || !syncedOrder.paymentSessionId) {
      return respErr('checkout session not found');
    }

    const createdAtMs = syncedOrder.createdAt
      ? new Date(syncedOrder.createdAt).getTime()
      : Number.NaN;
    if (
      Number.isFinite(createdAtMs) &&
      Date.now() - createdAtMs > CHECKOUT_RECOVERY_MAX_AGE_MS
    ) {
      return respErr('checkout session expired, please choose a plan again');
    }

    return respData({
      orderNo: syncedOrder.orderNo,
      status: syncedOrder.status,
      checkoutUrl: syncedOrder.checkoutUrl,
      productName: syncedOrder.productName,
      productId: syncedOrder.productId,
      amount: syncedOrder.amount,
      currency: syncedOrder.currency,
      paymentType: syncedOrder.paymentType,
      paymentProvider: syncedOrder.paymentProvider,
    });
  } catch (e: any) {
    console.log('recover checkout failed:', e);
    return respErr('recover checkout failed: ' + e.message);
  }
}
