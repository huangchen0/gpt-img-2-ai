'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { LazyImage, SmartIcon } from '@/shared/blocks/common';
import { AnimatedGridPattern } from '@/shared/components/ui/animated-grid-pattern';
import { Button } from '@/shared/components/ui/button';
import { Highlighter } from '@/shared/components/ui/highlighter';
import { trackGtmCtaClick } from '@/shared/lib/gtm';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

import { SocialAvatars } from './social-avatars';

const createFadeInVariant = (delay: number) => ({
  initial: {
    opacity: 0,
    y: 20,
    filter: 'blur(6px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
  },
  transition: {
    duration: 0.6,
    delay,
    ease: [0.22, 1, 0.36, 1] as const,
  },
});

export function Hero({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const highlightText = section.highlight_text ?? '';
  const backgroundVideo = section.background_video;
  const galleryImages = Array.isArray(section.gallery_images)
    ? section.gallery_images.filter((image) => image?.src)
    : [];
  const hasGallery = galleryImages.length > 0;
  const [shouldLoadBackgroundVideo, setShouldLoadBackgroundVideo] =
    useState(false);
  let texts = null;
  if (highlightText) {
    texts = section.title?.split(highlightText, 2);
  }

  const videoPoster =
    backgroundVideo?.poster || section.background_image?.src || undefined;
  const videoSources = [
    {
      src:
        backgroundVideo?.webm_src ||
        (backgroundVideo?.src?.endsWith('.webm') ? backgroundVideo.src : ''),
      type: 'video/webm',
    },
    {
      src:
        backgroundVideo?.mp4_src ||
        (backgroundVideo?.src?.endsWith('.mp4') ? backgroundVideo.src : ''),
      type: 'video/mp4',
    },
  ].filter((item) => item.src);
  const hasMediaBackground = Boolean(
    backgroundVideo || section.background_image
  );
  const titleClasses = hasMediaBackground
    ? 'font-display mx-auto max-w-4xl text-5xl font-semibold leading-[0.94] tracking-[-0.04em] text-white text-balance sm:text-6xl lg:text-[5.25rem]'
    : 'font-display text-foreground text-5xl font-semibold text-balance sm:mt-12 sm:text-6xl';
  const bodyClasses = hasMediaBackground
    ? 'mx-auto mt-8 mb-8 max-w-2xl text-base leading-8 text-white/80 text-balance md:text-xl'
    : 'text-muted-foreground mt-8 mb-8 text-lg text-balance';
  const tipClasses = hasMediaBackground
    ? 'mx-auto mt-8 flex w-fit items-center rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-medium tracking-[0.02em] text-white/80 backdrop-blur-md'
    : 'text-muted-foreground mt-6 block text-center text-sm';

  useEffect(() => {
    if (!backgroundVideo) {
      setShouldLoadBackgroundVideo(false);
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const connection = (
      navigator as Navigator & {
        connection?: {
          saveData?: boolean;
        };
      }
    ).connection;

    if (
      connection?.saveData ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (!isDesktop) {
      return;
    }

    let cancelled = false;

    const loadVideo = () => {
      if (!cancelled) {
        setShouldLoadBackgroundVideo(true);
      }
    };

    const cleanupFns: Array<() => void> = [];
    const interactionEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'];

    interactionEvents.forEach((eventName) => {
      const handler = () => {
        loadVideo();
      };
      window.addEventListener(eventName, handler, {
        once: true,
        passive: true,
      });
      cleanupFns.push(() => window.removeEventListener(eventName, handler));
    });

    const timeoutId = window.setTimeout(loadVideo, 2500);
    cleanupFns.push(() => window.clearTimeout(timeoutId));

    return () => {
      cancelled = true;
      cleanupFns.forEach((cleanup) => cleanup());
    };
  }, [backgroundVideo]);

  return (
    <div className="relative isolate overflow-hidden">
      <section
        id={section.id}
        className={cn(
          hasMediaBackground
            ? 'relative flex min-h-[78svh] items-center pt-28 pb-20 md:min-h-[88svh] md:pt-32 md:pb-28'
            : hasGallery
              ? 'pt-24 pb-16 md:pt-32 md:pb-20'
              : 'pt-24 pb-8 md:pt-36 md:pb-8',
          section.className,
          className
        )}
      >
        {section.announcement && (
          <motion.div {...createFadeInVariant(0)}>
            <Link
              href={section.announcement.url || ''}
              target={section.announcement.target || '_self'}
              className={cn(
                'group mb-8 flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md transition-colors duration-300',
                hasGallery ? 'mx-auto lg:mx-0' : 'mx-auto',
                hasMediaBackground
                  ? 'border-white/15 bg-white/10 text-white backdrop-blur-md hover:bg-white/14'
                  : 'hover:bg-background dark:hover:border-t-border bg-muted shadow-zinc-950/5 dark:border-t-white/5 dark:shadow-zinc-950'
              )}
            >
              <span
                className={cn(
                  'text-sm',
                  hasMediaBackground ? 'text-white/90' : 'text-foreground'
                )}
              >
                {section.announcement.title}
              </span>
              <span
                className={cn(
                  'block h-4 w-0.5 border-l',
                  hasMediaBackground
                    ? 'border-white/20 bg-white/30'
                    : 'dark:border-background bg-white dark:bg-zinc-700'
                )}
              ></span>

              <div
                className={cn(
                  'size-6 overflow-hidden rounded-full duration-500',
                  hasMediaBackground
                    ? 'bg-white/15 group-hover:bg-white/20'
                    : 'bg-background group-hover:bg-muted'
                )}
              >
                <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                  <span className="flex size-6">
                    <ArrowRight className="m-auto size-3" />
                  </span>
                  <span className="flex size-6">
                    <ArrowRight className="m-auto size-3" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        <div
          className={cn(
            'relative mx-auto w-full px-4',
            hasMediaBackground
              ? 'max-w-6xl text-center'
              : hasGallery
                ? 'max-w-7xl'
                : 'max-w-5xl text-center'
          )}
        >
          <div
            className={cn(
              hasGallery
                ? 'grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]'
                : 'block'
            )}
          >
            <div className={cn(hasGallery ? 'text-center lg:text-left' : '')}>
              <motion.div {...createFadeInVariant(0.15)}>
                {texts && texts.length > 0 ? (
                  <h1
                    className={cn(
                      titleClasses,
                      hasGallery &&
                        'mx-auto max-w-3xl text-slate-950 lg:mx-0 lg:text-left'
                    )}
                  >
                    {texts[0]}
                    <Highlighter action="underline" color="#FF9800">
                      {highlightText}
                    </Highlighter>
                    {texts[1]}
                  </h1>
                ) : (
                  <h1
                    className={cn(
                      titleClasses,
                      hasGallery &&
                        'mx-auto max-w-3xl text-slate-950 lg:mx-0 lg:text-left'
                    )}
                  >
                    {section.title}
                  </h1>
                )}
              </motion.div>

              <motion.p
                {...createFadeInVariant(0.3)}
                className={cn(
                  bodyClasses,
                  hasGallery &&
                    'mx-auto max-w-2xl text-slate-600 lg:mx-0 lg:text-left'
                )}
                dangerouslySetInnerHTML={{ __html: section.description ?? '' }}
              />

              {section.buttons && (
                <motion.div
                  {...createFadeInVariant(0.45)}
                  className={cn(
                    'flex flex-col gap-3 sm:flex-row sm:gap-4',
                    hasGallery
                      ? 'items-center justify-center lg:items-center lg:justify-start'
                      : 'items-center justify-center'
                  )}
                >
                  {section.buttons.map((button, idx) => (
                    <Button
                      asChild
                      size={button.size || 'default'}
                      variant={button.variant || 'default'}
                      className={cn(
                        'rounded-full px-5 text-sm md:h-12 md:px-7 md:text-base',
                        hasMediaBackground &&
                          (button.variant === 'outline'
                            ? 'border-white/15 bg-white/8 text-white shadow-lg shadow-black/15 backdrop-blur-md hover:bg-white/14 hover:text-white dark:bg-white/8'
                            : 'bg-white text-slate-950 shadow-2xl shadow-black/30 hover:bg-white/90')
                      )}
                      key={idx}
                    >
                      <Link
                        href={button.url ?? ''}
                        target={button.target ?? '_self'}
                        onClick={() =>
                          trackGtmCtaClick({
                            location: section.id || 'hero',
                            label: button.title
                              ? String(button.title)
                              : undefined,
                            destination: button.url,
                          })
                        }
                      >
                        {button.icon && (
                          <SmartIcon name={button.icon as string} />
                        )}
                        <span>{button.title}</span>
                      </Link>
                    </Button>
                  ))}
                </motion.div>
              )}

              {section.tip && (
                <motion.p
                  {...createFadeInVariant(0.6)}
                  className={cn(
                    tipClasses,
                    hasGallery && 'mx-auto lg:mx-0'
                  )}
                  dangerouslySetInnerHTML={{ __html: section.tip ?? '' }}
                />
              )}

              {section.show_avatars && (
                <motion.div
                  {...createFadeInVariant(0.75)}
                  className={cn(hasGallery ? 'flex justify-center lg:justify-start' : '')}
                >
                  <SocialAvatars tip={section.avatars_tip || ''} />
                </motion.div>
              )}
            </div>

            {hasGallery && (
              <motion.div
                {...createFadeInVariant(0.45)}
                className="relative mx-auto w-full max-w-[540px]"
              >
                <div className="absolute inset-x-10 top-6 h-32 rounded-full bg-orange-100/70 blur-3xl" />
                <div className="grid grid-cols-2 gap-4 sm:gap-5">
                  {galleryImages.map((image, index) => (
                    <div
                      key={`${image.src}-${index}`}
                      className={cn(
                        'group relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.10)]',
                        index % 3 === 0 && 'translate-y-4',
                        index % 3 === 1 && '-translate-y-3',
                        index % 3 === 2 && 'translate-y-1'
                      )}
                    >
                      <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-slate-100">
                        <Image
                          src={image.src || ''}
                          alt={image.alt || `Hero gallery image ${index + 1}`}
                          fill
                          sizes="(min-width: 1024px) 260px, 45vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>
      {section.image && !hasGallery && (
        <motion.section
          className="border-foreground/10 relative mt-8 border-y sm:mt-16"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            delay: 0.9,
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1] as const,
          }}
        >
          <div className="relative z-10 mx-auto max-w-6xl border-x px-3">
            <div className="border-x">
              <div
                aria-hidden
                className="h-3 w-full bg-[repeating-linear-gradient(-45deg,var(--color-foreground),var(--color-foreground)_1px,transparent_1px,transparent_4px)] opacity-5"
              />
              <LazyImage
                className="border-border/25 relative z-2 hidden border dark:block"
                src={section.image_invert?.src || section.image?.src || ''}
                alt={section.image_invert?.alt || section.image?.alt || ''}
              />
              <LazyImage
                className="border-border/25 relative z-2 border dark:hidden"
                src={section.image?.src || section.image_invert?.src || ''}
                alt={section.image?.alt || section.image_invert?.alt || ''}
              />
            </div>
          </div>
        </motion.section>
      )}

      {backgroundVideo ? (
        <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden">
          <div className="to-background absolute inset-0 z-10 bg-gradient-to-b from-slate-950/30 via-slate-950/55" />
          <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_12%,rgba(2,6,23,0.18)_46%,rgba(2,6,23,0.7)_100%)]" />
          <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(116,193,167,0.18),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(255,205,142,0.18),transparent_24%)] mix-blend-screen" />
          {videoPoster && (
            <Image
              src={videoPoster}
              alt={backgroundVideo?.alt || section.background_image?.alt || ''}
              fill
              priority
              sizes="100vw"
              className="absolute inset-0 h-full w-full scale-[1.02] object-cover"
            />
          )}
          {shouldLoadBackgroundVideo ? (
            <video
              aria-hidden
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={videoPoster}
              className="h-full w-full scale-[1.02] object-cover"
            >
              {videoSources.map((source) => (
                <source key={source.type} src={source.src} type={source.type} />
              ))}
            </video>
          ) : null}
          <div className="via-background/35 to-background absolute inset-x-0 bottom-0 z-20 h-32 bg-gradient-to-b from-transparent" />
        </div>
      ) : section.background_image ? (
        <div className="absolute inset-0 -z-10 h-full w-full overflow-hidden">
          <div className="to-background absolute inset-0 z-10 bg-gradient-to-b from-slate-950/20 via-slate-950/45" />
          <Image
            src={section.background_image?.src || ''}
            alt={section.background_image?.alt || ''}
            fill
            priority
            sizes="100vw"
            className="h-full w-full scale-[1.02] object-cover opacity-65"
          />
        </div>
      ) : section.show_bg !== false ? (
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.1}
          duration={3}
          repeatDelay={1}
          className={cn(
            '[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]',
            'inset-x-0 inset-y-[-30%] h-[200%] skew-y-12'
          )}
        />
      ) : null}
    </div>
  );
}
