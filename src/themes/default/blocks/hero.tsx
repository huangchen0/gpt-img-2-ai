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
    ? 'font-display text-foreground dark:text-white mx-auto max-w-4xl text-5xl font-semibold leading-[0.94] tracking-[-0.04em] text-balance sm:text-6xl lg:text-[5.25rem]'
    : 'font-display text-foreground text-5xl font-semibold text-balance sm:mt-12 sm:text-6xl';
  const bodyClasses = hasMediaBackground
    ? 'text-muted-foreground dark:text-white/80 mx-auto mt-8 mb-8 max-w-2xl text-base leading-8 text-balance md:text-xl'
    : 'text-muted-foreground mt-8 mb-8 text-lg text-balance';
  const tipClasses = hasMediaBackground
    ? 'text-foreground/75 dark:text-white/80 border-foreground/10 bg-background/65 dark:border-white/15 dark:bg-white/8 mx-auto mt-8 flex w-fit items-center rounded-full border px-4 py-2 text-xs font-medium tracking-[0.02em] backdrop-blur-md'
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
                'group mx-auto mb-8 flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md transition-colors duration-300',
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
            'relative mx-auto w-full px-4 text-center',
            hasMediaBackground ? 'max-w-6xl' : 'max-w-5xl'
          )}
        >
          <motion.div {...createFadeInVariant(0.15)}>
            {texts && texts.length > 0 ? (
              <h1 className={titleClasses}>
                {texts[0]}
                <Highlighter action="underline" color="#FF9800">
                  {highlightText}
                </Highlighter>
                {texts[1]}
              </h1>
            ) : (
              <h1 className={titleClasses}>{section.title}</h1>
            )}
          </motion.div>

          <motion.p
            {...createFadeInVariant(0.3)}
            className={bodyClasses}
            dangerouslySetInnerHTML={{ __html: section.description ?? '' }}
          />

          {section.buttons && (
            <motion.div
              {...createFadeInVariant(0.45)}
              className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
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
                        ? 'border-foreground/15 bg-background/65 text-foreground hover:bg-background/85 hover:text-foreground shadow-lg shadow-black/10 backdrop-blur-md dark:border-white/15 dark:bg-white/8 dark:text-white dark:shadow-black/15 dark:hover:bg-white/14 dark:hover:text-white'
                        : 'bg-foreground text-background hover:bg-foreground/90 shadow-2xl shadow-black/15 dark:bg-white dark:text-slate-950 dark:shadow-black/30 dark:hover:bg-white/90')
                  )}
                  key={idx}
                >
                  <Link
                    href={button.url ?? ''}
                    target={button.target ?? '_self'}
                    onClick={() =>
                      trackGtmCtaClick({
                        location: section.id || 'hero',
                        label: button.title ? String(button.title) : undefined,
                        destination: button.url,
                      })
                    }
                  >
                    {button.icon && <SmartIcon name={button.icon as string} />}
                    <span>{button.title}</span>
                  </Link>
                </Button>
              ))}
            </motion.div>
          )}

          {section.tip && (
            <motion.p
              {...createFadeInVariant(0.6)}
              className={tipClasses}
              dangerouslySetInnerHTML={{ __html: section.tip ?? '' }}
            />
          )}

          {section.show_avatars && (
            <motion.div {...createFadeInVariant(0.75)}>
              <SocialAvatars tip={section.avatars_tip || ''} />
            </motion.div>
          )}
        </div>
      </section>
      {section.image && (
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
