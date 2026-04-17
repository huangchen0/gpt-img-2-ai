'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

import { ShowcasesFlowDynamic } from '@/themes/default/blocks/showcases-flow-dynamic';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Link } from '@/core/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';
import { Button } from '@/shared/components/ui/button';

export function HairstylesContent({
  sectionData,
}: {
  sectionData: Section;
}) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Hairstyles', tags: 'hairstyles' },
    { id: 'men', label: 'Men Hairstyles', tags: 'hairstyles,men' },
    { id: 'women', label: 'Women Hairstyles', tags: 'hairstyles,women' },
    { id: 'animal', label: 'Animal Hairstyles', tags: 'hairstyles,animal' },
  ];

  const activeTags = categories.find((c) => c.id === activeCategory)?.tags;

  return (
    <section className="py-24 md:py-36">
      {/* Title, Description and Buttons */}
      <motion.div
        className="container mb-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1] as const,
        }}
      >
        {sectionData.sr_only_title && (
          <h2 className="sr-only">{sectionData.sr_only_title}</h2>
        )}
        <h2 className="mx-auto mb-6 max-w-full text-3xl font-bold text-pretty md:max-w-5xl lg:text-4xl">
          {sectionData.title}
        </h2>
        <p className="text-muted-foreground text-md mx-auto mb-4 line-clamp-3 max-w-full md:max-w-5xl">
          {sectionData.description}
        </p>
        {sectionData.buttons && sectionData.buttons.length > 0 && (
          <div className="container mx-auto mt-8 mb-12 flex flex-wrap justify-center gap-4">
            {sectionData.buttons.map((button) => (
              <Button
                key={button.title}
                variant={button.variant || 'default'}
                size={button.size || 'sm'}
                asChild
              >
                <Link href={button.url || ''} target={button.target || '_self'}>
                  {button.icon && <SmartIcon name={button.icon as string} />}
                  {button.title}
                </Link>
              </Button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Category Buttons */}
      <motion.div
        className="container mb-12 flex flex-wrap justify-center gap-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.6,
          delay: 0.15,
          ease: [0.22, 1, 0.36, 1] as const,
        }}
      >
        {categories.map((category, index) => {
          const isSelected = activeCategory === category.id;
          return (
            <motion.button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                'relative rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                isSelected
                  ? ''
                  : 'border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground border'
              )}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: 0.2 + index * 0.1,
                ease: [0.22, 1, 0.36, 1] as const,
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isSelected ? (
                <>
                  <span className="bg-primary absolute inset-0 rounded-lg p-[2px]">
                    <span className="bg-background block h-full w-full rounded-[calc(0.5rem-2px)]" />
                  </span>
                  <span className="bg-primary relative z-10 bg-clip-text text-transparent">
                    {category.label}
                  </span>
                </>
              ) : (
                <span>{category.label}</span>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Dynamic Showcases */}
      <ShowcasesFlowDynamic
        tags={activeTags}
        hideCreateButton={true}
        showDescription={true}
        enableLimit={true}
      />
    </section>
  );
}
