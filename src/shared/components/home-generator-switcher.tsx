'use client';

import dynamic from 'next/dynamic';
import { startTransition, useEffect, useRef, useState } from 'react';
import { Clapperboard, ImageIcon, Sparkles, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import type { Seedance2Mode } from '@/shared/lib/seedance-video';
import { cn } from '@/shared/lib/utils';

type GeneratorType = 'video' | 'image';
type VideoModel = 'seedance' | 'kling';
type GeneratorSkeletonVariant = 'image' | 'seedance' | 'kling';
type IdleCallbackHandle = number;

type GeneratorSwitcherCopy = {
  title?: string;
  subtitle?: string;
  video: string;
  image: string;
  seedance: string;
  kling: string;
  seedanceDescription: string;
  klingDescription: string;
  srOnlyVideo: string;
  srOnlyImage: string;
  srOnlyKling: string;
};

interface GeneratorSwitcherProps {
  copy: GeneratorSwitcherCopy;
  sectionId?: string;
  showIntro?: boolean;
  sectionClassName?: string;
  seedanceGeneratorId: string;
  klingGeneratorId: string;
  pricingSectionId?: string;
  showImageGenerator?: boolean;
  showVideoModelSwitcher?: boolean;
  showVideoModelSummary?: boolean;
  defaultGeneratorType?: GeneratorType;
  defaultVideoModel?: VideoModel;
  fixedVideoModel?: VideoModel;
  defaultSeedanceMode?: Seedance2Mode;
}

let seedanceVideoGeneratorPromise: Promise<
  typeof import('@/shared/blocks/generator/video')
> | null = null;
let klingVideoGeneratorPromise: Promise<
  typeof import('@/shared/blocks/generator/kling-video')
> | null = null;

function HomeGeneratorPlaceholder({
  className,
}: {
  className: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-md bg-accent/70', className)}
    />
  );
}

function preloadSeedanceVideoGenerator() {
  if (!seedanceVideoGeneratorPromise) {
    seedanceVideoGeneratorPromise = import('@/shared/blocks/generator/video');
  }

  return seedanceVideoGeneratorPromise;
}

function preloadKlingVideoGenerator() {
  if (!klingVideoGeneratorPromise) {
    klingVideoGeneratorPromise = import('@/shared/blocks/generator/kling-video');
  }

  return klingVideoGeneratorPromise;
}

function preloadVideoGeneratorForModel(model: VideoModel) {
  return model === 'seedance'
    ? preloadSeedanceVideoGenerator()
    : preloadKlingVideoGenerator();
}

function scheduleIdleTask(task: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const currentWindow = window as Window & {
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout: number }
    ) => IdleCallbackHandle;
    cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
  };

  if (typeof currentWindow.requestIdleCallback === 'function') {
    const handle = currentWindow.requestIdleCallback(() => {
      task();
    }, { timeout: 1500 });

    return () => {
      if (typeof currentWindow.cancelIdleCallback === 'function') {
        currentWindow.cancelIdleCallback(handle);
      }
    };
  }

  const handle = window.setTimeout(task, 300);
  return () => window.clearTimeout(handle);
}

