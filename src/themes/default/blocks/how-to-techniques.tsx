'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

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
        'bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.08),_transparent_36%),#111111] py-20 text-white md:py-28',
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
          {section.tip && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>{section.tip}</span>
            </div>
          )}
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-7xl">
            <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-yellow-200 bg-clip-text text-transparent">
              {section.title}
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/60 md:text-2xl md:leading-10">
            {section.description}
          </p>
        </motion.div>

        <div className="mt-16 space-y-10 md:mt-24 md:space-y-16">
          {items.map((item, index) => {
            const imagePosition = item.image_position || 'right';
            const isImageLeft = imagePosition === 'left';

            return (
              <motion.div
                key={item.title || index}
                className={cn(
                  'grid items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16',
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
                <div className="space-y-5">
                  <h3 className="max-w-xl text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                    {item.title}
                  </h3>
                  <p className="max-w-2xl text-lg leading-9 text-white/60">
                    {item.description}
                  </p>
                  {item.button && (
                    <Button
                      asChild
                      variant="link"
                      className="h-auto p-0 text-lg font-semibold text-amber-300 hover:text-amber-200"
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

                <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_30px_90px_rgba(0,0,0,0.35)]">
                  <div className="overflow-hidden rounded-[1.5rem] bg-black/20">
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
