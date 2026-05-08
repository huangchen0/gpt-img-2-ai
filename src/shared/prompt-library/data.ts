import fs from 'fs';
import path from 'path';

import { envConfigs } from '@/config';
import { getPromptCategories } from '@/shared/prompt-library/insights';

import {
  getLatestPromptLibrarySyncTime,
  getPromptLibraryImportIndexItems,
  getPromptLibraryImportItem,
  mergePromptLibraryIndexItems,
} from './imports';
import {
  getPublicPromptSlug,
  sanitizePromptLibraryDataset,
  sanitizePromptLibraryItem,
} from './sanitize';
import type {
  PromptLibraryIndexDataset,
  PromptLibraryIndexItem,
  PromptLibraryItem,
  PromptLibraryModel,
} from './types';

const datasetFiles: Record<PromptLibraryModel, string> = {
  'gpt-image-2': 'gpt-image-2',
};

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const cacheTtlMs = parsePositiveInteger(
  process.env.PROMPT_LIBRARY_CACHE_TTL_MS,
  3600000
);
const fetchTimeoutMs = parsePositiveInteger(
  process.env.PROMPT_LIBRARY_FETCH_TIMEOUT_MS,
  10000
);

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const indexCache = new Map<string, CacheEntry<PromptLibraryIndexDataset>>();
const rawIndexCache = new Map<string, CacheEntry<PromptLibraryIndexDataset>>();
const rawItemCache = new Map<string, CacheEntry<PromptLibraryItem>>();
const indexRequests = new Map<string, Promise<PromptLibraryIndexDataset>>();
const itemRequests = new Map<string, Promise<PromptLibraryItem | undefined>>();

class PromptLibraryAssetError extends Error {
  constructor(
    public status: number,
    public url: string
  ) {
    super(`Failed to fetch prompt library asset: ${status} ${url}`);
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function getPromptLibraryDir(model: PromptLibraryModel) {
  return path.join(
    process.cwd(),
    'public',
    'prompt-library',
    datasetFiles[model]
  );
}

function getRemoteBaseUrl() {
  const baseUrl = envConfigs.prompt_library_base_url?.trim();
  return baseUrl ? trimTrailingSlash(baseUrl) : '';
}

function getRemoteAssetUrl(model: PromptLibraryModel, pathname: string) {
  const baseUrl = getRemoteBaseUrl();
  if (!baseUrl) return '';

  return `${baseUrl}/${datasetFiles[model]}/${pathname.replace(/^\/+/, '')}`;
}

function getPublicAssetUrl(model: PromptLibraryModel, pathname: string) {
  const appUrl = trimTrailingSlash(envConfigs.app_url || '');
  if (!appUrl) return '';

  return `${appUrl}/prompt-library/${datasetFiles[model]}/${pathname.replace(/^\/+/, '')}`;
}

function getCachedValue<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  options: { allowStale?: boolean } = {}
) {
  const cached = cache.get(key);
  if (!cached) return undefined;

  if (options.allowStale || cached.expiresAt > Date.now()) {
    return cached.value;
  }

  return undefined;
}

function setCachedValue<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T
) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + Math.max(cacheTtlMs, 0),
  });

  return value;
}

async function fetchPromptLibraryJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: Math.max(Math.floor(cacheTtlMs / 1000), 60) },
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(fetchTimeoutMs),
  });

  if (!response.ok) {
    throw new PromptLibraryAssetError(response.status, url);
  }

  return (await response.json()) as T;
}

function normalizeIndexDataset(dataset: PromptLibraryIndexDataset) {
  return {
    ...dataset,
    items: dataset.items.map((item) => ({
      ...item,
      categories:
        (item as PromptLibraryIndexItem).categories?.length > 0
          ? (item as PromptLibraryIndexItem).categories
          : getPromptCategories(item),
    })),
  } satisfies PromptLibraryIndexDataset;
}

function mergeImportedDatasetItems(
  model: PromptLibraryModel,
  dataset: PromptLibraryIndexDataset
) {
  const importedItems = getPromptLibraryImportIndexItems(model);
  if (importedItems.length === 0) {
    return dataset;
  }

  const items = mergePromptLibraryIndexItems(dataset.items, importedItems);

  return normalizeIndexDataset({
    ...dataset,
    total: items.length,
    syncedAt: getLatestPromptLibrarySyncTime([
      dataset.syncedAt,
      ...importedItems.map((item) => item.syncedAt),
    ]),
    items,
  });
}

