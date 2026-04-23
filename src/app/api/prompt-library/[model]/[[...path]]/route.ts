import { NextResponse } from 'next/server';

import {
  getPromptLibraryDataset,
  getPromptLibraryItem,
} from '@/shared/prompt-library/data';
import type { PromptLibraryModel } from '@/shared/prompt-library/types';

const supportedModels = new Set<PromptLibraryModel>(['gpt-image-2']);
const cacheControl =
  'public, max-age=300, s-maxage=3600, stale-while-revalidate=14400';

function isSupportedModel(value: string): value is PromptLibraryModel {
  return supportedModels.has(value as PromptLibraryModel);
}

function getPromptLibraryCacheHeaders() {
  return {
    'Cache-Control': cacheControl,
    'CDN-Cache-Control': cacheControl,
    'Cloudflare-CDN-Cache-Control': cacheControl,
  };
}

function getNoStoreHeaders() {
  return {
    'Cache-Control': 'no-store',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
  };
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ model: string; path?: string[] }>;
  }
) {
  const { model, path = [] } = await params;

  if (!isSupportedModel(model)) {
    return NextResponse.json(
      { error: 'Unsupported prompt library model' },
      { status: 404 }
    );
  }

  if (path.length === 0 || (path.length === 1 && path[0] === 'index.json')) {
    try {
      const dataset = await getPromptLibraryDataset(model);

      return NextResponse.json(
        {
          ...dataset,
          assetBaseUrl: '/api/prompt-library',
        },
        { headers: getPromptLibraryCacheHeaders() }
      );
    } catch {
      return NextResponse.json(
        { error: 'Prompt library is temporarily unavailable' },
        { status: 503, headers: getNoStoreHeaders() }
      );
    }
  }

  if (path.length === 2 && path[0] === 'items' && path[1].endsWith('.json')) {
    const slug = path[1].replace(/\.json$/, '');
    let item: Awaited<ReturnType<typeof getPromptLibraryItem>>;

    try {
      item = await getPromptLibraryItem(model, slug);
    } catch {
      return NextResponse.json(
        { error: 'Prompt is temporarily unavailable' },
        { status: 503, headers: getNoStoreHeaders() }
      );
    }

    if (!item) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    return NextResponse.json(item, {
      headers: getPromptLibraryCacheHeaders(),
    });
  }

  return NextResponse.json(
    { error: 'Prompt library asset not found' },
    { status: 404 }
  );
}
