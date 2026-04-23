import { envConfigs } from '@/config';
import { defaultLocale, locales } from '@/config/locale';
import { toISOStringSafe } from '@/shared/lib/time';
import type { Showcase } from '@/shared/models/showcase';

const SHOWCASE_SLUG_SEPARATOR = '--';
const MIN_INDEXABLE_TEXT_LENGTH = 40;
const NOINDEX_TAGS = new Set(['noindex', 'private', 'hidden', 'blocked']);
const HIDDEN_SHOWCASE_TAGS = new Set(['shared', ...NOINDEX_TAGS]);
const GENERIC_DESCRIPTIONS = new Set(['shared from image generation']);

type ShowcaseLike = Pick<
  Showcase,
  'id' | 'title' | 'description' | 'prompt' | 'image' | 'tags' | 'createdAt'
>;

export function parseShowcaseTags(tags?: string | null) {
  return (tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function getVisibleShowcaseTags(tags?: string | null) {
  return parseShowcaseTags(tags).filter(
    (tag) => !HIDDEN_SHOWCASE_TAGS.has(tag.toLowerCase())
  );
}

export function createShowcaseSlug(value?: string | null) {
  const slug = (value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
    .replace(/-+$/g, '');

  return slug || 'ai-image';
}

export function getShowcaseIdFromParam(param: string) {
  const separatorIndex = param.lastIndexOf(SHOWCASE_SLUG_SEPARATOR);

  if (separatorIndex === -1) {
    return param;
  }

  return param.slice(separatorIndex + SHOWCASE_SLUG_SEPARATOR.length);
}

export function getShowcasePublicPath(
  showcase: Pick<ShowcaseLike, 'id' | 'title' | 'prompt'>,
  locale?: string
) {
  const sourceText = showcase.title || showcase.prompt || showcase.id;
  const slug = createShowcaseSlug(sourceText);
  const path = `/showcases/${slug}${SHOWCASE_SLUG_SEPARATOR}${showcase.id}`;

  if (!locale || locale === defaultLocale) {
    return path;
  }

  return `/${locale}${path}`;
}

export function getShowcaseCanonicalUrl(
  showcase: ShowcaseLike,
  locale: string
) {
  return `${envConfigs.app_url}${getShowcasePublicPath(showcase, locale)}`;
}

export function getShowcaseAlternateUrls(showcase: ShowcaseLike) {
  const alternateUrls = Object.fromEntries(
    locales.map((locale) => [
      locale,
      `${envConfigs.app_url}${getShowcasePublicPath(showcase, locale)}`,
    ])
  );

  return {
    ...alternateUrls,
    'x-default': `${envConfigs.app_url}${getShowcasePublicPath(
      showcase,
      defaultLocale
    )}`,
  };
}

export function getShowcaseDescription(
  showcase: Pick<ShowcaseLike, 'description' | 'prompt' | 'title'>,
  fallback: string
) {
  const description = showcase.description?.trim();

  if (description && !isGenericShowcaseDescription(description)) {
    return description;
  }

  return showcase.prompt?.trim() || description || fallback;
}

export function shouldIndexShowcase(showcase: ShowcaseLike) {
  if (!showcase.image?.trim()) {
    return false;
  }

  const tags = parseShowcaseTags(showcase.tags).map((tag) => tag.toLowerCase());
  if (tags.some((tag) => NOINDEX_TAGS.has(tag))) {
    return false;
  }

  const visibleText = [
    isGenericShowcaseTitle(showcase.title) ? '' : showcase.title,
    isGenericShowcaseDescription(showcase.description)
      ? ''
      : showcase.description,
    showcase.prompt,
    ...getVisibleShowcaseTags(showcase.tags),
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return visibleText.length >= MIN_INDEXABLE_TEXT_LENGTH;
}

function isGenericShowcaseDescription(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return Boolean(normalized && GENERIC_DESCRIPTIONS.has(normalized));
}

function isGenericShowcaseTitle(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return Boolean(
    normalized &&
      (/^generated image(?: \d{4}-\d{2}-\d{2})?$/.test(normalized) ||
        /^ai generated image(?: \d{4}-\d{2}-\d{2})?$/.test(normalized))
  );
}

export function toAbsoluteShowcaseAssetUrl(url: string) {
  return url.startsWith('http') ? url : `${envConfigs.app_url}${url}`;
}

export function buildShowcaseImageObjectJsonLd({
  showcase,
  locale,
  description,
}: {
  showcase: ShowcaseLike;
  locale: string;
  description: string;
}) {
  const canonicalUrl = getShowcaseCanonicalUrl(showcase, locale);
  const tags = getVisibleShowcaseTags(showcase.tags);
  const imageUrl = toAbsoluteShowcaseAssetUrl(showcase.image);
  const createdAt = toISOStringSafe(showcase.createdAt);

  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: showcase.title,
    description,
    caption: showcase.prompt || showcase.title,
    contentUrl: imageUrl,
    url: imageUrl,
    thumbnailUrl: imageUrl,
    ...(createdAt ? { datePublished: createdAt } : {}),
    ...(tags.length > 0 ? { keywords: tags.join(', ') } : {}),
    creator: {
      '@type': 'Organization',
      name: envConfigs.app_name,
      url: envConfigs.app_url,
    },
    creditText: `Created with ${envConfigs.app_name}`,
    isPartOf: {
      '@type': 'WebSite',
      name: envConfigs.app_name,
      url: envConfigs.app_url,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  };
}
