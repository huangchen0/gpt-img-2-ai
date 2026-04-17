import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';
import { getAlternateLanguageUrls } from '@/shared/lib/seo';
import {
  PostType as DBPostType,
  getCanonicalPostPath,
  getLocalPostsAndCategories,
  getPostDate,
  getPosts,
  PostStatus,
} from '@/shared/models/post';
import {
  findTaxonomy,
  getTaxonomies,
  TaxonomyStatus,
  TaxonomyType,
} from '@/shared/models/taxonomy';
import {
  Blog as BlogType,
  Category as CategoryType,
  Post as PostType,
} from '@/shared/types/blocks/blog';
import { DynamicPage } from '@/shared/types/blocks/landing';

function formatCategorySlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations('pages.blog.metadata');
  const alternateLanguages = getAlternateLanguageUrls(`/blog/category/${slug}`);
  const [categoryData, { categories: localCategories }] = await Promise.all([
    findTaxonomy({
      slug,
      status: TaxonomyStatus.PUBLISHED,
    }),
    getLocalPostsAndCategories({
      locale,
    }),
  ]);
  const localCurrentCategory = localCategories.find(
    (category) => category.slug === slug
  );
  const resolvedCategory = categoryData
    ? {
        title: categoryData.title,
        description: categoryData.description || '',
      }
    : localCurrentCategory
      ? {
          title: localCurrentCategory.title || formatCategorySlug(slug),
          description: localCurrentCategory.description || '',
        }
      : {
          title: formatCategorySlug(slug),
          description: '',
        };

  return {
    title: `${resolvedCategory.title} | ${t('title')}`,
    description: resolvedCategory.description || t('description'),
    alternates: {
      canonical:
        locale !== envConfigs.locale
          ? `${envConfigs.app_url}/${locale}/blog/category/${slug}`
          : `${envConfigs.app_url}/blog/category/${slug}`,
      languages: alternateLanguages,
    },
  };
}

export default async function CategoryBlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: number; pageSize?: number }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('pages.blog');
  const { page: pageNum, pageSize } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 30;

  const { posts: localPosts, categories: localCategories } =
    await getLocalPostsAndCategories({
      locale,
    });

  const categoryData = await findTaxonomy({
    slug,
    status: TaxonomyStatus.PUBLISHED,
  });
  const localCurrentCategory = localCategories.find(
    (category) => category.slug === slug
  );

  if (!categoryData && !localCurrentCategory) {
    return notFound();
  }

  let postsData: Awaited<ReturnType<typeof getPosts>> = [];
  const categoriesData = await getTaxonomies({
    type: TaxonomyType.CATEGORY,
    status: TaxonomyStatus.PUBLISHED,
  });

  if (categoryData) {
    postsData = await getPosts({
      category: categoryData.id,
      type: DBPostType.ARTICLE,
      status: PostStatus.PUBLISHED,
      page,
      limit,
    });
  }

  const currentCategory: CategoryType = categoryData
    ? {
        id: categoryData.id,
        slug: categoryData.slug,
        title: categoryData.title,
        url: `/blog/category/${categoryData.slug}`,
      }
    : {
        id: localCurrentCategory?.id,
        slug: localCurrentCategory?.slug,
        title: localCurrentCategory?.title,
        url: localCurrentCategory?.url || `/blog/category/${slug}`,
      };

  const categoriesMap = new Map<string, CategoryType>();

  localCategories.forEach((category) => {
    if (category.slug) {
      categoriesMap.set(category.slug, category);
    }
  });

  categoriesData.forEach((category) => {
    if (category.slug) {
      categoriesMap.set(category.slug, {
        id: category.id,
        slug: category.slug,
        title: category.title,
        url: `/blog/category/${category.slug}`,
      });
    }
  });

  const categories: CategoryType[] = Array.from(categoriesMap.values());
  categories.unshift({
    id: 'all',
    slug: 'all',
    title: t('messages.all'),
    url: `/blog`,
  });

  const localCategoryPosts = localPosts.filter((post) =>
    post.categories?.some((category) => category.slug === slug)
  );
  const remoteCategoryPosts: PostType[] = postsData.map((post) => {
    const canonicalLocale = defaultLocale;

    return {
      id: post.id,
      slug: post.slug,
      locale: canonicalLocale,
      canonical_locale: canonicalLocale,
      available_locales: [canonicalLocale],
      title: post.title || '',
      description: post.description || '',
      author_name: post.authorName || '',
      author_image: post.authorImage || '',
      created_at:
        getPostDate({
          created_at: post.createdAt,
          locale,
        }) || '',
      date:
        getPostDate({
          created_at: post.createdAt,
          locale,
        }) || '',
      image: post.image || '',
      url: getCanonicalPostPath({
        slug: post.slug,
        locale: canonicalLocale,
      }),
    };
  });

  const postsMap = new Map<string, PostType>();

  localCategoryPosts.forEach((post) => {
    const key = post.slug || post.url || post.id;
    if (key) {
      postsMap.set(key, post);
    }
  });

  remoteCategoryPosts.forEach((post) => {
    const key = post.slug || post.url || post.id;
    if (key) {
      postsMap.set(key, post);
    }
  });

  const posts: PostType[] = Array.from(postsMap.values()).sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  const blog: BlogType = {
    ...t.raw('blog'),
    categories,
    currentCategory,
    posts,
  };

  const pageData: DynamicPage = {
    sections: {
      blog: {
        block: 'blog',
        data: {
          blog,
        },
      },
    },
  };

  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={pageData} />;
}
