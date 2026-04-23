import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import { LazyImage } from '@/shared/blocks/common';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  buildShowcaseImageObjectJsonLd,
  getShowcaseAlternateUrls,
  getShowcaseCanonicalUrl,
  getShowcaseDescription,
  getShowcaseIdFromParam,
  getShowcasePublicPath,
  getVisibleShowcaseTags,
  shouldIndexShowcase,
  toAbsoluteShowcaseAssetUrl,
} from '@/shared/lib/showcase-seo';
import { parseDateValue, type DateValue } from '@/shared/lib/time';
import { getLatestShowcases, getShowcase } from '@/shared/models/showcase';

import { ShowcaseShareActions } from './showcase-share-actions';

const getCachedShowcaseById = unstable_cache(
  async (showcaseId: string) => getShowcase(showcaseId),
  ['showcase-detail'],
  { revalidate: 300 }
);

const getShowcaseForDetail = cache(async (param: string) =>
  getCachedShowcaseById(getShowcaseIdFromParam(param))
);

const getCachedRelatedShowcases = unstable_cache(
  async () =>
    getLatestShowcases({
      limit: 8,
      sortOrder: 'desc',
    }),
  ['showcase-detail-related'],
  { revalidate: 300 }
);

function formatShowcaseDate(value: DateValue, locale: string) {
  const date = parseDateValue(value);

  if (!date) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const showcase = await getShowcaseForDetail(id);

  if (!showcase) {
    return {};
  }

  const t = await getTranslations({
    locale,
    namespace: 'pages.showcases.detail',
  });
  const canonicalPath = getShowcaseCanonicalUrl(showcase, locale);
  const title = showcase.title || t('fallback_title');
  const description = getShowcaseDescription(
    showcase,
    t('fallback_description')
  );
  const shouldIndex = shouldIndexShowcase(showcase);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: getShowcaseAlternateUrls(showcase),
    },
    openGraph: {
      type: 'website',
      locale,
      url: canonicalPath,
      title,
      description,
      siteName: envConfigs.app_name,
      images: [showcase.image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [showcase.image],
    },
    robots: {
      index: shouldIndex,
      follow: true,
    },
  };
}

export default async function ShowcaseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('pages.showcases.detail');
  const showcase = await getShowcaseForDetail(id);
  if (!showcase) {
    notFound();
  }

  const prompt = showcase.prompt?.trim() || showcase.title;
  const createHref = `/ai-image${prompt ? `?prompt=${encodeURIComponent(prompt)}` : ''}`;
  const description = getShowcaseDescription(
    showcase,
    t('fallback_description')
  );
  const canonicalUrl = getShowcaseCanonicalUrl(showcase, locale);
  const imageUrl = toAbsoluteShowcaseAssetUrl(showcase.image);
  const tags = getVisibleShowcaseTags(showcase.tags).slice(0, 8);
  const jsonLd = buildShowcaseImageObjectJsonLd({
    showcase,
    locale,
    description,
  });
  const relatedShowcases = (await getCachedRelatedShowcases())
    .filter(
      (item) =>
        item.id !== showcase.id && item.image && shouldIndexShowcase(item)
    )
    .slice(0, 4);

  return (
    <main className="container py-12 md:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="bg-background overflow-hidden rounded-lg border">
          <LazyImage
            src={showcase.image}
            alt={showcase.title}
            className="h-auto w-full"
            sizes="(max-width: 1024px) 100vw, 760px"
          />
        </div>

        <aside className="flex flex-col gap-5">
          <div>
            <p className="text-muted-foreground text-sm">
              {t('generated_with', { appName: envConfigs.app_name })}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-balance">
              {showcase.title}
            </h1>
            <p className="text-muted-foreground mt-3 text-sm leading-6">
              {description}
            </p>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {showcase.prompt && (
            <div className="bg-muted/25 rounded-lg border p-4">
              <p className="text-sm font-medium">{t('prompt')}</p>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {showcase.prompt}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">{t('published')}</p>
              <p className="mt-1 font-medium">
                {formatShowcaseDate(showcase.createdAt, locale)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">{t('asset_type')}</p>
              <p className="mt-1 font-medium">{t('image')}</p>
            </div>
          </div>

          <ShowcaseShareActions
            shareUrl={canonicalUrl}
            imageUrl={imageUrl}
            title={showcase.title}
            description={description}
            appName={envConfigs.app_name}
            copy={{
              copyLink: t('share.copy_link'),
              copyMarkdown: t('share.copy_markdown'),
              copyEmbed: t('share.copy_embed'),
              shareToPinterest: t('share.pinterest'),
              shareToX: t('share.x'),
              copied: t('share.copied'),
              copyFailed: t('share.copy_failed'),
            }}
          />

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Button asChild>
              <Link href={createHref}>{t('create_similar')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/showcases">{t('view_showcases')}</Link>
            </Button>
          </div>
        </aside>
      </div>

      {relatedShowcases.length > 0 && (
        <section className="mx-auto mt-14 max-w-6xl">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">{t('related_title')}</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/showcases">{t('view_showcases')}</Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedShowcases.map((item) => (
              <Link
                key={item.id}
                href={getShowcasePublicPath(item)}
                locale={locale === defaultLocale ? undefined : locale}
                className="group bg-background overflow-hidden rounded-lg border"
              >
                <LazyImage
                  src={item.image}
                  alt={item.title}
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 25vw"
                />
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-medium">
                    {item.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
