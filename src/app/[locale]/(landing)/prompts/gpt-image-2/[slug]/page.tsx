import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { ArrowLeft, ExternalLink, ImageIcon } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';

import { Link } from '@/core/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { getAlternateLanguageUrlsByLocales } from '@/shared/lib/seo';
import {
  getPromptLibraryItem,
  getRelatedPromptLibraryItems,
} from '@/shared/prompt-library/data';
import { getPrimaryCategory } from '@/shared/prompt-library/insights';
import {
  getLocalizedCustomizationTips,
  getLocalizedPromptCategory,
  getLocalizedPromptLanguageLabel,
  getLocalizedPromptUseCaseSentence,
  getLocalizedSuggestedSettings,
  getPromptLibraryLocale,
  getPromptLibraryMessages,
  promptLibraryLocales,
} from '@/shared/prompt-library/localization';
import {
  buildPromptDetailJsonLd,
  getCanonicalUrl,
  getPromptDetailDescription,
  getPromptDetailTitle,
  getPromptKeywords,
  getPromptMediaImage,
  getPromptVisualAltText,
} from '@/shared/prompt-library/seo';

import { CopyPromptButton } from '../copy-prompt-button';
import { SharePromptButton } from '../share-prompt-button';

function getImageGeneratorUrl(prompt: string, locale?: string) {
  const trimmedPrompt = prompt.trim();
  const path = trimmedPrompt
    ? `/models/gpt-image-2?prompt=${encodeURIComponent(trimmedPrompt)}#generator`
    : '/models/gpt-image-2#generator';

  return getPromptLibraryLocale(locale) === 'zh' ? `/zh${path}` : path;
}

