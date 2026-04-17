import { NextRequest, NextResponse } from 'next/server';

import {
  getHomeShowcaseFallbackItems,
  isImageUrl,
} from '@/shared/lib/showcase-feed';
import { getIsoTimestr, toISOStringSafe } from '@/shared/lib/time';
import { getPrompts, PromptStatus } from '@/shared/models/prompt';
import { getLatestShowcases } from '@/shared/models/showcase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const tags = searchParams.get('tags') || undefined;
    const excludeTags = searchParams.get('excludeTags') || undefined;
    const searchTerm = searchParams.get('searchTerm') || undefined;
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as
      | 'asc'
      | 'desc';
    const usePrompts = searchParams.get('usePrompts') === 'true';
    const imagesOnly = searchParams.get('imagesOnly') === 'true';
    const locale = searchParams.get('locale') || 'en';

    console.log('Fetching latest showcases with params:', {
      limit,
      tags,
      excludeTags,
      searchTerm,
      sortOrder,
      usePrompts,
      imagesOnly,
      locale,
    });

    try {
      // If usePrompts flag is set, fetch from prompts table
      if (usePrompts) {
        const prompts = await getPrompts({
          page: 1,
          limit,
          status: PromptStatus.PUBLISHED,
        });

        // Transform prompts to match showcase format
        // Use promptTitle as title for the "Create Similar" button
        const transformedData = prompts.map((prompt) => ({
          id: prompt.id,
          title: prompt.promptTitle,
          description: prompt.description,
          prompt: prompt.promptTitle,
          image: prompt.image || '',
          createdAt: toISOStringSafe(prompt.createdAt) ?? getIsoTimestr(),
        }));

        console.log(`Found ${transformedData.length} prompts`);

        return NextResponse.json({
          code: 0,
          message: 'success',
          data: transformedData,
        });
      }

      // Otherwise, fetch from showcases table
      const showcases = await getLatestShowcases({
        limit,
        tags,
        excludeTags,
        searchTerm,
        sortOrder,
      });
      const transformedShowcases = imagesOnly
        ? showcases.filter((item) => isImageUrl(item.image))
        : showcases;
      const data =
        imagesOnly && transformedShowcases.length === 0
          ? getHomeShowcaseFallbackItems(locale).slice(0, limit)
          : transformedShowcases;
      console.log(`Found ${data.length} showcases`);

      return NextResponse.json({
        code: 0,
        message: 'success',
        data,
      });
    } catch (err: any) {
      console.error('Error fetching showcases inside route handler:', err);
      throw err;
    }
  } catch (error: any) {
    console.error('Get showcases error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
