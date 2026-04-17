import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { getMetadata } from '@/shared/lib/seo';
import { DynamicPage } from '@/shared/types/blocks/landing';

export const generateMetadata = getMetadata({
  metadataKey: 'pages.terms.metadata',
  canonicalUrl: '/terms-of-service',
});

export default async function TermsOfServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('pages.terms');

  // build page sections
  const page: DynamicPage = {
    sections: {
      terms: {
        block: 'legal-page',
        data: {
          title: t('title'),
          lastUpdated: t('lastUpdated'),
          content: t.raw('content'),
        },
      },
    },
  };

  // load page component
  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
