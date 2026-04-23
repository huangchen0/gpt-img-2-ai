import type { Metadata } from 'next';
import Script from 'next/script';
import { setRequestLocale } from 'next-intl/server';

import { getAlternateLanguageUrlsByLocales } from '@/shared/lib/seo';
import { getCanonicalAppUrl } from '@/shared/prompt-library/seo';

import { GptImage2PromptGalleryClient } from './prompt-gallery-client';

export const revalidate = 3600;

const promptLibrarySeoConfig = {
  path: '/prompts/gpt-image-2',
  collectionTitle: 'GPT Image 2 Prompt Gallery: 725 Copyable Image Prompts',
  collectionDescription:
    'Browse copyable GPT Image 2 prompts for product photos, posters, UI mockups, characters, infographics, social images, and reference-based image editing.',
  collectionKeywords: [
    'GPT Image 2 prompts',
    'GPT Image 2 prompt gallery',
    'AI image prompts',
    'copyable image prompts',
    'GPT image generator prompts',
    'image to image prompts',
  ],
};

function getCanonicalUrl(path: string) {
  return `${getCanonicalAppUrl()}${path}`;
}

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
  const canonicalUrl = getCanonicalUrl(promptLibrarySeoConfig.path);

  return {
    title: promptLibrarySeoConfig.collectionTitle,
    description: `${promptLibrarySeoConfig.collectionDescription} Includes 725 curated examples.`,
    keywords: [...promptLibrarySeoConfig.collectionKeywords],
    alternates: {
      canonical: canonicalUrl,
      languages: getAlternateLanguageUrlsByLocales(
        promptLibrarySeoConfig.path,
        ['en']
      ),
    },
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      title: promptLibrarySeoConfig.collectionTitle,
      description: promptLibrarySeoConfig.collectionDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: promptLibrarySeoConfig.collectionTitle,
      description: promptLibrarySeoConfig.collectionDescription,
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: promptLibrarySeoConfig.collectionTitle,
    description: promptLibrarySeoConfig.collectionDescription,
    url: getCanonicalUrl(promptLibrarySeoConfig.path),
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
      />
    </>
  );
}
