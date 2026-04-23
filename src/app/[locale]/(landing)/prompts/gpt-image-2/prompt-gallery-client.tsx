'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Copy,
  ImageIcon,
  Search,
  Shuffle,
  Sparkles,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { getPromptCategories } from '@/shared/prompt-library/insights';
import {
  getLocalizedPromptCategory,
  getLocalizedPromptUseCaseSentence,
  getPromptCategorySearchText,
  getPromptLibraryLocale,
  getPromptLibraryMessages,
} from '@/shared/prompt-library/localization';
import type {
  PromptLibraryItem,
  PromptLibraryListDataset,
  PromptLibraryListItem,
} from '@/shared/prompt-library/types';

const initialVisibleCount = 24;
const visibleCountStep = 24;
const loadingCardIndexes = Array.from({ length: 6 }, (_, index) => index);

function getImageGeneratorUrl(prompt: string, locale?: string) {
  const trimmedPrompt = prompt.trim();
  const path = trimmedPrompt
    ? `/models/gpt-image-2?prompt=${encodeURIComponent(trimmedPrompt)}#generator`
    : '/models/gpt-image-2#generator';

  return getPromptLibraryLocale(locale) === 'zh' ? `/zh${path}` : path;
}

function getPromptItemUrl(dataset: PromptLibraryListDataset, slug: string) {
  const baseUrl = dataset.assetBaseUrl?.replace(/\/+$/, '');
  const path = `gpt-image-2/items/${slug}.json`;

  return baseUrl ? `${baseUrl}/${path}` : `/prompt-library/${path}`;
}

function getDatasetBaseUrl(datasetUrl: string) {
  try {
    const url = new URL(datasetUrl, window.location.origin);
    return url.href.replace(/\/gpt-image-2\/index\.json$/, '');
  } catch {
    return datasetUrl.replace(/\/gpt-image-2\/index\.json$/, '');
  }
}

