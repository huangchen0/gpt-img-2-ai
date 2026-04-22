import { unstable_cache } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getMetadata } from '@/shared/lib/seo';
import { buildCombinedShowcaseItems } from '@/shared/lib/showcase-feed';
import { getLatestShowcases } from '@/shared/models/showcase';
import { ShowcasesFlowDynamic } from '@/themes/default/blocks/showcases-flow-dynamic';

const SHOWCASES_PAGE_LIMIT = 48;

export const generateMetadata = getMetadata({
  metadataKey: 'pages.showcases.metadata',
  canonicalUrl: '/showcases',
});

const getCachedShowcasesPageItems = unstable_cache(
  async () =>
    getLatestShowcases({
      excludeTags: 'hairstyles',
      sortOrder: 'desc',
      limit: SHOWCASES_PAGE_LIMIT,
    }),
  ['showcases-page-items'],
  { revalidate: 300 }
);

export default async function ShowcasesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('pages.showcases');
  const showcasesData = t.raw('showcases-flow');
  const rawShowcases = await getCachedShowcasesPageItems();
  const initialShowcases = buildCombinedShowcaseItems({
    locale,
    showcases: rawShowcases,
    limit: SHOWCASES_PAGE_LIMIT,
  });

  return (
    <ShowcasesFlowDynamic
      title={showcasesData.title}
      description={showcasesData.description}
      containerClassName="py-14"
      initialItems={initialShowcases}
      disableFetch={true}
    />
  );
}
