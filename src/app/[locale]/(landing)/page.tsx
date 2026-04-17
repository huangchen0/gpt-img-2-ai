import { unstable_cache } from 'next/cache';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { SiteSchema } from '@/shared/components/seo';
import { HomeGeneratorSwitcher } from '@/shared/components/home-generator-switcher';
import { getMetadata } from '@/shared/lib/seo';
import {
  buildHomeImageShowcaseItems,
  HOME_SHOWCASE_LIMIT,
} from '@/shared/lib/showcase-feed';
import { getLatestShowcases } from '@/shared/models/showcase';
import { DynamicPage, Section } from '@/shared/types/blocks/landing';
import { ShowcasesFlowDynamic } from '@/themes/default/blocks/showcases-flow-dynamic';

export const generateMetadata = getMetadata({
  metadataKey: 'landing.metadata',
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

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing');
  const tp = await getTranslations('pages.pricing');

  // Cache the public home page data, and let pricing resolve any signed-in state client-side.
  const rawShowcases = await getCachedHomeShowcases();
  const initialShowcases = buildHomeImageShowcaseItems({
    locale,
    showcases: rawShowcases,
    limit: HOME_SHOWCASE_LIMIT,
  });

  const showSections = [
    'hero',
    'generator',
    'showcases-flow',
    'logos',
    'introduce',
    'benefits',
    'how-to-techniques',
    'usage',
    'features',
    'stats',
    'testimonials',
    'faq',
    'cta',
    'pricing',
    'subscribe',
  ];

  // build page sections
  const page: DynamicPage = {
    sections: showSections.reduce<Record<string, Section>>((acc, section) => {
      if (section === 'generator') {
        // Add video generator component
        acc[section] = {
          component: <HomeGeneratorSwitcher />,
        };
      } else if (section === 'showcases-flow') {
        const sectionData = t.raw(section) as Section;
        acc[section] = {
          ...sectionData,
          component: (
            <ShowcasesFlowDynamic
              key="showcases-flow"
              id={sectionData.id}
              title={sectionData.title}
              description={sectionData.description}
              excludeTags="hairstyles"
              sortOrder="desc"
              hideCreateButton={true}
              imagesOnly={true}
              initialItems={initialShowcases}
            />
          ),
        };
      } else if (section === 'pricing') {
        // Add pricing section with dynamic data
        acc[section] = {
          block: 'pricing',
          data: {
            pricing: tp.raw('pricing'),
          },
        };
      } else {
        const sectionData = t.raw(section) as Section;
        // Skip sections that are explicitly hidden, null, or undefined
        if (
          sectionData &&
          typeof sectionData === 'object' &&
          sectionData.hidden !== true
        ) {
          acc[section] = sectionData;
        }
      }
      return acc;
    }, {}),
  };

  // load page component
  const Page = await getThemePage('dynamic-page');

  return (
    <>
      <SiteSchema
        locale={locale}
        description={t('metadata.description')}
      />
      <Page locale={locale} page={page} />
    </>
  );
}
