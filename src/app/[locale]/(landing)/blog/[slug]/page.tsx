import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import {
  BlogPostSchema,
  FAQSchema,
  HowToSchema,
  VideoObjectSchema,
} from '@/shared/components/seo';
import { getAlternateLanguageUrlsByLocales } from '@/shared/lib/seo';
import { getCanonicalPostPath, getPost } from '@/shared/models/post';
import { DynamicPage } from '@/shared/types/blocks/landing';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations('pages.blog.metadata');

  const post = await getPost({ slug, locale });
  if (!post) {
    notFound();
  }

  const canonicalLocale = post.canonical_locale || defaultLocale;
  const canonicalPath = getCanonicalPostPath({
    slug,
    locale: canonicalLocale,
  });
  const canonicalUrl = `${envConfigs.app_url}${canonicalPath}`;
  const alternateLanguages = getAlternateLanguageUrlsByLocales(
    `/blog/${slug}`,
    post.available_locales?.length ? post.available_locales : [canonicalLocale]
  );

  return {
    title: `${post.title} | ${t('title')}`,
    description: post.description,
    keywords:
      post.seo_keywords?.join(', ') || post.tags?.join(', ') || undefined,
    alternates: {
      canonical: canonicalUrl,
      languages: alternateLanguages,
    },
    openGraph: {
      images: post.image
        ? [
            post.image.startsWith('http')
              ? post.image
              : `${envConfigs.app_url}${post.image}`,
          ]
        : undefined,
    },
    twitter: {
      images: post.image
        ? [
            post.image.startsWith('http')
              ? post.image
              : `${envConfigs.app_url}${post.image}`,
          ]
        : undefined,
    },
  };
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = await getPost({ slug, locale });

  if (!post) {
    notFound();
  }

  const canonicalLocale = post.canonical_locale || defaultLocale;

  if (canonicalLocale !== locale) {
    permanentRedirect(
      getCanonicalPostPath({
        slug,
        locale: canonicalLocale,
      })
    );
  }

  // build page sections
  const page: DynamicPage = {
    sections: {
      blogDetail: {
        block: 'blog-detail',
        data: {
          post,
        },
      },
    },
  };

  const Page = await getThemePage('dynamic-page');

  // Build canonical URL
  const canonicalUrl = `${envConfigs.app_url}${getCanonicalPostPath({
    slug,
    locale: canonicalLocale,
  })}`;

  return (
    <>
      <BlogPostSchema
        title={post.title || 'ChatGPT Image 2 Generator Blog'}
        description={post.description || ''}
        author={{
          name: post.author_name || 'ChatGPT Image 2 Generator Team',
          image: post.author_image,
          type: post.author_name?.includes('Team') ? 'Organization' : 'Person',
          jobTitle: post.author_role,
        }}
        datePublished={post.published_at || new Date().toISOString()}
        dateModified={post.published_at || new Date().toISOString()}
        image={
          post.image
            ? post.image.startsWith('http')
              ? post.image
              : `${envConfigs.app_url}${post.image}`
            : undefined
        }
        url={canonicalUrl}
        keywords={post.seo_keywords || post.tags}
        articleSection={post.categories
          ?.map((category) => category.title || '')
          .filter(Boolean)}
      />
      {post.video && (
        <VideoObjectSchema
          name={post.video.name}
          description={post.video.description}
          thumbnailUrl={post.video.thumbnailUrl}
          uploadDate={post.video.uploadDate}
          url={canonicalUrl}
          contentUrl={post.video.contentUrl}
          embedUrl={post.video.embedUrl}
          duration={post.video.duration}
          width={post.video.width}
          height={post.video.height}
        />
      )}
      {post.faqs && post.faqs.length > 0 && <FAQSchema faqs={post.faqs} />}
      {post.how_to_steps && post.how_to_steps.length > 0 && (
        <HowToSchema
          name={post.title || 'ChatGPT Image 2 Generator Guide'}
          description={post.description || ''}
          steps={post.how_to_steps}
          image={
            post.image
              ? post.image.startsWith('http')
                ? post.image
                : `${envConfigs.app_url}${post.image}`
              : undefined
          }
        />
      )}
      <Page locale={locale} page={page} />
    </>
  );
}