async function fetchPromptDataset(datasetUrls: string[]) {
  let lastError: unknown;

  for (const datasetUrl of datasetUrls) {
    try {
      const response = await fetch(datasetUrl);
      if (!response.ok) {
        throw new Error(`Failed to load prompt index: ${response.status}`);
      }

      const dataset = (await response.json()) as PromptLibraryListDataset;
      if (!Array.isArray(dataset.items) || dataset.items.length === 0) {
        throw new Error('Prompt index is empty.');
      }

      return { dataset, sourceUrl: datasetUrl };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to load prompt index.');
}

async function fetchPromptItem(
  dataset: PromptLibraryListDataset,
  slug: string
) {
  const response = await fetch(getPromptItemUrl(dataset, slug));
  if (!response.ok) throw new Error('Failed to load prompt.');

  return (await response.json()) as PromptLibraryItem;
}

function normalizeDataset(dataset: PromptLibraryListDataset) {
  return {
    ...dataset,
    items: dataset.items.map((item) => ({
      ...item,
      categories: item.categories?.length
        ? item.categories
        : getPromptCategories(item),
    })),
  } satisfies PromptLibraryListDataset;
}

function getMediaImageAttributes(
  media: PromptLibraryListItem['media'][number]
) {
  const thumbnail = media.r2Thumbnail || media.thumbnail || '';
  const fullSize = media.r2Url || media.url || '';
  const src = fullSize || thumbnail;
  const srcSet =
    thumbnail && fullSize && thumbnail !== fullSize
      ? `${thumbnail} 300w, ${fullSize} 900w`
      : undefined;

  return {
    src,
    srcSet,
    sizes: '(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw',
  };
}

function PromptLoadingCard({ index }: { index: number }) {
  return (
    <article
      className="bg-card overflow-hidden rounded-lg border shadow-sm"
      aria-hidden="true"
    >
      <div className="bg-muted relative aspect-square overflow-hidden">
        <div className="from-muted via-background to-muted absolute inset-0 bg-gradient-to-br" />
        <div
          className="prompt-loading-sheen via-foreground/10 absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent to-transparent"
          style={{ animationDelay: `${index * 110}ms` }}
        />
        <div className="absolute inset-x-5 bottom-5 grid grid-cols-3 gap-2">
          <Skeleton className="bg-background/55 h-2.5" />
          <Skeleton className="bg-background/45 h-2.5" />
          <Skeleton className="bg-background/35 h-2.5" />
        </div>
        <Sparkles className="text-primary/50 absolute top-5 left-5 size-5 animate-pulse" />
      </div>

      <div className="space-y-4 p-4">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="bg-muted/35 space-y-2 rounded-md border p-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <div className="bg-background space-y-2 rounded-md border p-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      </div>
    </article>
  );
}

function PromptGalleryLoading({ locale }: { locale?: string }) {
  const messages = getPromptLibraryMessages(locale);

  return (
    <div role="status" aria-label={messages.aria.loadingGallery}>
      <style>{`
        @keyframes prompt-loading-sheen {
          0% {
            opacity: 0.25;
            transform: translateX(-120%);
          }
          45%,
          70% {
            opacity: 1;
          }
          100% {
            opacity: 0.25;
            transform: translateX(320%);
          }
        }

        .prompt-loading-sheen {
          animation: prompt-loading-sheen 1.9s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .prompt-loading-sheen {
            animation: none;
          }
        }
      `}</style>
      <span className="sr-only">{messages.aria.loadingGallery}</span>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {loadingCardIndexes.map((index) => (
          <PromptLoadingCard key={index} index={index} />
        ))}
      </div>
    </div>
  );
}

function PromptCard({
  dataset,
  item,
  locale,
}: {
  dataset: PromptLibraryListDataset;
  item: PromptLibraryListItem;
  locale?: string;
}) {
  const messages = getPromptLibraryMessages(locale);
  const media = item.media[0];
  const image = media ? getMediaImageAttributes(media) : undefined;
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copyPrompt() {
    try {
      const fullItem = await fetchPromptItem(dataset, item.slug);
      await navigator.clipboard.writeText(fullItem.prompt);
      setFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
      setFailed(true);
      window.setTimeout(() => setFailed(false), 1800);
    }
  }

  async function usePrompt() {
    try {
      const fullItem = await fetchPromptItem(dataset, item.slug);
      window.location.href = getImageGeneratorUrl(fullItem.prompt, locale);
    } catch {
      setFailed(true);
      window.setTimeout(() => setFailed(false), 1800);
    }
  }

  return (
    <article className="bg-card overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md">
      {image?.src && (
        <Link
          href={`/prompts/gpt-image-2/${item.slug}`}
          className="bg-muted block"
          aria-label={messages.aria.openPrompt(item.title)}
        >
          <div className="bg-muted aspect-square overflow-hidden">
            <img
              src={image.src}
              srcSet={image.srcSet}
              sizes={image.sizes}
              alt={messages.aria.promptImageAlt(item.title)}
              className="h-full w-full object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>
        </Link>
      )}

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {item.categories.slice(0, 2).map((category) => (
            <Badge key={category} variant="secondary">
              {getLocalizedPromptCategory(category, locale)}
            </Badge>
          ))}
          {item.featured && (
            <Badge variant="outline">{messages.badges.featured}</Badge>
          )}
        </div>

        <div>
          <Link
            href={`/prompts/gpt-image-2/${item.slug}`}
            className="hover:underline"
          >
            <h2 className="line-clamp-2 text-lg leading-tight font-semibold">
              {item.title}
            </h2>
          </Link>
          <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
            {item.description}
          </p>
        </div>

        <p className="bg-muted/45 text-muted-foreground line-clamp-2 rounded-md border p-3 text-xs leading-relaxed">
          {getLocalizedPromptUseCaseSentence(item, locale)}
        </p>

        <pre className="bg-background text-muted-foreground line-clamp-4 overflow-hidden rounded-md border p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {item.promptPreview}
        </pre>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={copyPrompt}>
            <Copy className="size-4" />
            {failed
              ? messages.buttons.copyFailed
              : copied
                ? messages.buttons.copied
                : messages.buttons.copy}
          </Button>
          <Button type="button" onClick={usePrompt}>
            <ImageIcon className="size-4" />
            {messages.buttons.use}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function GptImage2PromptGalleryClient({
  datasetUrl,
  fallbackDatasetUrl,
  initialTotal,
  locale,
}: {
  datasetUrl: string;
  fallbackDatasetUrl?: string;
  initialTotal: number;
  locale?: string;
}) {
  const promptLocale = getPromptLibraryLocale(locale);
  const messages = getPromptLibraryMessages(promptLocale);
  const [dataset, setDataset] = useState<PromptLibraryListDataset | null>(null);
  const [loadError, setLoadError] = useState(false);
  const datasetUrls = useMemo(
    () =>
      Array.from(
        new Set([datasetUrl, fallbackDatasetUrl].filter(Boolean) as string[])
      ),
    [datasetUrl, fallbackDatasetUrl]
  );
  const categories = useMemo(() => {
    if (!dataset) return ['All'];
    const values = new Set<string>();
    dataset.items.forEach((item) =>
      item.categories.forEach((category) => values.add(category))
    );

    return ['All', ...Array.from(values).sort()];
  }, [dataset]);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const [randomLoading, setRandomLoading] = useState(false);
  const [randomFailed, setRandomFailed] = useState(false);
  const totalCount = dataset?.total || initialTotal;

  useEffect(() => {
    let mounted = true;

    setLoadError(false);

    fetchPromptDataset(datasetUrls)
      .then(({ dataset: nextDataset, sourceUrl }) => {
        if (mounted) {
          setDataset({
            ...normalizeDataset(nextDataset),
            assetBaseUrl:
              nextDataset.assetBaseUrl || getDatasetBaseUrl(sourceUrl),
          });
        }
      })
      .catch(() => {
        if (mounted) setLoadError(true);
      });

    return () => {
      mounted = false;
    };
  }, [datasetUrls]);

  const filteredItems = useMemo(() => {
    if (!dataset) return [];
    const normalizedQuery = query.trim().toLowerCase();

    return dataset.items.filter((item) => {
      if (
        activeCategory !== 'All' &&
        !item.categories.includes(activeCategory)
      ) {
        return false;
      }

      if (!normalizedQuery) return true;

      return [
        item.title,
        item.description,
        item.promptPreview,
        item.authorName,
        item.categories
          .map((category) =>
            getPromptCategorySearchText(category, promptLocale)
          )
          .join(' '),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [activeCategory, dataset, promptLocale, query]);

  useEffect(() => {
    setVisibleCount(initialVisibleCount);
  }, [activeCategory, query]);

  const randomPrompt =
    filteredItems.length > 0
      ? filteredItems[Math.floor(Math.random() * filteredItems.length)]
      : undefined;
  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMoreItems = visibleItems.length < filteredItems.length;

  async function useRandomPrompt() {
    if (!dataset || !randomPrompt) return;

    try {
      setRandomFailed(false);
      setRandomLoading(true);
      const fullItem = await fetchPromptItem(dataset, randomPrompt.slug);
      window.location.href = getImageGeneratorUrl(
        fullItem.prompt,
        promptLocale
      );
    } catch {
      setRandomFailed(true);
      window.setTimeout(() => setRandomFailed(false), 1800);
    } finally {
      setRandomLoading(false);
    }
  }

  return (
    <main className="bg-background text-foreground">
      <section className="bg-muted/35 border-b">
        <div className="container grid gap-10 py-14 md:grid-cols-3 md:items-end md:py-20">
          <div className="max-w-3xl md:col-span-2">
            <Badge variant="outline" className="bg-background mb-5">
              <Sparkles className="size-3" />
              {messages.gallery.eyebrow}
            </Badge>
            <h1 className="font-display text-4xl leading-tight font-semibold tracking-normal md:text-6xl">
              {messages.gallery.title}
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-7 md:text-lg">
              {messages.gallery.description(totalCount)}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/models/gpt-image-2#generator">
                  {messages.buttons.openGenerator}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={useRandomPrompt}
                disabled={!dataset || !randomPrompt || randomLoading}
              >
                <Shuffle className="size-4" />
                {randomFailed
                  ? messages.buttons.failed
                  : randomLoading
                    ? messages.buttons.loading
                    : messages.buttons.tryRandomPrompt}
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-5 shadow-sm">
            <p className="text-muted-foreground text-sm font-medium">
              {messages.gallery.snapshotTitle}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-background rounded-md border p-4">
                <p className="text-3xl font-semibold">{totalCount}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {messages.gallery.promptsLabel}
                </p>
              </div>
              <div className="bg-background rounded-md border p-4">
                <p className="text-3xl font-semibold">
                  {categories.length - 1}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {messages.gallery.useCasesLabel}
                </p>
              </div>
            </div>
            <p className="text-muted-foreground mt-4 text-sm leading-6">
              {messages.gallery.snapshotDescription}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-background border-b">
        <div className="container py-6">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <label className="relative block">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={messages.gallery.searchPlaceholder}
                className="h-11 pl-10"
              />
            </label>
            <p className="text-muted-foreground text-sm">
              {dataset
                ? messages.gallery.shownCount(filteredItems.length)
                : messages.gallery.loadingPrompts}
            </p>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => (
              <Button
                key={category}
                type="button"
                variant={activeCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(category)}
                className="shrink-0"
              >
                {getLocalizedPromptCategory(category, promptLocale)}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-8 md:py-12">
        {!dataset && !loadError ? (
          <PromptGalleryLoading locale={promptLocale} />
        ) : visibleItems.length > 0 && dataset ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => (
              <PromptCard
                key={item.id}
                dataset={dataset}
                item={item}
                locale={promptLocale}
              />
            ))}
          </div>
        ) : loadError ? (
          <div className="bg-card rounded-lg border p-10 text-center shadow-sm">
            <p className="text-lg font-semibold">
              {messages.gallery.unavailableTitle}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {messages.gallery.unavailableDescription}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border p-10 text-center shadow-sm">
            <p className="text-lg font-semibold">
              {messages.gallery.emptyTitle}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {messages.gallery.emptyDescription}
            </p>
          </div>
        )}

        {hasMoreItems && (
          <div className="mt-8 flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() =>
                setVisibleCount((count) => count + visibleCountStep)
              }
            >
              {messages.buttons.loadMore}
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
