import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';

import { envConfigs } from '@/config';
import { locales } from '@/config/locale';
import {
  getShowcasePublicPath,
  shouldIndexShowcase,
} from '@/shared/lib/showcase-seo';
import { toISOStringSafe } from '@/shared/lib/time';
import { getLatestShowcases } from '@/shared/models/showcase';

const getCachedSitemapShowcases = unstable_cache(
  async () =>
    getLatestShowcases({
      limit: 100,
      sortOrder: 'desc',
    }),
  ['showcase-sitemap-showcases'],
  { revalidate: 3600 }
);

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const showcases = await getCachedSitemapShowcases();

  const urls = showcases.filter(shouldIndexShowcase).flatMap((showcase) =>
    locales.map((locale) => ({
      loc: `${envConfigs.app_url}${getShowcasePublicPath(showcase, locale)}`,
      lastmod: toISOStringSafe(showcase.createdAt),
    }))
  );

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (item) => `  <url>
    <loc>${escapeXml(item.loc)}</loc>
    ${item.lastmod ? `<lastmod>${escapeXml(item.lastmod)}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
