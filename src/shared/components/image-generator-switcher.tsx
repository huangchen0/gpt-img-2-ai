'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { Banana, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

type ImageGeneratorModel = 'gpt-image-2' | 'nano-banana';

interface ImageGeneratorSwitcherProps {
  id?: string;
  srOnlyTitle?: string;
  className?: string;
  defaultModel?: ImageGeneratorModel;
}

const GptImage2Generator = dynamic(
  () =>
    import('@/shared/blocks/generator/gpt-image-2').then((mod) => ({
      default: mod.GptImage2Generator,
    })),
  {
    ssr: false,
    loading: () => <ImageGeneratorSkeleton />,
  }
);

const NanoBananaGenerator = dynamic(
  () =>
    import('@/shared/blocks/generator/image').then((mod) => ({
      default: mod.ImageGenerator,
    })),
  {
    ssr: false,
    loading: () => <ImageGeneratorSkeleton />,
  }
);

function ImageGeneratorSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(500px,560px)_minmax(0,1fr)]">
      <div className="bg-muted/70 h-[640px] rounded-md" />
      <div className="bg-muted/50 h-[640px] rounded-md" />
    </div>
  );
}

function normalizeImageGeneratorModel(value?: string | null) {
  return value === 'nano-banana' ? 'nano-banana' : 'gpt-image-2';
}

export function ImageGeneratorSwitcher({
  id = 'generator',
  srOnlyTitle,
  className,
  defaultModel = 'gpt-image-2',
}: ImageGeneratorSwitcherProps) {
  const t = useTranslations('ai.image.generator');
  const searchParams = useSearchParams();
  const [activeModel, setActiveModel] = useState<ImageGeneratorModel>(
    defaultModel
  );

  useEffect(() => {
    setActiveModel(
      normalizeImageGeneratorModel(
        searchParams?.get('image_model') || searchParams?.get('imageModel')
      ) || defaultModel
    );
  }, [defaultModel, searchParams]);

  const copy = useMemo(
    () => ({
      title: t.has('image_model_switcher.title')
        ? t('image_model_switcher.title')
        : 'Choose Image Model',
      gptImage2: t.has('image_model_switcher.gpt_image_2')
        ? t('image_model_switcher.gpt_image_2')
        : 'GPT Image 2',
      nanoBanana: t.has('image_model_switcher.nano_banana')
        ? t('image_model_switcher.nano_banana')
        : 'Nano Banana',
      gptImage2Description: t.has(
        'image_model_switcher.gpt_image_2_description'
      )
        ? t('image_model_switcher.gpt_image_2_description')
        : 'Best for clean prompt-to-image and reference-guided creation.',
      nanoBananaDescription: t.has(
        'image_model_switcher.nano_banana_description'
      )
        ? t('image_model_switcher.nano_banana_description')
        : 'Best for advanced options such as resolution, format, and Google Search.',
    }),
    [t]
  );

  const switchModel = (model: ImageGeneratorModel) => {
    setActiveModel(model);

    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('image_model', model);
    window.history.replaceState(null, '', url.toString());
  };

  return (
    <section id={id} className={cn('font-display py-12 md:py-16', className)}>
      <div className="container">
        <div className="mx-auto max-w-7xl">
          {srOnlyTitle && <h2 className="sr-only">{srOnlyTitle}</h2>}
          <div className="mb-8 rounded-md border bg-card px-5 py-5 shadow-sm md:px-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-muted-foreground text-sm font-medium">
                  {copy.title}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-normal md:text-4xl">
                  {activeModel === 'gpt-image-2'
                    ? copy.gptImage2
                    : copy.nanoBanana}
                </h2>
                <p className="text-muted-foreground mt-2 text-base">
                  {activeModel === 'gpt-image-2'
                    ? copy.gptImage2Description
                  : copy.nanoBananaDescription}
                </p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-[520px]">
                <button
                  type="button"
                  aria-pressed={activeModel === 'gpt-image-2'}
                  onClick={() => switchModel('gpt-image-2')}
                  className={cn(
                    'flex items-start gap-3 rounded-md border p-4 text-left transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
                    activeModel === 'gpt-image-2'
                      ? 'border-primary/50 bg-primary/10 text-foreground shadow-sm'
                      : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  )}
                >
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <span className="block text-sm font-semibold">
                      {copy.gptImage2}
                    </span>
                    <span className="mt-1 block text-xs leading-5 opacity-80">
                      {copy.gptImage2Description}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={activeModel === 'nano-banana'}
                  onClick={() => switchModel('nano-banana')}
                  className={cn(
                    'flex items-start gap-3 rounded-md border p-4 text-left transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none',
                    activeModel === 'nano-banana'
                      ? 'border-primary/50 bg-primary/10 text-foreground shadow-sm'
                      : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  )}
                >
                  <Banana className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <span className="block text-sm font-semibold">
                      {copy.nanoBanana}
                    </span>
                    <span className="mt-1 block text-xs leading-5 opacity-80">
                      {copy.nanoBananaDescription}
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>
          <div className="sr-only" aria-live="polite">
            <p>
              {activeModel === 'gpt-image-2'
                ? copy.gptImage2Description
                : copy.nanoBananaDescription}
            </p>
          </div>
        </div>
      </div>

      {activeModel === 'gpt-image-2' ? (
        <GptImage2Generator
          id={`${id}-gpt-image-2`}
          className="pt-0"
          embedded
          hideHeader
        />
      ) : (
        <NanoBananaGenerator
          id={`${id}-nano-banana`}
          className="pt-0"
          embedded
        />
      )}
    </section>
  );
}
