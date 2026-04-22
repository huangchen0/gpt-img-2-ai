'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Copy, ImageIcon, Search, Shuffle, Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
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

async function fetchPromptItem(dataset: PromptLibraryListDataset, slug: string) {
  const response = await fetch(getPromptItemUrl(dataset, slug));
  if (!response.ok) throw new Error('Failed to load prompt.');

  return (await response.json()) as PromptLibraryItem;
}

function normalizeDataset(dataset: PromptLibraryListDataset) {
  return {
    ...dataset,
    items: dataset.items.map((item) => ({
      ...item,
      categories: item.categories?.length ? item.categories : getPromptCategories(item),
    })),
  } satisfies PromptLibraryListDataset;
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
    <article className="group overflow-hidden rounded-lg border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {media && (
        <Link
          href={`/prompts/gpt-image-2/${item.slug}`}
          className="block bg-muted"
          aria-label={`Open ${item.title}`}
        >
          <img
            src={media.thumbnail || media.url}
            alt={`${item.title} GPT Image 2 prompt example`}
            className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
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
          <Link href={`/prompts/gpt-image-2/${item.slug}`} className="hover:underline">
            <h2 className="line-clamp-2 text-lg leading-tight font-semibold">
              {item.title}
            </h2>
          </Link>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {item.description}
          </p>
        </div>

        <p className="line-clamp-2 rounded-md border bg-muted/45 p-3 text-xs leading-relaxed text-muted-foreground">
          {getPromptUseCaseSentence(item)}
        </p>

        <pre className="line-clamp-4 overflow-hidden rounded-md border bg-background p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
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
  initialTotal,
}: {
  datasetUrl: string;
  initialTotal: number;
}) {
  const [dataset, setDataset] = useState<PromptLibraryListDataset | null>(null);
  const [loadError, setLoadError] = useState(false);
  const categories = useMemo(() => {
    if (!dataset) return ['All'];
    const values = new Set<string>();
    dataset.items.forEach((item) => item.categories.forEach((category) => values.add(category)));

    return ['All', ...Array.from(values).sort()];
  }, [dataset]);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const datasetBaseUrl = useMemo(() => {
    try {
      const url = new URL(datasetUrl, window.location.origin);
      return url.href.replace(/\/gpt-image-2\/index\.json$/, '');
    } catch {
      return datasetUrl.replace(/\/gpt-image-2\/index\.json$/, '');
    }
  }, [datasetUrl]);

  useEffect(() => {
    let mounted = true;

    fetch(datasetUrl)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load prompt index.');
        return response.json() as Promise<PromptLibraryListDataset>;
      })
      .then((nextDataset) => {
        if (mounted) {
          setDataset({
            ...normalizeDataset(nextDataset),
            assetBaseUrl: nextDataset.assetBaseUrl || datasetBaseUrl,
          });
        }
      })
      .catch(() => {
        if (mounted) setLoadError(true);
      });

    return () => {
      mounted = false;
    };
  }, [datasetBaseUrl, datasetUrl]);

  const filteredItems = useMemo(() => {
    if (!dataset) return [];
    const normalizedQuery = query.trim().toLowerCase();

    return dataset.items.filter((item) => {
      if (activeCategory !== 'All' && !item.categories.includes(activeCategory)) {
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
    const fullItem = await fetchPromptItem(dataset, randomPrompt.slug);
    window.location.href = getImageGeneratorUrl(fullItem.prompt);
  }

  return (
    <main className="bg-background text-foreground">
      <section className="border-b bg-muted/35">
        <div className="container grid gap-10 py-14 md:grid-cols-3 md:items-end md:py-20">
          <div className="max-w-3xl md:col-span-2">
            <Badge variant="outline" className="mb-5 bg-background">
              <Sparkles className="size-3" />
              GPT Image 2 prompt gallery
            </Badge>
            <h1 className="font-display text-4xl leading-tight font-semibold tracking-normal md:text-6xl">
              Copyable GPT Image 2 prompts for real image workflows
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Explore {initialTotal} practical prompts for
              product visuals, posters, UI mockups, characters, infographics, and
              social images. Each detail page adds usage notes and GPT Image 2 rewrite
              guidance so this is more than a mirrored prompt dump.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/models/gpt-image-2#generator">
                  Open generator
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={useRandomPrompt}>
                <Shuffle className="size-4" />
                Try random prompt
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">Library snapshot</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md border bg-background p-4">
                <p className="text-3xl font-semibold">{initialTotal}</p>
                <p className="mt-1 text-xs text-muted-foreground">Prompts</p>
              </div>
              <div className="rounded-md border bg-background p-4">
                <p className="text-3xl font-semibold">{categories.length - 1}</p>
                <p className="mt-1 text-xs text-muted-foreground">Use cases</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Built for GPT Image 2 specifically: search by intent, inspect examples,
              then send the full prompt into the generator.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b bg-background">
        <div className="container py-6">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <label className="relative block">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search prompts, categories, styles, authors..."
                className="h-11 pl-10"
              />
            </label>
            <p className="text-sm text-muted-foreground">
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
          <div className="rounded-lg border bg-card p-10 text-center shadow-sm">
            <p className="text-lg font-semibold">Loading prompt gallery</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Preparing the searchable GPT Image 2 prompt index.
            </p>
          </div>
        ) : visibleItems.length > 0 && dataset ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => (
              <PromptCard key={item.id} dataset={dataset} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-10 text-center shadow-sm">
            <p className="text-lg font-semibold">No prompts found</p>
            <p className="mt-2 text-sm text-muted-foreground">
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
              onClick={() => setVisibleCount((count) => count + visibleCountStep)}
            >
              Load more prompts
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
