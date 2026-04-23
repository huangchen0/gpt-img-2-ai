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
import {
  getPromptCategories,
  getPromptUseCaseSentence,
} from '@/shared/prompt-library/insights';
import type {
  PromptLibraryItem,
  PromptLibraryListDataset,
  PromptLibraryListItem,
} from '@/shared/prompt-library/types';

const initialVisibleCount = 24;
const visibleCountStep = 24;
const loadingCardIndexes = Array.from({ length: 6 }, (_, index) => index);

function getImageGeneratorUrl(prompt: string) {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) return '/models/gpt-image-2#generator';

  return `/models/gpt-image-2?prompt=${encodeURIComponent(trimmedPrompt)}#generator`;
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

function getBestMediaUrl(media: PromptLibraryListItem['media'][number]) {
  return media.r2Thumbnail || media.thumbnail || media.r2Url || media.url || '';
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

function PromptGalleryLoading() {
  return (
    <div role="status" aria-label="Loading prompt gallery">
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
      <span className="sr-only">Loading prompt gallery</span>
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
}: {
  dataset: PromptLibraryListDataset;
  item: PromptLibraryListItem;
}) {
  const media = item.media[0];
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
      window.location.href = getImageGeneratorUrl(fullItem.prompt);
    } catch {
      setFailed(true);
      window.setTimeout(() => setFailed(false), 1800);
    }
  }

  return (
    <article className="bg-card overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md">
      {media && (
        <Link
          href={`/prompts/gpt-image-2/${item.slug}`}
          className="bg-muted block"
          aria-label={`Open ${item.title}`}
        >
          <div className="bg-muted aspect-square overflow-hidden">
            <img
              src={getBestMediaUrl(media)}
              alt={`${item.title} GPT Image 2 prompt example`}
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
              {category}
            </Badge>
          ))}
          {item.featured && <Badge variant="outline">Featured</Badge>}
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
          {getPromptUseCaseSentence(item)}
        </p>

        <pre className="bg-background text-muted-foreground line-clamp-4 overflow-hidden rounded-md border p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {item.promptPreview}
        </pre>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={copyPrompt}>
            <Copy className="size-4" />
            {failed ? 'Failed' : copied ? 'Copied' : 'Copy'}
          </Button>
          <Button type="button" onClick={usePrompt}>
            <ImageIcon className="size-4" />
            Use
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
}: {
  datasetUrl: string;
  fallbackDatasetUrl?: string;
  initialTotal: number;
}) {
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
        item.categories.join(' '),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [activeCategory, dataset, query]);

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
      window.location.href = getImageGeneratorUrl(fullItem.prompt);
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
              GPT Image 2 prompt gallery
            </Badge>
            <h1 className="font-display text-4xl leading-tight font-semibold tracking-normal md:text-6xl">
              Copyable GPT Image 2 prompts for real image workflows
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-7 md:text-lg">
              Explore {initialTotal} practical prompts for product visuals,
              posters, UI mockups, characters, infographics, and social images.
              Each detail page adds usage notes and GPT Image 2 rewrite guidance
              so this is more than a mirrored prompt dump.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/models/gpt-image-2#generator">
                  Open generator
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
                  ? 'Failed'
                  : randomLoading
                    ? 'Loading'
                    : 'Try random prompt'}
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-5 shadow-sm">
            <p className="text-muted-foreground text-sm font-medium">
              Library snapshot
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-background rounded-md border p-4">
                <p className="text-3xl font-semibold">{initialTotal}</p>
                <p className="text-muted-foreground mt-1 text-xs">Prompts</p>
              </div>
              <div className="bg-background rounded-md border p-4">
                <p className="text-3xl font-semibold">
                  {categories.length - 1}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">Use cases</p>
              </div>
            </div>
            <p className="text-muted-foreground mt-4 text-sm leading-6">
              Built for GPT Image 2 specifically: search by intent, inspect
              examples, then send the full prompt into the generator.
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
                placeholder="Search prompts, categories, styles, authors..."
                className="h-11 pl-10"
              />
            </label>
            <p className="text-muted-foreground text-sm">
              {dataset ? `${filteredItems.length} shown` : 'Loading prompts'}
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
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-8 md:py-12">
        {!dataset && !loadError ? (
          <PromptGalleryLoading />
        ) : visibleItems.length > 0 && dataset ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => (
              <PromptCard key={item.id} dataset={dataset} item={item} />
            ))}
          </div>
        ) : loadError ? (
          <div className="bg-card rounded-lg border p-10 text-center shadow-sm">
            <p className="text-lg font-semibold">
              Prompt library is temporarily unavailable
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              Please refresh the page in a moment.
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border p-10 text-center shadow-sm">
            <p className="text-lg font-semibold">No prompts found</p>
            <p className="text-muted-foreground mt-2 text-sm">
              Try a broader use case or clear the search box.
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
              Load more prompts
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
