'use client';

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Wand, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { usePathname, useRouter } from '@/core/i18n/navigation';
import { defaultLocale, locales } from '@/config/locale';
import { LazyImage } from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

function LazyVideo({
  src,
  poster,
  className,
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.play().catch(() => {
            // Ignore autoplay failures.
          });
          return;
        }

        element.pause();
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.35,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      className={cn(
        'transition-transform duration-300 group-hover:scale-105',
        className
      )}
      muted
      loop
      playsInline
      preload="none"
    />
  );
}

export type ShowcaseItem = {
  description?: string | null;
  id: string;
  title: string;
  prompt?: string | null;
  promptPreview?: string | null;
  aspectRatio?: string | null;
  duration?: string | null;
  tags?: string[];
  video?: string | null;
  poster?: string | null;
  createUrl?: string | null;
  image: string;
  createdAt: string | Date;
};

const isVideoUrl = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some((extension) => lowerUrl.includes(extension));
};

const getLocaleFromPathname = (pathname?: string | null): string => {
  const firstSegment = pathname?.split('/').filter(Boolean)[0];
  return firstSegment && locales.includes(firstSegment)
    ? firstSegment
    : defaultLocale;
};

export function ShowcasesFlowDynamic({
  id,
  title,
  description,
  srOnlyTitle,
  className,
  containerClassName,
  gridClassName,
  cardClassName,
  mediaWrapperClassName,
  mediaClassName,
  tags,
  excludeTags,
  searchTerm,
  hideCreateButton = false,
  showDescription = false,
  showPreview = false,
  showTags = false,
  compactHeader = false,
  enableLimit = false,
  sortOrder = 'desc',
  initialItems,
  usePrompts = false,
  disableFetch = false,
  imagesOnly = false,
  createBehavior = 'create-page',
  createButtonLabel,
  footer,
}: {
  id?: string;
  title?: string;
  description?: string;
  srOnlyTitle?: string;
  className?: string;
  containerClassName?: string;
  gridClassName?: string;
  cardClassName?: string;
  mediaWrapperClassName?: string;
  mediaClassName?: string;
  tags?: string;
  excludeTags?: string;
  searchTerm?: string;
  hideCreateButton?: boolean;
  showDescription?: boolean;
  showPreview?: boolean;
  showTags?: boolean;
  compactHeader?: boolean;
  enableLimit?: boolean;
  sortOrder?: 'asc' | 'desc';
  initialItems?: ShowcaseItem[];
  usePrompts?: boolean;
  disableFetch?: boolean;
  imagesOnly?: boolean;
  createBehavior?: 'create-page' | 'prefill-generator';
  createButtonLabel?: string;
  footer?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const [items, setItems] = useState<ShowcaseItem[]>(initialItems || []);
  const t = useTranslations('pages.showcases.ui');
  const [loading, setLoading] = useState(!initialItems && !disableFetch);
  const [showLoading, setShowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const isInitialMount = useState(true);

  useEffect(() => {
    if (disableFetch) {
      return;
    }

    if (initialItems && isInitialMount[0]) {
      isInitialMount[1](false);
      return;
    }

    setLoading(true);
    setShowLoading(false);
    setError(null);

    const loadingTimer = setTimeout(() => {
      setShowLoading(true);
    }, 300);

    const params = new URLSearchParams();
    if (enableLimit) {
      params.append('limit', '20');
    }
    params.append('sortOrder', sortOrder);
    params.append('_t', Date.now().toString());
    if (tags) params.append('tags', tags);
    if (excludeTags) params.append('excludeTags', excludeTags);
    if (searchTerm) params.append('searchTerm', searchTerm);
    if (usePrompts) params.append('usePrompts', 'true');
    if (imagesOnly) params.append('imagesOnly', 'true');
    if (imagesOnly) params.append('locale', locale);

    fetch(`/api/showcases/latest?${params.toString()}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.code === 0 && data.data) {
          setItems(data.data);
          return;
        }

        setError(data.message || 'API Error');
      })
      .catch((nextError) => {
        setError(nextError.message);
      })
      .finally(() => {
        clearTimeout(loadingTimer);
        setLoading(false);
        setShowLoading(false);
      });

    return () => clearTimeout(loadingTimer);
  }, [
    tags,
    excludeTags,
    searchTerm,
    enableLimit,
    sortOrder,
    initialItems,
    usePrompts,
    disableFetch,
    imagesOnly,
    locale,
  ]);

  const handlePrevious = useCallback(() => {
    setSelectedIndex((previous) =>
      previous !== null ? (previous === 0 ? items.length - 1 : previous - 1) : null
    );
  }, [items.length]);

  const handleNext = useCallback(() => {
    setSelectedIndex((previous) =>
      previous !== null
        ? previous === items.length - 1
          ? 0
          : previous + 1
        : null
    );
  }, [items.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (event.key === 'Escape') setSelectedIndex(null);
      if (event.key === 'ArrowLeft') handlePrevious();
      if (event.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, handlePrevious, handleNext]);

  const createLabel = createButtonLabel || t('create_similar');
  const prefillPayloadKey = 'seedance_prefill_payload';

  const handleCreateClick = useCallback(
    (item: ShowcaseItem) => {
      if (createBehavior === 'prefill-generator') {
        const promptValue = item.prompt || item.title;

        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('seedance_prefill_prompt', promptValue);
          window.sessionStorage.setItem(
            prefillPayloadKey,
            JSON.stringify({
              prompt: promptValue,
              aspectRatio: item.aspectRatio || undefined,
              duration: item.duration || undefined,
            })
          );
        }

        const params = new URLSearchParams();
        if (promptValue) params.set('prompt', promptValue);
        if (item.aspectRatio) params.set('aspectRatio', item.aspectRatio);
        if (item.duration) params.set('duration', item.duration);
        const createPath = `/ai-video${
          params.toString() ? `?${params.toString()}` : ''
        }`;

        if (typeof window !== 'undefined') {
          const targetId = 'generator';
          const element = document.getElementById(targetId);
          if (element) {
            const basePath = (pathname || '/').split('#')[0];
            const nextUrl = `${basePath}${
              params.toString() ? `?${params.toString()}` : ''
            }#${targetId}`;
            router.replace(nextUrl);
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        }

        if (item.createUrl) {
          router.push(item.createUrl);
          return;
        }

        router.push(createPath);
        return;
      }

      const createValue = item.prompt || item.title;
      router.push(`/ai-image?prompt=${encodeURIComponent(createValue)}`);
    },
    [createBehavior, pathname, router]
  );

  return (
    <section id={id} className={cn('pb-24 md:pb-36', className)}>
      {srOnlyTitle && <h1 className="sr-only">{srOnlyTitle}</h1>}
      {(title || description) && (
        <motion.div
          className={cn(
            'container mb-12 text-center',
            compactHeader ? 'pt-10 md:pt-16' : 'pt-24 md:pt-36'
          )}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1] as const,
          }}
        >
          {title && (
            <h2 className="mx-auto mb-6 max-w-full text-3xl font-bold text-pretty md:max-w-5xl lg:text-4xl">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-muted-foreground text-md mx-auto mb-4 line-clamp-3 max-w-full md:max-w-5xl">
              {description}
            </p>
          )}
        </motion.div>
      )}
      {loading || showLoading ? (
        showLoading && (
          <div className={cn('container my-30 text-center', containerClassName)}>
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        )
      ) : error ? (
        <div className={cn('container text-center text-red-500', containerClassName)}>
          <p>Error loading: {error}</p>
        </div>
      ) : items.length > 0 ? (
        <div
          className={cn(
            gridClassName ||
              'container mx-auto columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3 xl:columns-4',
            containerClassName
          )}
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                'group relative cursor-zoom-in break-inside-avoid overflow-hidden rounded-xl',
                cardClassName
              )}
              onClick={() => setSelectedIndex(index)}
            >
              {showTags && item.tags && item.tags.length > 0 && (
                <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/20 bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className={cn('relative overflow-hidden', mediaWrapperClassName)}>
                {!imagesOnly && isVideoUrl(item.image) ? (
                  <LazyVideo
                    src={item.image}
                    poster={item.poster || undefined}
                    className={cn('h-auto w-full', mediaClassName)}
                  />
                ) : (
                  <LazyImage
                    src={item.image}
                    alt={item.title}
                    className={cn(
                      'h-auto w-full transition-transform duration-300 group-hover:scale-105',
                      mediaClassName
                    )}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                )}
              </div>

              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <h3 className="mb-3 translate-y-4 text-base font-semibold text-white transition-transform duration-300 group-hover:translate-y-0">
                  {item.title}
                </h3>
                {showPreview && item.promptPreview && (
                  <p className="mb-3 line-clamp-2 translate-y-4 text-sm text-white/80 transition-transform duration-300 group-hover:translate-y-0">
                    {item.promptPreview}
                  </p>
                )}
                {!hideCreateButton && (
                  <div
                    className="translate-y-4 transition-transform delay-75 duration-300 group-hover:translate-y-0"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button
                      variant="default"
                      size="sm"
                      className="inline-flex h-8 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md border-0 bg-primary px-1 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 has-[>svg]:px-2.5 [&_svg:not([class*='size-'])]:size-4"
                      onClick={() => handleCreateClick(item)}
                    >
                      <Wand className="mr-2 size-4" />
                      {createLabel}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          className={cn('text-muted-foreground container mt-20 text-center', containerClassName)}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          No items found in this category.
        </motion.div>
      )}

      <AnimatePresence>
        {selectedIndex !== null && items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm md:p-8"
            onClick={() => setSelectedIndex(null)}
          >
            <button
              className="absolute right-4 top-4 z-50 text-white/70 transition-colors hover:text-white"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="size-8" />
            </button>

            <button
              className="absolute left-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/20 p-2 text-white/70 transition-colors hover:bg-black/40 hover:text-white"
              onClick={(event) => {
                event.stopPropagation();
                handlePrevious();
              }}
            >
              <ChevronLeft className="size-8 md:size-12" />
            </button>

            <button
              className="absolute right-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/20 p-2 text-white/70 transition-colors hover:bg-black/40 hover:text-white"
              onClick={(event) => {
                event.stopPropagation();
                handleNext();
              }}
            >
              <ChevronRight className="size-8 md:size-12" />
            </button>

            <motion.div
              key={selectedIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative flex h-full w-full items-center justify-center"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative max-h-full max-w-full overflow-hidden rounded-lg">
                {!imagesOnly &&
                isVideoUrl(
                  items[selectedIndex].video || items[selectedIndex].image
                ) ? (
                  <video
                    src={items[selectedIndex].video || items[selectedIndex].image}
                    className="h-auto max-h-[90vh] w-auto max-w-full object-contain"
                    controls
                    autoPlay
                    loop
                    playsInline
                    preload="none"
                  />
                ) : (
                  <LazyImage
                    src={items[selectedIndex].image}
                    alt={items[selectedIndex].title}
                    className="h-auto max-h-[90vh] w-auto max-w-full object-contain"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-6 text-white">
                  <h3 className="mb-2 text-2xl font-bold">
                    {items[selectedIndex].title}
                  </h3>
                  {showDescription && items[selectedIndex].description && (
                    <p className="mb-2 line-clamp-3 text-base text-white/90">
                      {items[selectedIndex].description}
                    </p>
                  )}
                  {items[selectedIndex].prompt && (
                    <p className="line-clamp-3 text-base text-white/90">
                      {items[selectedIndex].prompt}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {footer && (
        <div className={cn('container mx-auto mt-10 flex justify-center', containerClassName)}>
          {footer}
        </div>
      )}
    </section>
  );
}
