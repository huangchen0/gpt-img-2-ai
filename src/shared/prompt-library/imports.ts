import fs from 'fs';
import path from 'path';

import { getPromptCategories } from './insights';
import type {
  PromptLibraryIndexItem,
  PromptLibraryItem,
  PromptLibraryModel,
  PromptLibraryPromptVariant,
} from './types';

export type PromptLibraryImportMetadata = {
  importSource: string;
  externalId?: string | null;
  importedAt?: string | null;
  originalAuthor?: string | null;
  originalAuthorUrl?: string | null;
  originalUrl?: string | null;
};

export type PromptLibraryImportedItem = PromptLibraryItem & {
  categories?: string[];
  importMetadata?: PromptLibraryImportMetadata;
};

export type PromptLibraryImportDataset = {
  model: PromptLibraryModel;
  source: string;
  sourceUrl: string;
  syncedAt: string;
  items: PromptLibraryImportedItem[];
};

const importDatasetFiles: Record<PromptLibraryModel, string[]> = {
  'gpt-image-2': ['opennana-chatgpt.json'],
};

function getPromptLibraryImportDir(model: PromptLibraryModel) {
  return path.join(process.cwd(), 'data', 'prompt-library', 'imports', model);
}

function getPromptPreview(prompt: string) {
  return prompt.replace(/\s+/g, ' ').trim().slice(0, 360);
}

function normalizePromptVariants(
  prompt: string,
  promptVariants?: PromptLibraryPromptVariant[]
) {
  const variants = (promptVariants || [])
    .map((variant) => ({
      ...variant,
      text: variant.text?.trim() || '',
    }))
    .filter((variant) => variant.text);

  if (variants.length === 0) {
    return undefined;
  }

  const deduped = variants.filter(
    (variant, index, items) =>
      items.findIndex((candidate) => candidate.text === variant.text) === index
  );

  const primaryIndex = deduped.findIndex((variant) => variant.text === prompt);
  if (primaryIndex > 0) {
    const [primary] = deduped.splice(primaryIndex, 1);
    deduped.unshift(primary);
  }

  return deduped;
}

function stripImportOnlyFields(
  item: PromptLibraryImportedItem
): PromptLibraryItem {
  const {
    categories: _categories,
    importMetadata: _importMetadata,
    ...publicItem
  } = item;

  const prompt = publicItem.prompt?.trim() || '';
  const promptVariants = normalizePromptVariants(
    prompt,
    publicItem.promptVariants
  );

  return {
    ...publicItem,
    prompt,
    promptVariants,
  };
}

function readPromptLibraryImportDataset(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  return JSON.parse(
    fs.readFileSync(filePath, 'utf8')
  ) as PromptLibraryImportDataset;
}

function getPromptLibraryImportDatasets(model: PromptLibraryModel) {
  const importDir = getPromptLibraryImportDir(model);
  const filenames = importDatasetFiles[model] || [];

  return filenames
    .map((filename) =>
      readPromptLibraryImportDataset(path.join(importDir, filename))
    )
    .filter(Boolean) as PromptLibraryImportDataset[];
}

export function getPromptLibraryImportItems(model: PromptLibraryModel) {
  return getPromptLibraryImportDatasets(model).flatMap((dataset) =>
    dataset.items.map(stripImportOnlyFields)
  );
}

export function getPromptLibraryImportItem(
  model: PromptLibraryModel,
  slug: string
) {
  const datasets = getPromptLibraryImportDatasets(model);

  for (const dataset of datasets) {
    const item = dataset.items.find((candidate) => candidate.slug === slug);
    if (item) {
      return stripImportOnlyFields(item);
    }
  }

  return undefined;
}

export function getPromptLibraryImportIndexItems(
  model: PromptLibraryModel
): PromptLibraryIndexItem[] {
  return getPromptLibraryImportDatasets(model).flatMap((dataset) =>
    dataset.items.map((item) => {
      const publicItem = stripImportOnlyFields(item);

      return {
        id: publicItem.id,
        slug: publicItem.slug,
        model: publicItem.model,
        title: publicItem.title,
        description: publicItem.description,
        promptPreview: getPromptPreview(publicItem.prompt),
        language: publicItem.language,
        featured: publicItem.featured,
        authorName: publicItem.authorName,
        authorUrl: publicItem.authorUrl,
        sourceUrl: publicItem.sourceUrl,
        publishedAt: publicItem.publishedAt,
        media: publicItem.media.slice(0, 1),
        syncedAt: publicItem.syncedAt,
        categories:
          item.categories?.length && item.categories.length > 0
            ? item.categories
            : getPromptCategories({
                title: publicItem.title,
                description: publicItem.description,
                prompt: publicItem.prompt,
                tags: publicItem.tags,
              }),
      };
    })
  );
}

export function getLatestPromptLibrarySyncTime(
  values: Array<string | null | undefined>
) {
  const timestamps = values
    .map((value) => {
      if (!value) {
        return undefined;
      }

      const parsed = new Date(value).getTime();
      return Number.isFinite(parsed) ? parsed : undefined;
    })
    .filter((value): value is number => typeof value === 'number');

  if (timestamps.length === 0) {
    return new Date().toISOString();
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

export function sortPromptLibraryItems<
  T extends {
    featured?: boolean;
    publishedAt?: string | null;
    syncedAt: string;
  },
>(items: T[]) {
  return items.slice().sort((a, b) => {
    const featuredDelta =
      Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    if (featuredDelta !== 0) {
      return featuredDelta;
    }

    const aDate = new Date(a.publishedAt || a.syncedAt).getTime();
    const bDate = new Date(b.publishedAt || b.syncedAt).getTime();
    return bDate - aDate;
  });
}

export function mergePromptLibraryIndexItems(
  baseItems: PromptLibraryIndexItem[],
  importedItems: PromptLibraryIndexItem[]
) {
  const mergedItems = [...baseItems];
  const seenSlugs = new Set(baseItems.map((item) => item.slug));

  for (const item of importedItems) {
    if (seenSlugs.has(item.slug)) {
      continue;
    }

    seenSlugs.add(item.slug);
    mergedItems.push(item);
  }

  return sortPromptLibraryItems(mergedItems);
}
