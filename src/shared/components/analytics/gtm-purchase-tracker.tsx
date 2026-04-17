'use client';

import { useEffect } from 'react';

import {
  GTM_PENDING_PURCHASE_COOKIE,
  GtmItem,
  PendingGtmPurchasePayload,
  trackGtmPurchase,
} from '@/shared/lib/gtm';
import { deleteCookie, getCookie } from '@/shared/lib/cookie';

function readPendingPurchaseCookie(): PendingGtmPurchasePayload | null {
  const rawValue = getCookie(GTM_PENDING_PURCHASE_COOKIE);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(rawValue)) as PendingGtmPurchasePayload;
  } catch {
    return null;
  }
}

export function GtmPurchaseTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const purchase = readPendingPurchaseCookie();
    if (!purchase?.orderNo) {
      deleteCookie(GTM_PENDING_PURCHASE_COOKIE);
      return;
    }

    deleteCookie(GTM_PENDING_PURCHASE_COOKIE);

    const items: GtmItem[] = [
      {
        item_id: purchase.productId,
        item_name: purchase.productName,
        item_category: purchase.paymentType,
        item_variant: purchase.currency,
        price: purchase.value,
        quantity: 1,
      },
    ];

    trackGtmPurchase({
      transactionId: purchase.orderNo,
      currency: purchase.currency,
      value: purchase.value,
      paymentProvider: purchase.paymentProvider,
      paymentType: purchase.paymentType,
      items,
    });
  }, []);

  return null;
}
