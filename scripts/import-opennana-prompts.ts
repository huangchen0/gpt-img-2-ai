import fs from 'fs';
import path from 'path';

import { envConfigs } from '@/config';
import type {
  PromptLibraryImportDataset,
  PromptLibraryImportedItem,
} from '@/shared/prompt-library/imports';
import { getPromptCategories } from '@/shared/prompt-library/insights';
import type {
  PromptLibraryMedia,
  PromptLibraryPromptVariant,
} from '@/shared/prompt-library/types';

const OPENNANA_API_BASE_URL = 'https://api.opennana.com';
const OPENNANA_GALLERY_URL =
  'https://opennana.com/awesome-prompt-gallery?model=ChatGPT';
const OPENNANA_DETAIL_BASE_URL = 'https://opennana.com/awesome-prompt-gallery';
const DEFAULT_CONCURRENCY = 6;
const DEFAULT_PAGE_SIZE = 20;
const FETCH_TIMEOUT_MS = Number.parseInt(
  process.env.PROMPT_LIBRARY_FETCH_TIMEOUT_MS || '20000',
  10
);
const OUTPUT_FILE = path.join(
  process.cwd(),
  'data',
  'prompt-library',
  'imports',
  'gpt-image-2',
  'opennana-chatgpt.json'
);

type OpenNanaPromptListItem = {
  id: number;
  slug: string;
  title: string;
  media_type?: string;
  cover_image?: string;
  _is_sponsor?: boolean;
};

type OpenNanaPromptListResponse = {
  status: number;
  data?: {
    items: OpenNanaPromptListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
      has_more: boolean;
      items_count: number;
    };
  };
};

type ExistingImportedPromptLookup = {
  itemByExternalId: Map<string, PromptLibraryImportedItem>;
  slugs: Set<string>;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const values = new Map<string, string>();

  for (const arg of args) {
    if (!arg.startsWith('--')) {
      continue;
    }

    const [rawKey, rawValue] = arg.slice(2).split('=');
    values.set(rawKey, rawValue || 'true');
  }

  const concurrency = Number.parseInt(
    values.get('concurrency') || `${DEFAULT_CONCURRENCY}`,
    10
  );
  const limit = Number.parseInt(values.get('limit') || '0', 10);

  return {
    concurrency:
      Number.isFinite(concurrency) && concurrency > 0
        ? concurrency
        : DEFAULT_CONCURRENCY,
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
  };
}

async function fetchWithRetry(url: string, init?: RequestInit, retries = 2) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          accept:
            init?.headers instanceof Headers
              ? init.headers.get('accept') || '*/*'
              : 'application/json,text/html;q=0.9,*/*;q=0.8',
          ...(typeof init?.headers === 'object' ? init.headers : {}),
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * Math.max(1, attempt + 1))
        );
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to fetch ${url}`);
}

async function fetchJson<T>(url: string) {
  const response = await fetchWithRetry(url, {
    headers: { accept: 'application/json' },
  });
  return (await response.json()) as T;
}

async function fetchText(url: string) {
  const response = await fetchWithRetry(url, {
    headers: { accept: 'text/html,application/xhtml+xml' },
  });
  return response.text();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 10))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function normalizeText(value: string) {
  return decodeHtmlEntities(value)
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function stripTags(value: string) {
  return normalizeText(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
}

function extractMetaContent(
  html: string,
  attribute: 'name' | 'property',
  key: string
) {
  const pattern = new RegExp(
    `<meta[^>]+${attribute}=["']${key.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    )}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const match = html.match(pattern);
  return match ? normalizeText(match[1]) : '';
}

function extractVisibleTitle(html: string) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? stripTags(match[1]) : '';
}

function extractJsonLd(html: string) {
  const match = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i
  );
  if (!match) {
    return undefined;
  }

  try {
    return JSON.parse(normalizeText(match[1])) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function extractAuthorInfo(html: string) {
  const match = html.match(/来源:\s*<a href="([^"]+)"[^>]*>([^<]+)<\/a>/i);

  if (!match) {
    return {};
  }

  return {
    name: stripTags(match[2]),
    url: normalizeText(match[1]),
  };
}

function extractTags(html: string) {
  const tags = Array.from(
    html.matchAll(/<span class="tag-chip[^"]*">([\s\S]*?)<\/span>/g)
  )
    .map((match) => stripTags(match[1]))
    .filter(Boolean);

  return Array.from(new Set(tags));
}

