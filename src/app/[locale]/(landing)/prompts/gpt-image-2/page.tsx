import type { Metadata } from 'next';
import Script from 'next/script';
import { setRequestLocale } from 'next-intl/server';

import { getAlternateLanguageUrlsByLocales } from '@/shared/lib/seo';
import {
  getPromptLibraryLocale,
  promptLibraryLocales,
} from '@/shared/prompt-library/localization';
import {
  getCanonicalUrl,
  getPromptLibrarySeoConfig,
} from '@/shared/prompt-library/seo';

import { GptImage2PromptGalleryClient } from './prompt-gallery-client';

export const revalidate = 3600;

function getPromptLibraryDatasetUrl() {
  return '/prompt-library/gpt-image-2/index.json';
}

function getPromptLibraryFallbackDatasetUrl() {
  return '/api/prompt-library/gpt-image-2/index.json';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const promptLocale = getPromptLibraryLocale(locale);
  const seoConfig = getPromptLibrarySeoConfig(promptLocale);
  const canonicalUrl = getCanonicalUrl(seoConfig.path, promptLocale);

  return {
    title: seoConfig.collectionTitle,
    description:
      promptLocale === 'zh'
        ? `${seoConfig.collectionDescription} 当前收录 725 条精选示例。`
        : `${seoConfig.collectionDescription} Includes 725 curated examples.`,
    keywords: [...seoConfig.collectionKeywords],
    alternates: {
      canonical: canonicalUrl,
      languages: getAlternateLanguageUrlsByLocales(
        seoConfig.path,
        promptLibraryLocales
      ),
    },
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      title: seoConfig.collectionTitle,
      description: seoConfig.collectionDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: seoConfig.collectionTitle,
      description: seoConfig.collectionDescription,
    },
  };
}

export default async function GptImage2PromptsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const promptLocale = getPromptLibraryLocale(locale);
  const seoConfig = getPromptLibrarySeoConfig(promptLocale);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: seoConfig.collectionTitle,
    description: seoConfig.collectionDescription,
    url: getCanonicalUrl(seoConfig.path, promptLocale),
    inLanguage: promptLocale === 'zh' ? 'zh-CN' : 'en',
  };

  return (
    <>
      <Script
        id="gpt-image-2-prompt-library-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GptImage2PromptGalleryClient
        datasetUrl={getPromptLibraryDatasetUrl()}
        fallbackDatasetUrl={getPromptLibraryFallbackDatasetUrl()}
        initialTotal={725}
        locale={promptLocale}
      />
    </>
  );
}
