import { NextResponse } from 'next/server';

import {
  getPromptLibraryDataset,
  getPromptLibraryItem,
} from '@/shared/prompt-library/data';
import type { PromptLibraryModel } from '@/shared/prompt-library/types';

const supportedModels = new Set<PromptLibraryModel>(['gpt-image-2']);

function isSupportedModel(value: string): value is PromptLibraryModel {
  return supportedModels.has(value as PromptLibraryModel);
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
    const dataset = await getPromptLibraryDataset(model);

    return NextResponse.json({
      ...dataset,
      assetBaseUrl: '/api/prompt-library',
    });
  }

  if (path.length === 2 && path[0] === 'items' && path[1].endsWith('.json')) {
    const slug = path[1].replace(/\.json$/, '');
    const item = await getPromptLibraryItem(model, slug);

    if (!item) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  }

  return NextResponse.json(
    { error: 'Prompt library asset not found' },
    { status: 404 }
  );
}