function sanitizeDatasetForFrontend(
  model: PromptLibraryModel,
  dataset: PromptLibraryIndexDataset
) {
  return sanitizePromptLibraryDataset(dataset, {
    model,
    assetBaseUrl: '/api/prompt-library',
  });
}

function readLocalPromptLibraryDataset(model: PromptLibraryModel) {
  const filePath = path.join(getPromptLibraryDir(model), 'index.json');
  return JSON.parse(
    fs.readFileSync(filePath, 'utf8')
  ) as PromptLibraryIndexDataset;
}

function readLocalPromptLibraryItem(model: PromptLibraryModel, slug: string) {
  const filePath = path.join(
    getPromptLibraryDir(model),
    'items',
    `${slug}.json`
  );
  if (!fs.existsSync(filePath)) return undefined;

  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as PromptLibraryItem;
}

async function getLocalOrPublicPromptLibraryDataset(model: PromptLibraryModel) {
  let dataset: PromptLibraryIndexDataset;

  try {
    dataset = readLocalPromptLibraryDataset(model);
  } catch (error) {
    const publicUrl = getPublicAssetUrl(model, 'index.json');
    if (!publicUrl) throw error;

    dataset =
      await fetchPromptLibraryJson<PromptLibraryIndexDataset>(publicUrl);
  }

  return mergeImportedDatasetItems(model, normalizeIndexDataset(dataset));
}

async function getLocalOrPublicPromptLibraryItem(
  model: PromptLibraryModel,
  slug: string
) {
  const item = readLocalPromptLibraryItem(model, slug);
  if (item) return item;

  const publicUrl = getPublicAssetUrl(model, `items/${slug}.json`);
  if (!publicUrl) return undefined;

  try {
    return await fetchPromptLibraryJson<PromptLibraryItem>(publicUrl);
  } catch {
    return undefined;
  }
}

async function getFallbackPromptLibraryDataset(model: PromptLibraryModel) {
  const dataset = await getLocalOrPublicPromptLibraryDataset(model);
  dataset.assetBaseUrl = getRemoteBaseUrl();
  return dataset;
}

async function getRawRemotePromptLibraryDataset(model: PromptLibraryModel) {
  const remoteUrl = getRemoteAssetUrl(model, 'index.json');
  if (!remoteUrl) return undefined;

  const cacheKey = `${model}:raw:${remoteUrl}`;
  const cached = getCachedValue(rawIndexCache, cacheKey);
  if (cached) return cached;

  const dataset =
    await fetchPromptLibraryJson<PromptLibraryIndexDataset>(remoteUrl);

  return setCachedValue(rawIndexCache, cacheKey, dataset);
}

async function resolveRawRemotePromptSlug(
  model: PromptLibraryModel,
  slug: string
) {
  try {
    const dataset = await getRawRemotePromptLibraryDataset(model);
    const item = dataset?.items.find(
      (candidate) =>
        candidate.slug === slug || getPublicPromptSlug(candidate.slug) === slug
    );

    return item?.slug || slug;
  } catch {
    return slug;
  }
}

async function getFallbackPromptLibraryItem(
  model: PromptLibraryModel,
  slug: string
) {
  const importedItem = getPromptLibraryImportItem(model, slug);
  if (importedItem) return importedItem;

  return getLocalOrPublicPromptLibraryItem(model, slug);
}

