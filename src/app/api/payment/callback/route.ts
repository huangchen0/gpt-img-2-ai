import { NextResponse } from 'next/server';

import { envConfigs } from '@/config';
import { PaymentStatus, PaymentType } from '@/extensions/payment/types';
import {
  GTM_PENDING_PURCHASE_COOKIE,
  PendingGtmPurchasePayload,
} from '@/shared/lib/gtm';
import { findOrderByOrderNo } from '@/shared/models/order';
import { getUserInfo } from '@/shared/models/user';
import {
  getPaymentService,
  handleCheckoutSuccess,
} from '@/shared/services/payment';

export async function GET(req: Request) {
  let redirectUrl = `${envConfigs.app_url}/pricing`;
  let purchasePayload: PendingGtmPurchasePayload | null = null;

  try {
    // get callback params
    const { searchParams } = new URL(req.url);
    const orderNo = searchParams.get('order_no');

    if (!orderNo) {
      throw new Error('invalid callback params');
    }

    // get sign user
    const user = await getUserInfo();
    if (!user || !user.email) {
      throw new Error('no auth, please sign in');
    }

    // get order
    const order = await findOrderByOrderNo(orderNo);
    if (!order) {
      throw new Error('order not found');
    }

    // validate order and user
    if (!order.paymentSessionId || !order.paymentProvider) {
      throw new Error('invalid order');
    }

    if (order.userId !== user.id) {
      throw new Error('order and user not match');
    }

    const paymentService = await getPaymentService();

    const paymentProvider = paymentService.getProvider(order.paymentProvider);
    if (!paymentProvider) {
      throw new Error('payment provider not found');
    }

    // get payment session
    const session = await paymentProvider.getPaymentSession({
      sessionId: order.paymentSessionId,
    });

    // console.log('callback payment session', session);

    await handleCheckoutSuccess({
      order,
      session,
    });

    const callbackTarget =
      order.callbackUrl ||
      (order.paymentType === PaymentType.SUBSCRIPTION
        ? `${envConfigs.app_url}/settings/billing`
        : `${envConfigs.app_url}/settings/payments`);

    const redirectTarget = new URL(callbackTarget, envConfigs.app_url);
    redirectUrl = redirectTarget.toString();

    if (session.paymentStatus === PaymentStatus.SUCCESS) {
      const paymentAmount =
        session.paymentInfo?.paymentAmount ?? order.paymentAmount ?? order.amount;
      const paymentCurrency =
        String(session.paymentInfo?.paymentCurrency || '').trim() ||
        String(order.paymentCurrency || '').trim() ||
        String(order.currency || '').trim() ||
        undefined;

      purchasePayload = {
        orderNo: order.orderNo,
        paymentProvider: order.paymentProvider || undefined,
        paymentType: order.paymentType,
        productId: order.productId || undefined,
        productName: order.productName || undefined,
        currency: paymentCurrency ? paymentCurrency.toUpperCase() : undefined,
        value:
          typeof paymentAmount === 'number'
            ? Number((paymentAmount / 100).toFixed(2))
            : undefined,
      };
    }
  } catch (e: any) {
    console.log('checkout callback failed:', e);
  }

  const response = NextResponse.redirect(redirectUrl);

  if (purchasePayload) {
    response.cookies.set({
      name: GTM_PENDING_PURCHASE_COOKIE,
      value: encodeURIComponent(JSON.stringify(purchasePayload)),
      maxAge: 60 * 10,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  } else {
    response.cookies.delete(GTM_PENDING_PURCHASE_COOKIE);
  }

  return response;
}
