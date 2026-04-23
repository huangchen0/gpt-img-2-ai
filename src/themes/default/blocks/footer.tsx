'use client';

import { Leaf } from 'lucide-react';

import { Link, usePathname } from '@/core/i18n/navigation';
import { partnerListings } from '@/config/partners';
import {
  BrandLogo,
  Copyright,
  LocaleSelector,
  ThemeToggler,
} from '@/shared/blocks/common';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { NavItem } from '@/shared/types/blocks/common';
import { Footer as FooterType } from '@/shared/types/blocks/landing';

const HOMEPAGE_BADGE_SCALE = 0.45;

type BadgeStyle = {
  border?: string;
  borderRadius?: string;
  height?: string;
  width?: string;
};

function scaleBadgeDimension(value?: number) {
  return typeof value === 'number'
    ? Math.max(1, Math.round(value * HOMEPAGE_BADGE_SCALE))
    : undefined;
}

function scaleBadgeCssDimension(value?: string) {
  if (!value || value === 'auto') {
    return value;
  }

  const match = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());

  if (!match) {
    return value;
  }

  return `${Math.max(1, Math.round(Number(match[1]) * HOMEPAGE_BADGE_SCALE))}px`;
}

function getScaledBadgeStyle(badgeStyle?: BadgeStyle) {
  if (!badgeStyle) {
    return undefined;
  }

  return {
    ...badgeStyle,
    height: scaleBadgeCssDimension(badgeStyle.height),
    width: scaleBadgeCssDimension(badgeStyle.width),
  };
}

export function Footer({ footer }: { footer: FooterType }) {
  const pathname = usePathname();
  const footerBadges = partnerListings.filter(
    (listing) => listing.showInFooter && listing.badgeImageUrl
  );
  const showHomepageBadges = pathname === '/';

  return (
    <footer
      id={footer.id}
      className={`py-8 sm:py-8 ${footer.className || ''} overflow-x-hidden`}
      // overflow-x-hidden防止-footer-撑出水平滚动条
    >
      <div className="container space-y-8 overflow-x-hidden">
        <div className="grid min-w-0 gap-12 md:grid-cols-5">
          <div className="min-w-0 space-y-4 break-words md:col-span-2 md:space-y-6">
            {footer.brand ? <BrandLogo brand={footer.brand} /> : null}

            {footer.brand?.description ? (
              <p
                className="text-muted-foreground text-sm text-balance break-words"
                dangerouslySetInnerHTML={{ __html: footer.brand.description }}
              />
            ) : null}
          </div>

          <div className="col-span-3 grid min-w-0 gap-6 sm:grid-cols-3">
            {footer.nav?.items.map((item, idx) => (
              <div key={idx} className="min-w-0 space-y-4 text-sm break-words">
                <span className="block font-medium break-words">
                  {item.title}
                </span>

                <div className="flex min-w-0 flex-wrap gap-4 sm:flex-col">
                  {item.children?.map((subItem, iidx) => (
                    <Link
                      key={iidx}
                      href={subItem.url || ''}
                      target={subItem.target || ''}
                      className="text-muted-foreground hover:text-primary block break-words duration-150"
                    >
                      <span className="break-words">{subItem.title || ''}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {showHomepageBadges && footerBadges.length > 0 ? (
          <div className="flex min-w-0 flex-nowrap items-center justify-center gap-2 overflow-x-auto sm:gap-3">
            {footerBadges.map((listing) => {
              const relValue =
                listing.linkRel !== undefined
                  ? listing.linkRel
                  : [
                      listing.relationship === 'sponsored'
                        ? 'sponsored'
                        : null,
                      'nofollow',
                      'noopener',
                      'noreferrer',
                    ]
                      .filter(Boolean)
                      .join(' ');
              const anchorTarget =
                listing.openInNewTab === false ? undefined : '_blank';
              const anchorRel = relValue || undefined;
              const badgeWidth = listing.disableFooterBadgeScaling
                ? listing.badgeWidth
                : scaleBadgeDimension(listing.badgeWidth);
              const badgeHeight = listing.disableFooterBadgeScaling
                ? listing.badgeHeight
                : scaleBadgeDimension(listing.badgeHeight);
              const badgeStyle = listing.disableFooterBadgeScaling
                ? listing.badgeStyle
                : getScaledBadgeStyle(listing.badgeStyle);

              if (listing.rawBadgeEmbed) {
                return (
                  <a
                    key={listing.url}
                    href={listing.url}
                    target={anchorTarget}
                    rel={anchorRel}
                  >
                    <img
                      src={listing.badgeImageUrl}
                      alt={listing.badgeAlt || `${listing.name} Badge`}
                      width={badgeWidth}
                      height={badgeHeight}
                      style={badgeStyle}
                    />
                  </a>
                );
              }

              return (
                <a
                  key={listing.url}
                  href={listing.url}
                  target={anchorTarget}
                  rel={anchorRel}
                  title={listing.description}
                  aria-label={`${listing.name}: ${listing.description}`}
                  className="shrink-0"
                >
                  <img
                    src={listing.badgeImageUrl}
                    width={badgeWidth || scaleBadgeDimension(160)}
                    height={badgeHeight}
                    alt={listing.badgeAlt || `${listing.name} Badge`}
                    loading="lazy"
                    decoding="async"
                    className="block h-auto w-auto shrink-0"
                    style={badgeStyle}
                  />
                </a>
              );
            })}
          </div>
        ) : null}

        {/* Settings */}
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-4">
          {footer.show_theme !== false ? <ThemeToggler type="toggle" /> : null}
          {footer.show_locale !== false ? (
            <LocaleSelector type="button" />
          ) : null}
        </div>

        <div
          aria-hidden
          className="h-px min-w-0 [background-image:linear-gradient(90deg,var(--color-foreground)_1px,transparent_1px)] bg-[length:6px_1px] bg-repeat-x opacity-25"
        />
        <div className="flex min-w-0 flex-wrap justify-between gap-8">
          <div className="flex min-w-0 flex-wrap items-center gap-4 sm:gap-6">
            {footer.copyright ? (
              <p
                className="text-muted-foreground text-sm text-balance break-words"
                dangerouslySetInnerHTML={{ __html: footer.copyright }}
              />
            ) : footer.brand ? (
              <Copyright brand={footer.brand} />
            ) : null}

            <a
              href="https://climate.stripe.com/fIF3Dw"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] transition-colors"
              aria-label="Visit GPT Image 2 climate contributor page on Stripe Climate"
            >
              <Leaf className="h-3 w-3 text-emerald-500" strokeWidth={2} />
              <span>Climate contributor</span>
            </a>
          </div>

          <div className="min-w-0 flex-1"></div>

          {footer.agreement ? (
            <div className="flex min-w-0 flex-wrap items-center gap-4">
              {footer.agreement?.items.map((item: NavItem, index: number) => (
                <Link
                  key={index}
                  href={item.url || ''}
                  target={item.target || ''}
                  className="text-muted-foreground hover:text-primary block text-xs break-words underline duration-150"
                >
                  {item.title || ''}
                </Link>
              ))}
            </div>
          ) : null}

          {footer.social ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {footer.social?.items.map((item: NavItem, index) => (
                <Link
                  key={index}
                  href={item.url || ''}
                  target={item.target || ''}
                  className="text-muted-foreground hover:text-primary bg-background block cursor-pointer rounded-full p-2 duration-150"
                  aria-label={item.title || 'Social media link'}
                >
                  {item.icon && (
                    <SmartIcon name={item.icon as string} size={20} />
                  )}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