function extractImages(html: string, fallbackImage?: string) {
  const imagesMatch = html.match(/"images":(\[[^\]]*\])/);
  if (imagesMatch) {
    try {
      const images = JSON.parse(imagesMatch[1]) as string[];
      const normalized = images
        .map((image) => normalizeText(image))
        .filter(Boolean);

      if (normalized.length > 0) {
        return Array.from(new Set(normalized));
      }
    } catch {
      // Ignore and fall back to meta/img parsing.
    }
  }

  const metaImage = extractMetaContent(html, 'property', 'og:image');
  const candidates = [fallbackImage, metaImage].filter(Boolean) as string[];
  return Array.from(new Set(candidates.map((value) => normalizeText(value))));
}

function getPromptVariantType(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes('english') || normalized.includes('英文')) {
    return 'en';
  }

  if (normalized.includes('中文') || normalized.includes('chinese')) {
    return 'zh';
  }

  if (normalized.includes('japanese') || normalized.includes('日文')) {
    return 'ja';
  }

  return undefined;
}

function extractPromptVariants(html: string): PromptLibraryPromptVariant[] {
  const promptBlocks = Array.from(
    html.matchAll(
      /<div class="bg-slate-50[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<pre[^>]*>([\s\S]*?)<\/pre>/g
    )
  );

  return promptBlocks
    .map((match) => {
      const label = stripTags(match[1]);
      const text = normalizeText(match[2]);

      return {
        label,
        text,
        type: getPromptVariantType(label),
      } satisfies PromptLibraryPromptVariant;
    })
    .filter((variant) => variant.text);
}

function selectPrimaryPrompt(promptVariants: PromptLibraryPromptVariant[]) {
  return (
    promptVariants.find((variant) => variant.type === 'en') ||
    promptVariants.find((variant) => variant.type === 'zh') ||
    promptVariants[0]
  );
}

function buildMediaItems(
  images: string[],
  coverImage?: string
): PromptLibraryMedia[] {
  return images.map((image, index) => ({
    type: 'image',
    url: image,
    thumbnail: index === 0 ? coverImage || null : null,
    sourceUrl: image,
  }));
}

function getBasePromptLibraryUrl() {
  return trimTrailingSlash(
    envConfigs.prompt_library_base_url ||
      'https://img.cdance.ai/uploads/prompt-library'
  );
}

function readExistingImportDataset() {
  if (!fs.existsSync(OUTPUT_FILE)) {
    return undefined;
  }

  return JSON.parse(
    fs.readFileSync(OUTPUT_FILE, 'utf8')
  ) as PromptLibraryImportDataset;
}

function getExistingImportedPromptLookup(): ExistingImportedPromptLookup {
  const dataset = readExistingImportDataset();
  const itemByExternalId = new Map<string, PromptLibraryImportedItem>();
  const slugs = new Set<string>();

  for (const item of dataset?.items || []) {
    if (item.slug) {
      slugs.add(item.slug);
    }

    const externalId = item.importMetadata?.externalId?.trim();
    if (externalId) {
      itemByExternalId.set(externalId, item);
    }
  }

  return {
    itemByExternalId,
    slugs,
  };
}

async function getExistingBaseSlugsExcluding(excludedSlugs: Set<string>) {
  try {
    const dataset = await fetchJson<{
      items: Array<{ slug: string }>;
    }>(`${getBasePromptLibraryUrl()}/gpt-image-2/index.json`);

    return new Set(
      dataset.items
        .map((item) => item.slug)
        .filter((slug) => !excludedSlugs.has(slug))
    );
  } catch {
    try {
      const localDataset = JSON.parse(
        fs.readFileSync(
          path.join(
            process.cwd(),
            'public',
            'prompt-library',
            'gpt-image-2',
            'index.json'
          ),
          'utf8'
        )
      ) as { items: Array<{ slug: string }> };

      return new Set(
        localDataset.items
          .map((item) => item.slug)
          .filter((slug) => !excludedSlugs.has(slug))
      );
    } catch {
      return new Set<string>();
    }
  }
}

function ensureUniqueSlug(
  slug: string,
  usedSlugs: Set<string>,
  suffix: string
) {
  if (!usedSlugs.has(slug)) {
    usedSlugs.add(slug);
    return slug;
  }

  const candidate = `${slug}-${suffix}`;
  if (!usedSlugs.has(candidate)) {
    usedSlugs.add(candidate);
    return candidate;
  }

  let counter = 2;
  while (usedSlugs.has(`${candidate}-${counter}`)) {
    counter += 1;
  }

  const finalSlug = `${candidate}-${counter}`;
  usedSlugs.add(finalSlug);
  return finalSlug;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );

  return results;
}

async function getPromptListingPage(page: number) {
  return fetchJson<OpenNanaPromptListResponse>(
    `${OPENNANA_API_BASE_URL}/api/prompts?page=${page}&limit=${DEFAULT_PAGE_SIZE}&sort=reviewed_at&order=DESC&model=ChatGPT`
  );
}

