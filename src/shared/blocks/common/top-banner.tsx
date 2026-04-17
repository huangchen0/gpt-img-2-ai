'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Sparkles, X } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cacheGet, cacheSet } from '@/shared/lib/cache';
import { getTimestamp } from '@/shared/lib/time';
import { cn } from '@/shared/lib/utils';

type TopBannerLinkTarget = '_self' | '_blank';

export type TopBannerProps = {
  enabled?: boolean;
  /**
   * Used to build the dismiss cache key. Change it when you change the banner.
   */
  id?: string;
  /**
   * Optional leading icon / emoji rendered inside a soft badge.
   */
  icon?: string;
  /**
   * Optional leading image rendered before the text. Supports local or remote URLs.
   */
  imageSrc?: string;
  /**
   * Optional alt text for the leading image.
   */
  imageAlt?: string;
  /**
   * Banner main text.
   */
  text: ReactNode;
  /**
   * CTA button text. When omitted, the button is hidden.
   */
  buttonText?: string;
  /**
   * CTA link. When provided, clicking the button navigates to this URL.
   */
  href?: string;
  /**
   * Open the link in a new tab. Defaults to false.
   */
  target?: TopBannerLinkTarget;
  /**
   * Whether the banner can be dismissed. Defaults to true.
   */
  closable?: boolean;
  /**
   * Remember dismiss state in cache. Defaults to true.
   */
  rememberDismiss?: boolean;
  /**
   * Dismiss expiry in days. Defaults to 7.
   */
  dismissedExpiryDays?: number;
  /**
   * Extra class names for the banner wrapper.
   */
  className?: string;
  /**
   * Close button accessible label.
   */
  closeLabel?: string;
  /**
   * Optional callback when user clicks the CTA and no `href` is provided.
   */
  onAction?: () => void;
};

function isExternalHref(href: string) {
  return (
    /^https?:\/\//i.test(href) || /^mailto:/i.test(href) || /^tel:/i.test(href)
  );
}