export async function getPromptLibraryDataset(model: PromptLibraryModel) {
  const remoteUrl = getRemoteAssetUrl(model, 'index.json');
  if (remoteUrl) {
    const cacheKey = `${model}:${remoteUrl}`;
    const cached = getCachedValue(indexCache, cacheKey);
    if (cached) return cached;

    const pendingRequest = indexRequests.get(cacheKey);
    if (pendingRequest) return pendingRequest;

    const request = (async () => {
      try {
        const dataset = mergeImportedDatasetItems(
          model,
          normalizeIndexDataset(
            await fetchPromptLibraryJson<PromptLibraryIndexDataset>(remoteUrl)
          )
        );
        dataset.assetBaseUrl = getRemoteBaseUrl();
        return setCachedValue(
          indexCache,
          cacheKey,
          sanitizeDatasetForFrontend(model, dataset)
        );
      } catch (error) {
        const staleDataset = getCachedValue(indexCache, cacheKey, {
          allowStale: true,
        });
        if (staleDataset) return staleDataset;

        try {
          const fallbackDataset = await getFallbackPromptLibraryDataset(model);
          return setCachedValue(
            indexCache,
            cacheKey,
            sanitizeDatasetForFrontend(model, fallbackDataset)
          );
        } catch {
          throw error;
        }
      } finally {
        indexRequests.delete(cacheKey);
      }
    })();

    indexRequests.set(cacheKey, request);
    return request;
  }

  const cacheKey = `${model}:local`;
  const cached = getCachedValue(indexCache, cacheKey);
  if (cached) return cached;

  const dataset = await getFallbackPromptLibraryDataset(model);
  return setCachedValue(
    indexCache,
    cacheKey,
    sanitizeDatasetForFrontend(model, dataset)
  );
}

export async function getPromptLibraryItems(model: PromptLibraryModel) {
  return (await getPromptLibraryDataset(model)).items;
}

export async function getRelatedPromptLibraryItems(
  model: PromptLibraryModel,
  slug: string,
  category: string,
  limit = 6
) {
  const dataset = await getPromptLibraryDataset(model);

  return dataset.items
    .filter((candidate) => candidate.slug !== slug)
    .sort((a, b) => {
      const aMatch = a.categories.includes(category) ? 1 : 0;
      const bMatch = b.categories.includes(category) ? 1 : 0;
      return (
        bMatch - aMatch ||
        Number(Boolean(b.featured)) - Number(Boolean(a.featured))
      );
    })
    .slice(0, limit);
}

export async function getRawPromptLibraryItem(
  model: PromptLibraryModel,
  slug: string
) {
  const importedItem = getPromptLibraryImportItem(model, slug);

  if (importedItem) {
    const cacheKey = `${model}:${slug}:imported`;
    return setCachedValue(rawItemCache, cacheKey, importedItem);
  }

  const rawSlug = await resolveRawRemotePromptSlug(model, slug);
  const remoteUrl = getRemoteAssetUrl(model, `items/${rawSlug}.json`);
  const cacheKey = `${model}:${slug}:${rawSlug}:${remoteUrl || 'local'}`;

  if (remoteUrl) {
    const cached = getCachedValue(rawItemCache, cacheKey);
    if (cached) return cached;

    const pendingRequest = itemRequests.get(cacheKey);
    if (pendingRequest) return pendingRequest;

    const request = (async () => {
      try {
        const item = await fetchPromptLibraryJson<PromptLibraryItem>(remoteUrl);
        return setCachedValue(rawItemCache, cacheKey, item);
      } catch (error) {
        const staleItem = getCachedValue(rawItemCache, cacheKey, {
          allowStale: true,
        });
        if (staleItem) return staleItem;

        if (error instanceof PromptLibraryAssetError && error.status === 404) {
          return undefined;
        }

        try {
          const fallbackItem = await getFallbackPromptLibraryItem(
            model,
            rawSlug
          );
          if (fallbackItem) {
            return setCachedValue(rawItemCache, cacheKey, fallbackItem);
          }
        } catch {
          // Preserve the original remote error if every fallback source fails.
        }

        throw error;
      } finally {
        itemRequests.delete(cacheKey);
      }
    })();

    itemRequests.set(cacheKey, request);
    return request;
  }

  const cached = getCachedValue(rawItemCache, cacheKey);
  if (cached) return cached;

  const importedItemForRawSlug = getPromptLibraryImportItem(model, rawSlug);

  if (importedItemForRawSlug) {
    return setCachedValue(rawItemCache, cacheKey, importedItemForRawSlug);
  }

  const item = await getLocalOrPublicPromptLibraryItem(model, rawSlug);

  if (item) setCachedValue(rawItemCache, cacheKey, item);

  return item;
}

export async function getPromptLibraryItem(
  model: PromptLibraryModel,
  slug: string
) {
  const item = await getRawPromptLibraryItem(model, slug);

  return item ? sanitizePromptLibraryItem(item, { model }) : item;
}
