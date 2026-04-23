import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import { ImageGeneratorSwitcher } from '@/shared/components/image-generator-switcher';
import { FAQSchema } from '@/shared/components/seo';
import { getAlternateLanguageUrls } from '@/shared/lib/seo';

async function loadExactMessages(path: string, locale: string) {
  try {
    const messages = await import(
      `@/config/locale/messages/${locale}/${path}.json`
    );
    return messages.default;
  } catch {
    return null;
  }
}

async function getGptImage2Messages(locale: string) {
  const candidates = [
    ['pages/models/gpt-image-2', locale],
    ['pages/models/nano-banana', locale],
    ['pages/models/gpt-image-2', defaultLocale],
    ['pages/models/nano-banana', defaultLocale],
  ] as const;
  const checkedCandidates = new Set<string>();

  for (const [path, candidateLocale] of candidates) {
    const key = `${candidateLocale}:${path}`;
    if (checkedCandidates.has(key)) {
      continue;
    }

    checkedCandidates.add(key);
    const messages = await loadExactMessages(path, candidateLocale);
    if (messages?.page) {
      return messages;
    }
  }

  return {};
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getGptImage2Messages(locale);
  const canonicalPath =
    locale !== defaultLocale
      ? `${envConfigs.app_url}/${locale}/models/gpt-image-2`
      : `${envConfigs.app_url}/models/gpt-image-2`;
  const title = messages?.metadata?.title ?? '';
  const description = messages?.metadata?.description ?? '';
  const keywords = messages?.metadata?.keywords ?? '';
  const imageUrl = envConfigs.app_preview_image?.startsWith('http')
    ? envConfigs.app_preview_image
    : `${envConfigs.app_url}${envConfigs.app_preview_image}`;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalPath,
      languages: getAlternateLanguageUrls('/models/gpt-image-2'),
    },
    openGraph: {
      type: 'website',
      locale,
      url: canonicalPath,
      title,
      description,
      siteName: envConfigs.app_name || '',
      images: [imageUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
      site: envConfigs.app_url,
    },
  };
}

export default async function GptImage2Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const messages = await getGptImage2Messages(locale);
  if (!messages?.page) {
    notFound();
  }

  const Page = await getThemePage('dynamic-page');
  const page = {
    title: messages.page.title,
    description: messages.page.description,
    sections: {
      hero: {
        id: 'hero',
        title: messages.page.heroTitle ?? messages.page.title,
        description: messages.page.heroDescription ?? messages.page.description,
        background_image: {
          src: '/imgs/bg/tree.jpg',
          alt: messages.page.title,
        },
      },
      generator: {
        component: <ImageGeneratorSwitcher id="generator" />,
      },
    },
  };
  const faqItems = Array.isArray(messages.page.faqItems)
    ? messages.page.faqItems.filter(
        (item: { question?: string; answer?: string }) =>
          item.question && item.answer
      )
    : [];

  return (
    <>
      <Page locale={locale} page={page} />
      {faqItems.length > 0 && (
        <FAQSchema
          faqs={faqItems.map((item: { question: string; answer: string }) => ({
            question: item.question,
            answer: item.answer,
          }))}
        />
      )}
    </>
  );
}
