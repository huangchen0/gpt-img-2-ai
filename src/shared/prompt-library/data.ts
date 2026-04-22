import 'server-only';

import fs from 'fs';
import path from 'path';

import { envConfigs } from '@/config';
import { getPromptCategories } from '@/shared/prompt-library/insights';

import type {
  PromptLibraryIndexDataset,
  PromptLibraryIndexItem,
  PromptLibraryItem,
  PromptLibraryModel,
} from './types';

const datasetFiles: Record<PromptLibraryModel, string> = {
  'gpt-image-2': 'gpt-image-2',
};

const indexCache = new Map<string, PromptLibraryIndexDataset>();
const itemCache = new Map<string, PromptLibraryItem>();

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
  return path.join(process.cwd(), 'public', 'prompt-library', datasetFiles[model]);
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

async function fetchPromptLibraryJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: 3600 },
    headers: { accept: 'application/json' },
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

function readLocalPromptLibraryDataset(model: PromptLibraryModel) {
  const filePath = path.join(getPromptLibraryDir(model), 'index.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as PromptLibraryIndexDataset;
}

function readLocalPromptLibraryItem(model: PromptLibraryModel, slug: string) {
  const filePath = path.join(getPromptLibraryDir(model), 'items', `${slug}.json`);
  if (!fs.existsSync(filePath)) return undefined;

  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as PromptLibraryItem;
}

export async function getPromptLibraryDataset(model: PromptLibraryModel) {
  const remoteUrl = getRemoteAssetUrl(model, 'index.json');
  if (remoteUrl) {
    const dataset = normalizeIndexDataset(
      await fetchPromptLibraryJson<PromptLibraryIndexDataset>(remoteUrl)
    );
    dataset.assetBaseUrl = getRemoteBaseUrl();
    return dataset;
  }

  const cached = indexCache.get(model);
  if (cached) return cached;

  let dataset: PromptLibraryIndexDataset;

  try {
    dataset = normalizeIndexDataset(readLocalPromptLibraryDataset(model));
  } catch {
    dataset = normalizeIndexDataset(
      await fetchPromptLibraryJson<PromptLibraryIndexDataset>(
        getPublicAssetUrl(model, 'index.json')
      )
    );
  }

  dataset.assetBaseUrl = getRemoteBaseUrl();
  indexCache.set(model, dataset);

  return dataset;
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
      return bMatch - aMatch || Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    })
    .slice(0, limit);
}

export async function getPromptLibraryItem(model: PromptLibraryModel, slug: string) {
  const remoteUrl = getRemoteAssetUrl(model, `items/${slug}.json`);
  if (remoteUrl) {
    try {
      return await fetchPromptLibraryJson<PromptLibraryItem>(remoteUrl);
    } catch (error) {
      if (error instanceof PromptLibraryAssetError && error.status === 404) {
        return undefined;
      }

      throw error;
    }
  }

  const cacheKey = `${model}:${slug}`;
  const cached = itemCache.get(cacheKey);
  if (cached) return cached;

  let item = readLocalPromptLibraryItem(model, slug);

  if (!item) {
    try {
      item = await fetchPromptLibraryJson<PromptLibraryItem>(
        getPublicAssetUrl(model, `items/${slug}.json`)
      );
    } catch {
      item = undefined;
    }
  }

  if (item) itemCache.set(cacheKey, item);

  return item;
}
