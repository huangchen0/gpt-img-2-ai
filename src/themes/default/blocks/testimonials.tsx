'use client';

import { Star } from 'lucide-react';

import { LazyImage } from '@/shared/blocks/common';
import { ScrollAnimation } from '@/shared/components/ui/scroll-animation';
import { Section, SectionItem } from '@/shared/types/blocks/landing';

export function Testimonials({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const TestimonialCard = ({ item }: { item: SectionItem }) => {
    const imageSrc = item.image?.src || item.avatar?.src || '';
    const imageAlt = item.image?.alt || item.avatar?.alt || item.name || '';
    const rating = Number(item.rating ?? 5);

    return (
      <div className="group relative min-h-[520px] overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
        <div className="absolute inset-0">
          <LazyImage
            src={imageSrc}
            alt={imageAlt}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/65 to-transparent" />
        </div>

        <div className="relative flex h-full flex-col justify-end gap-5 p-7 text-white md:p-8">
          <div className="flex items-center gap-1 text-[#ffcc00]">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                className={`h-5 w-5 ${
                  index < rating ? 'fill-current' : 'fill-transparent opacity-40'
                }`}
              />
            ))}
          </div>

          <div className="flex items-end gap-3">
            {item.avatar?.src && (
              <div className="ring-white/15 aspect-square size-10 overflow-hidden rounded-full ring-1">
                <LazyImage
                  src={item.avatar.src}
                  alt={item.avatar.alt || item.name || ''}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div>
              <h3 className="text-2xl font-semibold tracking-tight">{item.name}</h3>
              <p className="text-base text-white/75">{item.role || item.title}</p>
            </div>
          </div>

          <p className='max-w-xl text-lg leading-9 text-white/80 before:mr-1 before:content-["\201C"] after:ml-1 after:content-["\201D"]'>
            {item.quote || item.description}
          </p>
        </div>

        <h3 className="sr-only">
          {item.name}, {item.role || item.title}
        </h3>
      </div>
    );
  };

  return (
    <section
      id={section.id}
      className={`bg-[#17171b] py-16 text-white md:py-24 ${section.className} ${className}`}
    >
      <div className="container">
        <ScrollAnimation>
          <div className="mx-auto max-w-3xl text-center text-balance">
            <h2 className="mb-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
              {section.title}
            </h2>
            <p className="mb-6 text-white/65 md:mb-12 lg:mb-16">
              {section.description}
            </p>
          </div>
        </ScrollAnimation>
        <ScrollAnimation delay={0.2}>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {section.items?.map((item, index) => (
              <TestimonialCard key={index} item={item} />
            ))}
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
