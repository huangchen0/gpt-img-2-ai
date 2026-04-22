import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';

import { getPrimaryCategory, getSuggestedSettings } from './insights';
import type {
  PromptLibraryItem,
  PromptLibraryListDataset,
  PromptLibraryMedia,
} from './types';

export const promptLibrarySeoConfig = {
  model: 'gpt-image-2',
  path: '/prompts/gpt-image-2',
  label: 'GPT Image 2',
  generatorPath: '/models/gpt-image-2#generator',
  collectionTitle: 'GPT Image 2 Prompt Gallery: 725 Copyable Image Prompts',
  collectionDescription:
    'Browse copyable GPT Image 2 prompts for product photos, posters, UI mockups, characters, infographics, social images, and reference-based image editing.',
  collectionKeywords: [
    'GPT Image 2 prompts',
    'GPT Image 2 prompt gallery',
    'AI image prompts',
    'copyable image prompts',
    'GPT image generator prompts',
    'image to image prompts',
  ],
} as const;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function getCanonicalAppUrl() {
  return trimTrailingSlash(envConfigs.app_url || 'https://gpt-image-2-ai.org');
}

export function getCanonicalUrl(path: string, locale = defaultLocale) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const localePrefix = locale === defaultLocale ? '' : `/${locale}`;

  return `${getCanonicalAppUrl()}${localePrefix}${normalizedPath}`;
}

export function getAbsoluteUrl(value?: string | null) {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;

  return `${getCanonicalAppUrl()}${value.startsWith('/') ? '' : '/'}${value}`;
}

export function getPromptMediaImage(media?: PromptLibraryMedia) {
  if (!media) return '';
  return getAbsoluteUrl(media.thumbnail || media.url);
}

export function normalizeSeoText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function truncateSeoText(value: string, maxLength: number) {
  const normalized = normalizeSeoText(value);
  if (normalized.length <= maxLength) return normalized;

  const clipped = normalized.slice(0, maxLength - 1);
  const lastSpace = clipped.lastIndexOf(' ');

  return `${(lastSpace > 80 ? clipped.slice(0, lastSpace) : clipped).trim()}...`;
}

export function getPromptDetailTitle(item: PromptLibraryItem) {
  return truncateSeoText(`${item.title} GPT Image 2 Prompt and Rewrite Tips`, 68);
}

export function getPromptDetailDescription(item: PromptLibraryItem) {
  const settings = getSuggestedSettings(item);

  return truncateSeoText(
    `${item.description} Copy the prompt, review suggested ${settings.aspectRatio} framing, and adapt it for GPT Image 2 image generation.`,
    158
  );
}

export function getPromptVisualAltText(item: PromptLibraryItem, mediaIndex = 0) {
  const suffix = mediaIndex > 0 ? ` variation ${mediaIndex + 1}` : '';

  return truncateSeoText(
    `${item.title} GPT Image 2 prompt example${suffix}: ${item.description}`,
    180
  );
}

export function getPromptKeywords(item: PromptLibraryItem) {
  const source = [
    ...promptLibrarySeoConfig.collectionKeywords,
    item.title,
    `${getPrimaryCategory(item)} prompt`,
    item.language ? `${item.language} image prompt` : '',
    ...(item.tags || []),
  ];

  return Array.from(new Set(source.map(normalizeSeoText).filter(Boolean))).slice(0, 14);
}

export function getRelatedPromptItems(
  dataset: PromptLibraryListDataset,
  item: PromptLibraryItem,
  limit = 6
) {
  const category = getPrimaryCategory(item);

  return dataset.items
    .filter((candidate) => candidate.slug !== item.slug)
    .sort((a, b) => {
      const aMatch = a.categories.includes(category) ? 1 : 0;
      const bMatch = b.categories.includes(category) ? 1 : 0;
      return bMatch - aMatch || Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    })
    .slice(0, limit);
}

export function buildPromptLibraryJsonLd({
  dataset,
  url,
}: {
  dataset: PromptLibraryListDataset;
  url: string;
}) {
  const appName = envConfigs.app_name || 'ChatGPT Image 2 Generator';

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: promptLibrarySeoConfig.collectionTitle,
    description: promptLibrarySeoConfig.collectionDescription,
    url,
    isPartOf: {
      '@type': 'WebSite',
      name: appName,
      url: getCanonicalAppUrl(),
    },
    about: {
      '@type': 'SoftwareApplication',
      name: 'GPT Image 2',
      applicationCategory: 'MultimediaApplication',
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: dataset.total || dataset.items.length,
      itemListElement: dataset.items.slice(0, 50).map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: getCanonicalUrl(`/prompts/gpt-image-2/${item.slug}`, 'en'),
        name: item.title,
      })),
    },
  };
}

export function buildPromptDetailJsonLd({
  item,
  url,
}: {
  item: PromptLibraryItem;
  url: string;
}) {
  const image = getPromptMediaImage(item.media[0]);

  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: getPromptDetailTitle(item),
    description: getPromptDetailDescription(item),
    url,
    image: image || undefined,
    datePublished: item.publishedAt || item.syncedAt,
    dateModified: item.syncedAt,
    creator: item.authorName
      ? {
          '@type': 'Person',
          name: item.authorName,
          url: item.authorUrl || item.sourceUrl || undefined,
        }
      : undefined,
    keywords: getPromptKeywords(item).join(', '),
    text: item.prompt,
  };
}