function HomeGeneratorSkeleton({
  variant,
}: {
  variant: GeneratorSkeletonVariant;
}) {
  const isKling = variant === 'kling';

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div
          className={cn(
            'grid gap-8',
            isKling
              ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'
              : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'
          )}
        >
          <div className="space-y-6">
            <div className="rounded-3xl border border-stone-200 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
              <div className="space-y-4">
                <HomeGeneratorPlaceholder className="h-7 w-48" />
                <HomeGeneratorPlaceholder className="h-4 w-full max-w-xl" />
                <HomeGeneratorPlaceholder className="h-4 w-3/4 max-w-lg" />
              </div>

              <div className="mt-6 flex gap-3">
                <HomeGeneratorPlaceholder className="h-10 w-28 rounded-xl" />
                <HomeGeneratorPlaceholder className="h-10 w-28 rounded-xl" />
                {variant === 'seedance' ? (
                  <HomeGeneratorPlaceholder className="hidden h-10 w-32 rounded-xl md:block" />
                ) : null}
              </div>

              <div className="mt-8 space-y-4">
                <HomeGeneratorPlaceholder className="h-32 w-full rounded-2xl" />
                <HomeGeneratorPlaceholder className="h-28 w-full rounded-2xl" />
                {isKling ? (
                  <>
                    <HomeGeneratorPlaceholder className="h-24 w-full rounded-2xl" />
                    <HomeGeneratorPlaceholder className="h-40 w-full rounded-2xl" />
                  </>
                ) : (
                  <HomeGeneratorPlaceholder className="h-20 w-full rounded-2xl" />
                )}
              </div>

              <div className="mt-8 flex flex-col gap-3 border-t border-stone-200 pt-5 dark:border-white/10 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <HomeGeneratorPlaceholder className="h-4 w-36" />
                  <HomeGeneratorPlaceholder className="h-4 w-28" />
                </div>
                <div className="flex gap-3">
                  <HomeGeneratorPlaceholder className="h-11 w-28 rounded-xl" />
                  <HomeGeneratorPlaceholder className="h-11 w-40 rounded-xl" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-stone-200 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
              <div className="space-y-4">
                <HomeGeneratorPlaceholder className="h-7 w-40" />
                <HomeGeneratorPlaceholder className="h-4 w-full max-w-sm" />
              </div>

              <div className="mt-6 space-y-4">
                <HomeGeneratorPlaceholder className="aspect-video w-full rounded-2xl" />
                <div className="flex gap-2">
                  <HomeGeneratorPlaceholder className="h-6 w-20 rounded-full" />
                  <HomeGeneratorPlaceholder className="h-6 w-24 rounded-full" />
                  {isKling ? (
                    <HomeGeneratorPlaceholder className="h-6 w-28 rounded-full" />
                  ) : null}
                </div>
                <HomeGeneratorPlaceholder className="h-4 w-full" />
                <HomeGeneratorPlaceholder className="h-4 w-5/6" />
              </div>
            </div>

            <div className="rounded-3xl border border-dashed border-stone-200 bg-white/60 p-6 dark:border-white/10 dark:bg-slate-950/50">
              <div className="space-y-3">
                <HomeGeneratorPlaceholder className="h-5 w-44" />
                <HomeGeneratorPlaceholder className="h-4 w-full" />
                <HomeGeneratorPlaceholder className="h-4 w-4/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const SeedanceVideoGenerator = dynamic(
  () => preloadSeedanceVideoGenerator().then((mod) => mod.VideoGenerator),
  {
    loading: () => <HomeGeneratorSkeleton variant="seedance" />,
  }
);

const HomeImageGenerator = dynamic(
  () =>
    import('@/shared/components/image-generator-switcher').then((mod) => ({
      default: mod.ImageGeneratorSwitcher,
    })),
  {
    loading: () => <HomeGeneratorSkeleton variant="image" />,
  }
);

const HomeKlingVideoGenerator = dynamic(
  () =>
    preloadKlingVideoGenerator().then((mod) => ({
      default: mod.KlingVideoGenerator,
    })),
  {
    loading: () => <HomeGeneratorSkeleton variant="kling" />,
  }
);

