import { MarkdownPreview } from '@/shared/blocks/common';

import '@/config/style/docs.css';

interface LegalSection {
  heading: string;
  text: string;
}

interface LegalPageProps {
  title?: string;
  lastUpdated?: string;
  content?: LegalSection[];
  // when rendered through DynamicPage, section data is spread, but when
  // consumed directly it may still arrive under `data`
  data?: {
    title?: string;
    lastUpdated?: string;
    content?: LegalSection[];
  };
  section?: unknown;
}

export async function LegalPage(props: LegalPageProps) {
  // DynamicPage spreads `section.data` directly, so support both shapes
  const { title, lastUpdated, content } = props.data ?? props;

  if (!title || !content?.length) {
    return null;
  }

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto w-full max-w-4xl px-6 md:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-foreground mx-auto mb-4 w-full text-3xl font-bold md:text-5xl">
            {title}
          </h1>
          <p className="text-muted-foreground mb-8 text-sm md:text-base">
            {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="ring-foreground/5 relative mt-12 rounded-3xl border border-transparent px-4 shadow ring-1 md:px-8">
          <div className="docs my-8 space-y-8">
            {content.map((section, index) => (
              <div key={index} className="space-y-4">
                <h2 className="text-foreground text-2xl font-semibold">
                  {section.heading}
                </h2>
                <div className="text-muted-foreground prose prose-slate dark:prose-invert max-w-none text-base leading-relaxed">
                  <MarkdownPreview content={section.text} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
