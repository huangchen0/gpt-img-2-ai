'use client';

import { useEffect } from 'react';

import { getCookie, setCookie } from '@/shared/lib/cookie';
import { REFERRAL_COOKIE_NAME } from '@/shared/lib/referral';

const DEFAULT_COOKIE_DAYS = 30;

function sanitizeReferralCode(value: string) {
  return value
    .trim()
    .replace(/[^\w-]/g, '')
    .slice(0, 100);
}

export function ReferralCapture() {
  useEffect(() => {
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const referralCode = params.get('ref');
      if (!referralCode) return;

      const sanitized = sanitizeReferralCode(referralCode);
      if (!sanitized) return;

      if (getCookie(REFERRAL_COOKIE_NAME) === encodeURIComponent(sanitized)) {
        return;
      }

      let cookieDays = DEFAULT_COOKIE_DAYS;
      try {
        const resp = await fetch('/api/config/get-configs', { method: 'POST' });
        const { code, data } = await resp.json();
        if (code === 0) {
          const configuredDays = parseInt(data?.referral_cookie_days || '', 10);
          if (Number.isFinite(configuredDays) && configuredDays > 0) {
            cookieDays = configuredDays;
          }
        }
      } catch {
        cookieDays = DEFAULT_COOKIE_DAYS;
      }

      setCookie(
        REFERRAL_COOKIE_NAME,
        encodeURIComponent(sanitized),
        cookieDays
      );
    })();
  }, []);

  return null;
}
