'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { locales } from '@/config/locale';
import { getCookie, setCookie } from '@/shared/lib/cookie';
import { getUuid } from '@/shared/lib/hash';

const VISITOR_COOKIE_NAME = 'site_visitor_id';
const VISITOR_STORAGE_KEY = 'site_visitor_id';
const VISITOR_COOKIE_DAYS = 365;

function sanitizeVisitorId(value: string) {
  return value.replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 191);
}

function getRandomId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return getUuid();
}

function getOrCreateVisitorId() {
  if (typeof window === 'undefined') {
    return '';
  }

  const cookieValue = sanitizeVisitorId(
    decodeURIComponent(getCookie(VISITOR_COOKIE_NAME) || '')
  );
  if (cookieValue) {
    window.localStorage.setItem(VISITOR_STORAGE_KEY, cookieValue);
    return cookieValue;
  }

  const storedValue = sanitizeVisitorId(
    window.localStorage.getItem(VISITOR_STORAGE_KEY) || ''
  );
  if (storedValue) {
    setCookie(
      VISITOR_COOKIE_NAME,
      encodeURIComponent(storedValue),
      VISITOR_COOKIE_DAYS
    );
    return storedValue;
  }

  const next = sanitizeVisitorId(getRandomId());
  if (!next) {
    return '';
  }

  window.localStorage.setItem(VISITOR_STORAGE_KEY, next);
  setCookie(VISITOR_COOKIE_NAME, encodeURIComponent(next), VISITOR_COOKIE_DAYS);
  return next;
}

function shouldTrackPath(pathname: string | null) {
  if (!pathname) {
    return false;
  }

  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase() || '';
  const normalizedSegments = locales.includes(firstSegment as any)
    ? segments.slice(1)
    : segments;
  const normalizedPath = `/${normalizedSegments.join('/')}`;

  return !(
    normalizedPath.startsWith('/admin') ||
    normalizedPath.startsWith('/settings') ||
    normalizedPath.startsWith('/activity')
  );
}

function postSiteActivity(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') {
    return;
  }

  const body = JSON.stringify(payload);
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.sendBeacon === 'function'
  ) {
    const blob = new Blob([body], { type: 'application/json' });
    const queued = navigator.sendBeacon('/api/site-activity', blob);
    if (queued) {
      return;
    }
  }

  void fetch('/api/site-activity', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    keepalive: true,
  });
}

export function SiteActivityCapture() {
  const pathname = usePathname();

  useEffect(() => {
    if (!shouldTrackPath(pathname)) {
      return;
    }

    const visitorId = getOrCreateVisitorId();
    if (!visitorId) {
      return;
    }

    postSiteActivity({
      visitor_id: visitorId,
      pathname: pathname || '/',
    });
  }, [pathname]);

  return null;
}