export function TopBanner({
  enabled = true,
  id = 'default',
  icon,
  imageSrc,
  imageAlt,
  text,
  buttonText,
  href,
  target = '_self',
  closable = true,
  rememberDismiss = true,
  dismissedExpiryDays = 7,
  className,
  closeLabel = 'Close',
  onAction,
}: TopBannerProps) {
  const dismissKey = useMemo(() => `top-banner-dismissed:${id}`, [id]);

  const [showBanner, setShowBanner] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);

  const isDismissed = (): boolean => {
    if (!rememberDismiss) return false;
    return Boolean(cacheGet(dismissKey));
  };

  const syncLayoutOffset = (height: number) => {
    const offset = `${height}px`;

    const header = document.querySelector('header');
    if (header) {
      header.style.top = offset;
    }

    const sidebarContainer = document.querySelector(
      '[data-slot="sidebar-container"]'
    );
    if (sidebarContainer) {
      (sidebarContainer as HTMLElement).style.top = offset;
      (sidebarContainer as HTMLElement).style.height =
        height > 0 ? `calc(100vh - ${height}px)` : '100vh';
    }

    const sidebarWrapper = document.querySelector(
      '[data-slot="sidebar-wrapper"]'
    );
    if (sidebarWrapper) {
      (sidebarWrapper as HTMLElement).style.paddingTop = offset;
    }
  };

  const setDismissed = () => {
    if (!rememberDismiss) return;
    const expiresAt = getTimestamp() + dismissedExpiryDays * 24 * 60 * 60;
    cacheSet(dismissKey, 'true', expiresAt);
  };

  useEffect(() => {
    if (!enabled) {
      setShowBanner(false);
      return;
    }

    setShowBanner(!isDismissed());
  }, [dismissKey, enabled, rememberDismiss]);

  // Adjust header and layout spacing when banner visibility changes
  useEffect(() => {
    if (showBanner && bannerRef.current) {
      const nextHeight = bannerRef.current.offsetHeight;
      setBannerHeight(nextHeight);
      syncLayoutOffset(nextHeight);
    } else {
      setBannerHeight(0);
      syncLayoutOffset(0);
    }

    return () => {
      syncLayoutOffset(0);
    };
  }, [showBanner]);

  useEffect(() => {
    if (!showBanner || !bannerRef.current) return;

    const updateHeight = () => {
      if (bannerRef.current) {
        const nextHeight = bannerRef.current.offsetHeight;
        setBannerHeight(nextHeight);
        syncLayoutOffset(nextHeight);
      }
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(bannerRef.current);

    window.addEventListener('resize', updateHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [showBanner]);

  const handleDismiss = () => {
    setDismissed();
    setShowBanner(false);
    setBannerHeight(0);
    syncLayoutOffset(0);
  };

  if (!enabled || !showBanner) {
    return null;
  }

  const showButton =
    Boolean(buttonText) && (Boolean(href) || Boolean(onAction));

  const textContent =
    typeof text === 'string' ? (
      <span dangerouslySetInnerHTML={{ __html: text }} />
    ) : (
      text
    );

  const actionClassName =
    'inline-flex h-8 items-center justify-center rounded-full border border-white/70 bg-white/88 px-3.5 text-[11px] font-semibold tracking-[0.08em] text-[#2a255e] uppercase shadow-[0_8px_18px_rgba(42,37,94,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white';

  const actionNode = showButton ? (
    href ? (
      isExternalHref(href) ? (
        <a
          href={href}
          target={target}
          rel={target === '_blank' ? 'noreferrer noopener' : undefined}
          className={actionClassName}
        >
          {buttonText}
        </a>
      ) : (
        <Link href={href} target={target} className={actionClassName}>
          {buttonText}
        </Link>
      )
    ) : (
      <button onClick={onAction} className={actionClassName} type="button">
        {buttonText}
      </button>
    )
  ) : null;

  return (
    <>
      <div
        ref={bannerRef}
        className={cn(
          'fixed top-0 right-0 left-0 z-[51] hidden border-b border-[#f2d5df] bg-[#efe6fa]/95 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur md:block',
          className
        )}
      >
        <div className="container py-2">
          <div className="relative px-4">
            <div className="relative overflow-hidden rounded-full border border-white/70 bg-gradient-to-r from-[#efe9ff] via-[#f8edf6] to-[#fff5e9] shadow-[0_14px_32px_rgba(92,76,130,0.10)]">
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-40 bg-[radial-gradient(circle_at_left,rgba(246,128,161,0.24),transparent_70%)]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-y-0 right-0 w-36 bg-[radial-gradient(circle_at_right,rgba(255,208,131,0.28),transparent_68%)]"
              />

              <div className="relative flex min-h-14 items-center justify-center px-6 pr-14">
                <div className="flex flex-wrap items-center justify-center gap-3 text-center">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={imageAlt || ''}
                      aria-hidden={imageAlt ? undefined : true}
                      className="h-10 w-auto flex-shrink-0 drop-shadow-[0_10px_18px_rgba(236,72,153,0.18)]"
                    />
                  ) : icon ? (
                    <div className="flex h-10 w-11 flex-shrink-0 -rotate-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#ffb6da] via-[#d6c8ff] to-[#79d2ff] text-base font-black text-white shadow-[0_12px_24px_rgba(105,117,255,0.18)]">
                      <span aria-hidden="true">{icon}</span>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <div className="text-[clamp(1.2rem,1vw+0.95rem,2rem)] font-black tracking-[-0.04em] text-balance text-[#2b245e] [text-shadow:0_1px_0_rgba(255,255,255,0.72)] [&_strong]:font-black [&_strong]:text-[#ff4f7f]">
                      {textContent}
                    </div>

                    <Sparkles
                      aria-hidden="true"
                      className="h-5 w-5 flex-shrink-0 text-[#ff789b]"
                    />

                    {actionNode}
                  </div>
                </div>
              </div>

              {closable ? (
                <button
                  onClick={handleDismiss}
                  className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/72 text-[#7b688d] shadow-[0_6px_16px_rgba(42,37,94,0.10)] transition-all hover:bg-white hover:text-[#4f4569]"
                  aria-label={closeLabel}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{ height: bannerHeight }}
        className="pointer-events-none"
      />
    </>
  );
}
