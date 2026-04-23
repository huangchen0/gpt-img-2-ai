import { unstable_cache } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getMetadata } from '@/shared/lib/seo';
import {
  buildHomeImageShowcaseItems,
  HOME_SHOWCASE_LIMIT,
} from '@/shared/lib/showcase-feed';
import { getLatestShowcases } from '@/shared/models/showcase';
import { ShowcasesFlowDynamic } from '@/themes/default/blocks/showcases-flow-dynamic';

export const generateMetadata = getMetadata({
  metadataKey: 'pages.showcases.metadata',
  canonicalUrl: '/showcases',
});

const getCachedHomeShowcases = unstable_cache(
  async () =>
    getLatestShowcases({
      excludeTags: 'hairstyles',
      sortOrder: 'desc',
      limit: HOME_SHOWCASE_LIMIT,
    }),
  ['landing-home-showcases'],
  { revalidate: 300 }
);

export default async function ShowcasesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing');
  const showcasesData = t.raw('showcases-flow');
  const rawShowcases = await getCachedHomeShowcases();
  const initialShowcases = buildHomeImageShowcaseItems({
    locale,
    showcases: rawShowcases,
    limit: HOME_SHOWCASE_LIMIT,
  });

  return (
    <ShowcasesFlowDynamic
      id={showcasesData.id}
      title={showcasesData.title}
      description={showcasesData.description}
      containerClassName="py-14"
      excludeTags="hairstyles"
      sortOrder="desc"
      hideCreateButton={false}
      showPreview={true}
      imagesOnly={true}
      initialItems={initialShowcases}
      disableFetch={true}
    />
  );
}
