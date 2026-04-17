import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { getMetadata } from '@/shared/lib/seo';
import { DynamicPage, Section } from '@/shared/types/blocks/landing';
import { HairstylesContent } from './hairstyles-content';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const generateMetadata = getMetadata({
  metadataKey: 'pages.hairstyles.metadata',
  canonicalUrl: '/hairstyles',
});

export default async function HairstylesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // load hairstyles data
  const t = await getTranslations('pages.hairstyles');

  const sectionData = t.raw('showcases-flow') as Section;

  // build page sections
  const page: DynamicPage = {
    sections: {
      'hairstyles-content': {
        component: <HairstylesContent sectionData={sectionData} />,
      },
    },
  };

  // load page component
  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
