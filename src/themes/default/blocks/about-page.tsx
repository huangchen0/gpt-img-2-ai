import { MarkdownPreview } from '@/shared/blocks/common';

import '@/config/style/docs.css';

interface AboutSection {
  id: string;
  heading: string;
  content: string;
}

interface AboutPageProps {
  title?: string;
  sections?: AboutSection[];
  data?: {
    title?: string;
    sections?: AboutSection[];
  };
  section?: unknown;
}

export async function AboutPage(props: AboutPageProps) {
  // DynamicPage spreads section.data, but direct usage may still nest under `data`
  const { title, sections } = props.data ?? props;

  if (!title || !sections?.length) {
    return null;
  }

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto w-full max-w-4xl px-6 md:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-foreground mx-auto mb-12 w-full text-3xl font-bold md:text-5xl">
            {title}
          </h1>
        </div>

        {/* Sections */}
        <div className="ring-foreground/5 relative rounded-3xl border border-transparent px-4 shadow ring-1 md:px-8">
          <div className="docs my-8 space-y-12">
            {sections.map((section) => (
              <div key={section.id} id={section.id} className="space-y-4">
                <h2 className="text-foreground text-2xl font-semibold">
                  {section.heading}
                </h2>
                <div className="text-muted-foreground prose prose-slate dark:prose-invert max-w-none text-base leading-relaxed">
                  <MarkdownPreview content={section.content} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
