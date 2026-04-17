import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { loadMessages } from '@/core/i18n/request';
import { getThemePage } from '@/core/theme';
import { envConfigs } from '@/config';
import { getLocalPage } from '@/shared/models/post';

function getDynamicPageMessagePath(slug: string | string[]) {
  const segments =
    typeof slug === 'string' ? slug.split('/').filter(Boolean) : slug;

  return segments.length > 0 ? `pages/${segments.join('/')}` : '';
}

// dynamic page metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string | string[] }>;
}) {
  const { locale, slug } = await params;

  // metadata values
  let title = '';
  let description = '';
  let canonicalUrl = '';

  // 1. try to get static page metadata from
  // content/pages/**/*.mdx

  // static page slug
  const staticPageSlug =
    typeof slug === 'string' ? slug : (slug as string[]).join('/') || '';

  // build canonical url
  canonicalUrl =
    locale !== envConfigs.locale
      ? `${envConfigs.app_url}/${locale}/${staticPageSlug}`
      : `${envConfigs.app_url}/${staticPageSlug}`;

  // get static page content
  const staticPage = await getLocalPage({ slug: staticPageSlug, locale });

  // return static page metadata
  if (staticPage) {
    title = staticPage.title || '';
    description = staticPage.description || '';

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
    };
  }

  // 2. static page not found, try to get dynamic page metadata from
  // src/config/locale/messages/{locale}/pages/**/*.json

  const dynamicPageMessages = await loadMessages(
    getDynamicPageMessagePath(slug),
    locale
  );

  // return dynamic page metadata
  if (dynamicPageMessages?.metadata) {
    title = dynamicPageMessages.metadata.title || '';
    description = dynamicPageMessages.metadata.description || '';

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
    };
  }

  // 3. return common metadata
  const tc = await getTranslations('common.metadata');

  title = tc('title');
  description = tc('description');

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string | string[] }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  // 1. try to get static page from
  // content/pages/**/*.mdx

  // static page slug
  const staticPageSlug =
    typeof slug === 'string' ? slug : (slug as string[]).join('/') || '';

  // get static page content
  const staticPage = await getLocalPage({ slug: staticPageSlug, locale });

  // return static page
  if (staticPage) {
    const Page = await getThemePage('static-page');

    return <Page locale={locale} post={staticPage} />;
  }

  // 2. static page not found
  // try to get dynamic page content from
  // src/config/locale/messages/{locale}/pages/**/*.json

  const dynamicPageMessages = await loadMessages(
    getDynamicPageMessagePath(slug),
    locale
  );

  // return dynamic page
  if (dynamicPageMessages?.page) {
    const Page = await getThemePage('dynamic-page');
    return <Page locale={locale} page={dynamicPageMessages.page} />;
  }

  // 3. page not found
  return notFound();
}
