'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { LazyImage } from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

export function HowToTechniques({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const items = section.items ?? [];

  return (
    <section
      id={section.id || section.name}
      className={cn(
        'bg-[#17171b] py-20 text-white md:py-28',
        section.className,
        className
      )}
    >
      <div className="container">
        <motion.div
          className="mx-auto max-w-5xl text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-7xl">
            {section.title}
            {section.highlight_text && (
              <>
                {' '}
                <span className="bg-[linear-gradient(90deg,#5b7cff_0%,#b55ff6_35%,#ff8fb1_65%,#f1d04f_100%)] bg-clip-text text-transparent">
                  {section.highlight_text}
                </span>
              </>
            )}
          </h2>
          <p className="mx-auto mt-6 max-w-4xl text-lg leading-8 text-white/60 md:text-2xl md:leading-10">
            {section.description}
          </p>
          {(section.badge_text || section.image?.src) && (
            <div className="mt-8 flex justify-center">
              {section.image?.src ? (
                <LazyImage
                  src={section.image.src}
                  alt={section.image.alt ?? section.title ?? ''}
                  className="h-auto max-w-[280px] opacity-95"
                />
              ) : (
                <p className="text-sm text-white/65 md:text-base">
                  {section.badge_text}
                </p>
              )}
            </div>
          )}
        </motion.div>

        <div className="mt-16 space-y-10 md:mt-24 md:space-y-16">
          {items.map((item, index) => {
            const imagePosition = item.image_position || 'right';
            const isImageLeft = imagePosition === 'left';

            return (
              <motion.div
                key={item.title || index}
                className={cn(
                  'grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16',
                  isImageLeft &&
                    'lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1'
                )}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-120px' }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div className="space-y-5 px-2 lg:px-0">
                  <h3 className="max-w-xl text-balance text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                    {item.title}
                  </h3>
                  <p className="max-w-2xl text-lg leading-9 text-white/60">
                    {item.description}
                  </p>
                  {item.button && (
                    <Button
                      asChild
                      variant="secondary"
                      className="h-14 rounded-xl bg-white px-8 text-lg font-medium text-[#17171b] hover:bg-white/90"
                    >
                      <Link
                        href={item.button.url || ''}
                        target={item.button.target || '_self'}
                      >
                        {item.button.title}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>

                <div className="rounded-[2rem] bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-5">
                  <div className="overflow-hidden rounded-[1.5rem] bg-[#f6f3eb]">
                    <LazyImage
                      src={item.image?.src ?? ''}
                      alt={item.image?.alt ?? item.title ?? ''}
                      className="w-full"
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