async function getPromptListings(limit?: number) {
  const firstPage = await getPromptListingPage(1);
  if (firstPage.status !== 200 || !firstPage.data) {
    throw new Error('Failed to load OpenNana prompt listings.');
  }

  const totalPages = firstPage.data.pagination.total_pages || 1;
  const pages = [firstPage];

  for (let page = 2; page <= totalPages; page += 1) {
    pages.push(await getPromptListingPage(page));
  }

  const items = pages
    .flatMap((page) => page.data?.items || [])
    .filter(
      (item) =>
        !item._is_sponsor &&
        item.media_type === 'image' &&
        item.slug &&
        item.title
    );

  return typeof limit === 'number' ? items.slice(0, limit) : items;
}

function buildImportedItem({
  listing,
  detailHtml,
  slug,
  importedAt,
}: {
  listing: OpenNanaPromptListItem;
  detailHtml: string;
  slug: string;
  importedAt: string;
}) {
  const promptVariants = extractPromptVariants(detailHtml);
  const primaryPrompt = selectPrimaryPrompt(promptVariants);
  if (!primaryPrompt?.text) {
    throw new Error(`No prompt text found for ${listing.slug}`);
  }

  const visibleTitle = extractVisibleTitle(detailHtml);
  const description =
    extractMetaContent(detailHtml, 'name', 'description') || listing.title;
  const tags = extractTags(detailHtml);
  const jsonLd = extractJsonLd(detailHtml);
  const author = extractAuthorInfo(detailHtml);
  const images = extractImages(detailHtml, listing.cover_image);
  const media = buildMediaItems(images, listing.cover_image);
  const publishedAt =
    typeof jsonLd?.datePublished === 'string' ? jsonLd.datePublished : null;
  const syncedAt =
    typeof jsonLd?.dateModified === 'string' ? jsonLd.dateModified : importedAt;
  const publicUrl = `${OPENNANA_DETAIL_BASE_URL}/${listing.slug}`;
  const combinedPromptText = promptVariants
    .map((variant) => variant.text)
    .join('\n\n');
  const categories = getPromptCategories({
    title: visibleTitle || listing.title,
    description,
    prompt: combinedPromptText,
    tags,
  });

  return {
    id: `opennana-chatgpt-${listing.id}`,
    slug,
    model: 'gpt-image-2',
    title: visibleTitle || listing.title,
    description,
    prompt: primaryPrompt.text,
    promptVariants,
    language: primaryPrompt.type || promptVariants[0]?.type || 'zh',
    featured: false,
    publishedAt,
    media,
    syncedAt,
    tags,
    categories,
    importMetadata: {
      importSource: 'OpenNana ChatGPT',
      externalId: String(listing.id),
      importedAt,
      originalAuthor: author.name || null,
      originalAuthorUrl: author.url || null,
      originalUrl: publicUrl,
    },
  } satisfies PromptLibraryImportedItem;
}

function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`);
}

async function main() {
  const { concurrency, limit } = parseArgs();
  const importedAt = new Date().toISOString();
  const existingImportedPrompts = getExistingImportedPromptLookup();
  // Keep previously assigned import slugs stable across reruns.
  const baseSlugs = await getExistingBaseSlugsExcluding(
    existingImportedPrompts.slugs
  );
  const usedSlugs = new Set([
    ...baseSlugs,
    ...existingImportedPrompts.slugs,
  ]);
  const listings = await getPromptListings(limit);

  console.log(
    `Importing ${listings.length} OpenNana ChatGPT prompts with concurrency ${concurrency}...`
  );

  const items = await mapWithConcurrency(
    listings,
    concurrency,
    async (listing, index) => {
      const existingItem = existingImportedPrompts.itemByExternalId.get(
        String(listing.id)
      );
      const finalSlug =
        existingItem?.slug ||
        ensureUniqueSlug(listing.slug, usedSlugs, String(listing.id));
      const detailHtml = await fetchText(
        `${OPENNANA_DETAIL_BASE_URL}/${listing.slug}`
      );

      const item = buildImportedItem({
        listing,
        detailHtml,
        slug: finalSlug,
        importedAt,
      });

      if ((index + 1) % 25 === 0 || index === listings.length - 1) {
        console.log(`Processed ${index + 1}/${listings.length} prompts...`);
      }

      return item;
    }
  );

  const dataset: PromptLibraryImportDataset = {
    model: 'gpt-image-2',
    source: 'OpenNana ChatGPT Prompt Import',
    sourceUrl: OPENNANA_GALLERY_URL,
    syncedAt: importedAt,
    items,
  };

  writeJson(OUTPUT_FILE, dataset);

  console.log(
    `Saved ${items.length} imported prompts to ${path.relative(process.cwd(), OUTPUT_FILE)}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