function GeneratorSwitcher({
  copy,
  sectionId,
  showIntro = true,
  sectionClassName = 'pt-10 md:pt-14',
  seedanceGeneratorId,
  klingGeneratorId,
  pricingSectionId = 'pricing',
  showImageGenerator = true,
  showVideoModelSwitcher = true,
  showVideoModelSummary = true,
  defaultGeneratorType = 'video',
  defaultVideoModel = 'kling',
  fixedVideoModel,
  defaultSeedanceMode,
}: GeneratorSwitcherProps) {
  const searchParams = useSearchParams();
  const [activeType, setActiveType] =
    useState<GeneratorType>(defaultGeneratorType);
  const [activeVideoModel, setActiveVideoModel] =
    useState<VideoModel>(defaultVideoModel);
  const useFloatingIntro = showIntro && !showImageGenerator;
  const resolvedVideoModel = fixedVideoModel ?? activeVideoModel;

  useEffect(() => {
    if (fixedVideoModel) {
      setActiveType('video');
      setActiveVideoModel(fixedVideoModel);
      return;
    }

    const typeParam = searchParams?.get('type');
    const modelParam = searchParams?.get('model');

    if (typeParam === 'image' && showImageGenerator) {
      setActiveType('image');
    } else if (typeParam === 'video' || modelParam === 'seedance' || modelParam === 'kling') {
      setActiveType('video');
    } else if (!showImageGenerator) {
      setActiveType('video');
    } else {
      setActiveType(defaultGeneratorType);
    }

    if (modelParam === 'seedance' || modelParam === 'kling') {
      setActiveVideoModel(modelParam);
    }
  }, [
    defaultGeneratorType,
    defaultVideoModel,
    fixedVideoModel,
    searchParams,
    showImageGenerator,
  ]);

  const activeVideoDescription =
    resolvedVideoModel === 'seedance'
      ? copy.seedanceDescription
      : copy.klingDescription;
  const shouldRenderSwitcherHeader =
    showIntro || showImageGenerator || (activeType === 'video' && showVideoModelSummary);

  return (
    <>
      {shouldRenderSwitcherHeader ? (
        <section
          id={sectionId}
          className={cn(
            sectionClassName,
            useFloatingIntro && 'relative z-20 -mt-10 pb-6 md:-mt-16 md:pb-10'
          )}
        >
          <div className="container">
            <div
              className={cn(
                'mx-auto max-w-6xl',
                useFloatingIntro && 'max-w-4xl'
              )}
            >
              <div
                className={cn(
                  useFloatingIntro &&
                    'rounded-[2rem] border border-border/60 bg-background/88 px-5 py-6 shadow-[0_30px_100px_-45px_rgba(15,23,42,0.45)] backdrop-blur-xl md:px-8 md:py-8'
                )}
              >
                {showIntro ? (
                  <div className="mb-4 text-center">
                    {copy.title ? (
                      <h2
                        className={cn(
                          'font-display font-semibold',
                          useFloatingIntro ? 'text-3xl tracking-[-0.03em] md:text-4xl' : 'text-xl md:text-2xl'
                        )}
                      >
                        {copy.title}
                      </h2>
                    ) : null}
                    {copy.subtitle ? (
                      <p
                        className={cn(
                          'text-muted-foreground mt-2',
                          useFloatingIntro
                            ? 'mx-auto max-w-2xl text-sm leading-7 md:text-base'
                            : 'text-sm md:text-base'
                        )}
                      >
                        {copy.subtitle}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {showImageGenerator ? (
                  <div className="mb-6 flex justify-center">
                    <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted p-1">
                      <button
                        type="button"
                        onClick={() => setActiveType('video')}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                          activeType === 'video'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Video className="h-4 w-4" />
                        {copy.video}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveType('image')}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                          activeType === 'image'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <ImageIcon className="h-4 w-4" />
                        {copy.image}
                      </button>
                    </div>
                  </div>
                ) : null}

                {activeType === 'video' && showVideoModelSummary ? (
                  <div className="mb-1 flex flex-col items-center gap-3">
                    {showVideoModelSwitcher ? (
                      <div
                        className={cn(
                          'inline-flex items-center gap-1 rounded-xl border p-1 shadow-sm',
                          useFloatingIntro
                            ? 'border-border/80 bg-muted/40'
                            : 'border-border bg-background'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveVideoModel('seedance')}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                            activeVideoModel === 'seedance'
                              ? useFloatingIntro
                                ? 'bg-background text-foreground shadow-sm'
                                : 'bg-muted text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Sparkles className="h-4 w-4" />
                          {copy.seedance}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveVideoModel('kling')}
                          className={cn(
                            'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                            activeVideoModel === 'kling'
                              ? useFloatingIntro
                                ? 'bg-background text-foreground shadow-sm'
                                : 'bg-muted text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Clapperboard className="h-4 w-4" />
                          {copy.kling}
                        </button>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm',
                          useFloatingIntro
                            ? 'border-border/80 bg-background'
                            : 'border-border bg-muted'
                        )}
                      >
                        <Sparkles className="h-4 w-4" />
                        {copy.seedance}
                      </div>
                    )}
                    <p
                      className={cn(
                        'text-muted-foreground max-w-2xl text-center text-sm md:text-base',
                        useFloatingIntro && 'leading-7'
                      )}
                    >
                      {activeVideoDescription}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeType === 'video' ? (
        resolvedVideoModel === 'seedance' ? (
          <SeedanceVideoGenerator
            id={seedanceGeneratorId}
            srOnlyTitle={copy.srOnlyVideo}
            redirectToPricingOnInsufficientCredits={true}
            pricingSectionId={pricingSectionId}
            defaultSeedanceMode={defaultSeedanceMode}
          />
        ) : (
          <HomeKlingVideoGenerator
            id={klingGeneratorId}
            srOnlyTitle={copy.srOnlyKling}
            redirectToPricingOnInsufficientCredits={true}
            pricingSectionId={pricingSectionId}
          />
        )
      ) : (
        <HomeImageGenerator
          id="home-image-generator"
          srOnlyTitle={copy.srOnlyImage}
          className="pt-0"
        />
      )}
    </>
  );
}

function LazyHomeGeneratorSwitcher({
  copy,
  sectionId = 'generator',
  defaultGeneratorType = 'video',
  defaultVideoModel = 'kling',
  idlePreload = false,
  observerRootMargin = '150px 0px',
}: {
  copy: GeneratorSwitcherCopy;
  sectionId?: string;
  defaultGeneratorType?: GeneratorType;
  defaultVideoModel?: VideoModel;
  idlePreload?: boolean;
  observerRootMargin?: string;
}) {
  const generatorRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoadGenerator, setShouldLoadGenerator] = useState(false);

  useEffect(() => {
    if (!idlePreload || shouldLoadGenerator) {
      return;
    }

    return scheduleIdleTask(() => {
      void preloadVideoGeneratorForModel(defaultVideoModel);
    });
  }, [defaultVideoModel, idlePreload, shouldLoadGenerator]);

  useEffect(() => {
    if (shouldLoadGenerator) {
      return;
    }

    if (typeof window !== 'undefined' && window.location.hash === '#generator') {
      startTransition(() => {
        setShouldLoadGenerator(true);
      });
      return;
    }

    const node = generatorRef.current;
    if (!node) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoadGenerator(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        startTransition(() => {
          setShouldLoadGenerator(true);
        });
        observer.disconnect();
      },
      {
        rootMargin: observerRootMargin,
        threshold: 0.01,
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [observerRootMargin, shouldLoadGenerator]);

  return (
    <div id={sectionId} ref={generatorRef}>
      {shouldLoadGenerator ? (
        <GeneratorSwitcher
          copy={copy}
          showIntro={false}
          seedanceGeneratorId="home-seedance-generator"
          klingGeneratorId="home-kling-generator"
          pricingSectionId="pricing"
          showImageGenerator={true}
          showVideoModelSwitcher={false}
          showVideoModelSummary={false}
          defaultGeneratorType={defaultGeneratorType}
          defaultSeedanceMode="text"
          defaultVideoModel={defaultVideoModel}
        />
      ) : (
        <HomeGeneratorSkeleton
          variant={defaultGeneratorType === 'image' ? 'image' : 'seedance'}
        />
      )}
    </div>
  );
}

export function HomeGeneratorSwitcher() {
  const t = useTranslations('landing.generator_switcher');

  return (
    <LazyHomeGeneratorSwitcher
      copy={{
        title: t('title'),
        subtitle: t('subtitle'),
        video: t('video'),
        image: t('image'),
        seedance: t('seedance'),
        kling: t('kling'),
        seedanceDescription: t('seedance_description'),
        klingDescription: t('kling_description'),
        srOnlyVideo: t('sr_only_video'),
        srOnlyImage: t('sr_only_image'),
        srOnlyKling: t('sr_only_kling'),
      }}
      sectionId="generator"
      defaultGeneratorType="image"
      defaultVideoModel="seedance"
      idlePreload={false}
      observerRootMargin="120px 0px"
    />
  );
}

export function CreateGeneratorSwitcher() {
  const t = useTranslations('pages.create.generator_switcher');

  return (
    <GeneratorSwitcher
      copy={{
        video: t('video'),
        image: t('image'),
        seedance: t('seedance'),
        kling: t('kling'),
        seedanceDescription: t('seedance_description'),
        klingDescription: t('kling_description'),
        srOnlyVideo: t('sr_only_video'),
        srOnlyImage: t('sr_only_image'),
        srOnlyKling: t('sr_only_kling'),
      }}
      sectionId="generator"
      showIntro={false}
      sectionClassName="pt-4 md:pt-6"
      seedanceGeneratorId="create-seedance-generator"
      klingGeneratorId="create-kling-generator"
      defaultGeneratorType="image"
      defaultSeedanceMode="text"
    />
  );
}
