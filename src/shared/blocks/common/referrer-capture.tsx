'use client';

import { useEffect } from 'react';

import { getCookie, setCookie } from '@/shared/lib/cookie';

const COOKIE_NAME = 'referrer_domain';
const COOKIE_DAYS = 30;

function normalizeDomain(value: string) {
  const trimmed = value.trim().toLowerCase();
  const noWww = trimmed.startsWith('www.') ? trimmed.slice(4) : trimmed;

  return noWww.replace(/[^a-z0-9.-]/g, '').slice(0, 100);
}

/**
 * Capture referrer domain from document.referrer and persist in cookie.
 * This enables server-side signup to save it into the user table.
 */
export function ReferrerCapture() {
  useEffect(() => {
    // Don’t overwrite if already captured.
    if (getCookie(COOKIE_NAME)) return;

    const referrer = document.referrer || '';
    if (!referrer) return;

    let hostname = '';
    try {
      hostname = new URL(referrer).hostname;
    } catch {
      return;
    }

    // Ignore same-site referrers.
    const currentHost = window.location.hostname.toLowerCase();
    if (hostname.toLowerCase() === currentHost) return;

    const sanitized = normalizeDomain(hostname);
    if (!sanitized) return;

    setCookie(COOKIE_NAME, encodeURIComponent(sanitized), COOKIE_DAYS);
  }, []);

  return null;
}