function getPromptVariantLabel(
  variant: { label?: string | null; type?: string | null },
  locale?: string
) {
  if (variant.label?.trim()) {
    return variant.label.trim();
  }

  if (variant.type?.trim()) {
    return getLocalizedPromptLanguageLabel(variant.type.trim(), locale);
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const item = await getPromptLibraryItem('gpt-image-2', slug);
  if (!item) return {};

  const promptLocale = getPromptLibraryLocale(locale);
  const path = `/prompts/gpt-image-2/${item.slug}`;
  const canonicalUrl = getCanonicalUrl(path, promptLocale);
  const image = getPromptMediaImage(item.media[0]);
  const title = getPromptDetailTitle(item, promptLocale);
  const description = getPromptDetailDescription(item, promptLocale);

  return {
    title,
    description,
    keywords: getPromptKeywords(item, promptLocale),
    alternates: {
      canonical: canonicalUrl,
      languages: getAlternateLanguageUrlsByLocales(path, promptLibraryLocales),
    },
    openGraph: {
      type: 'article',
      url: canonicalUrl,
      title,
      description,
      images: image ? [image] : undefined,
      publishedTime: item.publishedAt || item.syncedAt,
      modifiedTime: item.syncedAt,
      authors: item.authorName ? [item.authorName] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function GptImage2PromptDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const item = await getPromptLibraryItem('gpt-image-2', slug);
  if (!item) notFound();

  const promptLocale = getPromptLibraryLocale(locale);
  const messages = getPromptLibraryMessages(promptLocale);
  const category = getPrimaryCategory(item);
  const relatedItems = await getRelatedPromptLibraryItems(
    'gpt-image-2',
    item.slug,
    category
  );
  const canonicalUrl = getCanonicalUrl(
    `/prompts/gpt-image-2/${item.slug}`,
    promptLocale
  );
  const jsonLd = buildPromptDetailJsonLd({
    item,
    url: canonicalUrl,
    locale: promptLocale,
  });
  const settings = getLocalizedSuggestedSettings(item, promptLocale);
  const tips = getLocalizedCustomizationTips(item, promptLocale);
  const promptVariants =
    item.promptVariants && item.promptVariants.length > 0
      ? item.promptVariants
      : [{ text: item.prompt, type: item.language, label: null }];

  return (
    <main className="bg-background text-foreground">
      <Script
        id="gpt-image-2-prompt-detail-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="container py-8 md:py-12">
        <Button asChild variant="ghost" className="mb-6 px-0">
          <Link href="/prompts/gpt-image-2">
            <ArrowLeft className="size-4" />
            {messages.detail.backToGallery}
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-3">
            {item.media.length > 0 ? (
              item.media.map((mediaItem, index) => (
                <img
                  key={`${mediaItem.url}-${index}`}
                  src={mediaItem.url}
                  alt={getPromptVisualAltText(item, index, promptLocale)}
                  className="bg-muted w-full rounded-lg border object-cover shadow-sm"
                />
              ))
            ) : (
              <div className="bg-muted text-muted-foreground flex aspect-[4/3] items-center justify-center rounded-lg border">
                {messages.detail.noPreviewImage}
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="bg-card rounded-lg border p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge>
                  {getLocalizedPromptCategory(category, promptLocale)}
                </Badge>
                {item.featured && (
                  <Badge variant="secondary">{messages.badges.featured}</Badge>
                )}
                {item.language && (
                  <Badge variant="outline">
                    {getLocalizedPromptLanguageLabel(
                      item.language,
                      promptLocale
                    )}
                  </Badge>
                )}
              </div>

              <h1 className="font-display text-3xl leading-tight font-semibold tracking-normal md:text-5xl">
                {item.title}
              </h1>
              <p className="text-muted-foreground mt-4 text-base leading-7">
                {item.description}
              </p>
              <p className="bg-muted/45 text-muted-foreground mt-4 rounded-md border p-4 text-sm leading-6">
                {getLocalizedPromptUseCaseSentence(item, promptLocale)}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <a href={getImageGeneratorUrl(item.prompt, promptLocale)}>
                    <ImageIcon className="size-4" />
                    {messages.buttons.useInGenerator}
                  </a>
                </Button>
                <CopyPromptButton prompt={item.prompt} locale={promptLocale} />
                <SharePromptButton locale={promptLocale} />
              </div>

              {item.authorName && (
                <p className="text-muted-foreground mt-5 text-sm">
                  {messages.detail.sourceCreator}{' '}
                  <a
                    className="font-medium underline underline-offset-4"
                    href={item.authorUrl || item.sourceUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                  >
                    @{item.authorName.replace(/^@/, '')}
                  </a>
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="bg-card rounded-lg border p-4">
                <p className="text-muted-foreground text-xs font-medium">
                  {messages.detail.settingLabels.aspectRatio}
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {settings.aspectRatio}
                </p>
              </div>
              <div className="bg-card rounded-lg border p-4">
                <p className="text-muted-foreground text-xs font-medium">
                  {messages.detail.settingLabels.quality}
                </p>
                <p className="mt-2 text-sm font-semibold">{settings.quality}</p>
              </div>
              <div className="bg-card rounded-lg border p-4">
                <p className="text-muted-foreground text-xs font-medium">
                  {messages.detail.settingLabels.workflow}
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {settings.workflow}
                </p>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="bg-card rounded-lg border p-5 shadow-sm lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">
                {messages.detail.fullPromptHeading}
              </h2>
              <CopyPromptButton prompt={item.prompt} locale={promptLocale} />
            </div>
            <div className="space-y-4">
              {promptVariants.map((variant, index) => {
                const label = getPromptVariantLabel(variant, promptLocale);

                return (
                  <div
                    key={`${variant.type || 'prompt'}-${index}`}
                    className="bg-background rounded-md border"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                      <p className="text-sm font-medium">
                        {label ||
                          (promptVariants.length > 1
                            ? `${messages.detail.fullPromptHeading} ${index + 1}`
                            : messages.detail.fullPromptHeading)}
                      </p>
                      <CopyPromptButton
                        prompt={variant.text}
                        locale={promptLocale}
                      />
                    </div>
                    <pre className="overflow-x-auto p-4 font-mono text-sm leading-7 whitespace-pre-wrap">
                      {variant.text}
                    </pre>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-card rounded-lg border p-5 shadow-sm">
              <h2 className="text-xl font-semibold">
                {messages.detail.customizationHeading}
              </h2>
              <ul className="text-muted-foreground mt-4 space-y-3 text-sm leading-6">
                {tips.map((tip) => (
                  <li key={tip} className="bg-background rounded-md border p-3">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {item.sourceUrl && (
              <Button asChild variant="outline" className="w-full">
                <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                  {messages.buttons.originalSource}
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            )}
          </aside>
        </section>

        {relatedItems.length > 0 && (
          <section className="bg-card mt-8 rounded-lg border p-5 shadow-sm">
            <h2 className="text-2xl font-semibold">
              {messages.detail.relatedHeading}
            </h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {relatedItems.map((relatedItem) => (
                <Link
                  key={relatedItem.id}
                  href={`/prompts/gpt-image-2/${relatedItem.slug}`}
                  className="bg-background hover:bg-muted/60 rounded-lg border p-4 transition"
                >
                  <div className="mb-2 flex flex-wrap gap-2">
                    {relatedItem.categories
                      .slice(0, 1)
                      .map((relatedCategory) => (
                        <Badge key={relatedCategory} variant="secondary">
                          {getLocalizedPromptCategory(
                            relatedCategory,
                            promptLocale
                          )}
                        </Badge>
                      ))}
                  </div>
                  <h3 className="line-clamp-2 font-semibold">
                    {relatedItem.title}
                  </h3>
                  <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-6">
                    {relatedItem.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
