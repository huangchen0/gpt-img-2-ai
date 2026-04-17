import { getMDXComponents } from '@/mdx-components';
import { and, count, desc, eq, like } from 'drizzle-orm';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import moment from 'moment';

import { db } from '@/core/db';
import { logsSource, pagesSource, postsSource } from '@/core/docs/source';
import { generateTOC } from '@/core/docs/toc';
import { post } from '@/config/db/schema';
import { defaultLocale } from '@/config/locale';
import { MarkdownContent } from '@/shared/blocks/common/markdown-content';
import {
  getIsoTimestr,
  parseDateValue,
  toISOStringSafe,
} from '@/shared/lib/time';
import {
  Category as BlogCategoryType,
  Post as BlogPostType,
} from '@/shared/types/blocks/blog';

import { getTaxonomies, TaxonomyStatus, TaxonomyType } from './taxonomy';

export type Post = typeof post.$inferSelect;
export type NewPost = typeof post.$inferInsert;
export type UpdatePost = Partial<Omit<NewPost, 'id' | 'createdAt'>>;

export enum PostType {
  ARTICLE = 'article',
  PAGE = 'page',
  LOG = 'log',
}

export enum PostStatus {
  PUBLISHED = 'published', // published and visible to the public
  PENDING = 'pending', // pending review by admin
  DRAFT = 'draft', // draft and not visible to the public
  ARCHIVED = 'archived', // archived means deleted
}

function normalizePostPrefix(postPrefix = '/blog/') {
  if (!postPrefix.startsWith('/')) {
    postPrefix = `/${postPrefix}`;
  }

  return postPrefix.endsWith('/') ? postPrefix.slice(0, -1) : postPrefix;
}

function getPostCanonicalLocaleFromPath(path?: string) {
  if (!path) {
    return defaultLocale;
  }

  const fileName = path.split('/').pop() || path;
  const normalizedName = fileName.replace(/\.(md|mdx)$/, '');
  const match = normalizedName.match(/\.([a-z]{2}(?:-[A-Z]{2})?)$/);

  return match?.[1] || defaultLocale;
}

function getPostHref({
  slug,
  postPrefix = '/blog/',
}: {
  slug: string;
  postPrefix?: string;
}) {
  return `${normalizePostPrefix(postPrefix)}/${slug}`;
}

export function getCanonicalPostPath({
  slug,
  locale,
  postPrefix = '/blog/',
}: {
  slug: string;
  locale?: string;
  postPrefix?: string;
}) {
  const href = getPostHref({ slug, postPrefix });

  if (!locale || locale === defaultLocale) {
    return href;
  }

  return `/${locale}${href}`;
}

function attachPostCanonicalMeta(
  postData: BlogPostType,
  canonicalLocale: string,
  postPrefix = '/blog/'
): BlogPostType {
  return {
    ...postData,
    locale: canonicalLocale,
    canonical_locale: canonicalLocale,
    available_locales: [canonicalLocale],
    url: postData.slug
      ? getPostHref({
          slug: postData.slug,
          postPrefix,
        })
      : postData.url,
  };
}

export async function addPost(data: NewPost) {
  const [result] = await db().insert(post).values(data).returning();

  return result;
}

export async function updatePost(id: string, data: UpdatePost) {
  const [result] = await db()
    .update(post)
    .set(data)
    .where(eq(post.id, id))
    .returning();

  return result;
}

export async function deletePost(id: string) {
  const result = await updatePost(id, {
    status: PostStatus.ARCHIVED,
  });

  return result;
}

export async function findPost({
  id,
  slug,
  status,
}: {
  id?: string;
  slug?: string;
  status?: PostStatus;
}) {
  const [result] = await db()
    .select()
    .from(post)
    .where(
      and(
        id ? eq(post.id, id) : undefined,
        slug ? eq(post.slug, slug) : undefined,
        status ? eq(post.status, status) : undefined
      )
    )
    .limit(1);

  return result;
}

export async function getPosts({
  type,
  status,
  category,
  tag,
  page = 1,
  limit = 30,
}: {
  type?: PostType;
  status?: PostStatus;
  category?: string;
  tag?: string[];
  page?: number;
  limit?: number;
} = {}): Promise<Post[]> {
  const result = await db()
    .select()
    .from(post)
    .where(
      and(
        type ? eq(post.type, type) : undefined,
        status ? eq(post.status, status) : undefined,
        category ? like(post.categories, `%${category}%`) : undefined,
        tag ? like(post.tags, `%${tag}%`) : undefined
      )
    )
    .orderBy(desc(post.updatedAt), desc(post.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return result;
}

export async function getPostsCount({
  type,
  status,
  category,
  tag,
}: {
  type?: PostType;
  status?: PostStatus;
  category?: string;
  tag?: string;
} = {}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(post)
    .where(
      and(
        type ? eq(post.type, type) : undefined,
        status ? eq(post.status, status) : undefined,
        category ? like(post.categories, `%${category}%`) : undefined,
        tag ? like(post.tags, `%${tag}%`) : undefined
      )
    )
    .limit(1);

  return result?.count || 0;
}

// get single post, both from local file and database
// database post has higher priority
export async function getPost({
  slug,
  locale,
  postPrefix = '/blog/',
}: {
  slug: string;
  locale: string;
  postPrefix?: string;
}): Promise<BlogPostType | null> {
  let post: BlogPostType | null = null;

  try {
    // get post from database
    const postData = await findPost({ slug, status: PostStatus.PUBLISHED });
    if (postData) {
      // post exist in database
      const content = postData.content || '';

      // Convert markdown content to MarkdownContent component
      const body = content ? <MarkdownContent content={content} /> : undefined;

      // Generate TOC from content
      const toc = content ? generateTOC(content) : undefined;

      post = {
        id: postData.id,
        slug: postData.slug,
        title: postData.title || '',
        description: postData.description || '',
        content: '',
        body: body,
        toc: toc,
        created_at:
          getPostDate({
            created_at: postData.createdAt,
            locale,
          }) || '',
        published_at: toISOStringSafe(postData.createdAt) || getIsoTimestr(),
        author_name: postData.authorName || '',
        author_image: postData.authorImage || '',
        author_role: '',
        image: postData.image || '',
        tags: postData.tags
          ? postData.tags
              .split(',')
              .map((tag: string) => tag.trim())
              .filter(Boolean)
          : [],
        url: getPostHref({
          slug: postData.slug,
          postPrefix,
        }),
      };

      return attachPostCanonicalMeta(post, defaultLocale, postPrefix);
    }
  } catch (e) {
    console.log('get post from database failed:', e);
  }

  // get post from locale file
  const localPost = await getLocalPost({ slug, locale, postPrefix });

  return localPost;
}

export async function getLocalPost({
  slug,
  locale,
  postPrefix = '/blog/',
}: {
  slug: string;
  locale: string;
  postPrefix?: string;
}): Promise<BlogPostType | null> {
  const localPost = await postsSource.getPage([slug], locale);
  if (!localPost) {
    return null;
  }

  const MDXContent = localPost.data.body;
  const body = (
    <MDXContent
      components={getMDXComponents({
        // this allows you to link to other pages with relative file paths
        a: createRelativeLink(postsSource, localPost),
      })}
    />
  );

  const frontmatter = localPost.data as any;
  const canonicalLocale = getPostCanonicalLocaleFromPath(localPost.path);

  const post: BlogPostType = attachPostCanonicalMeta(
    {
      id: localPost.path,
      slug: slug,
      title: localPost.data.title || '',
      description: localPost.data.description || '',
      content: '',
      body: body,
      toc: localPost.data.toc, // Use fumadocs auto-generated TOC
      created_at: frontmatter.created_at
        ? getPostDate({
            created_at: frontmatter.created_at,
            locale,
          })
        : '',
      published_at: frontmatter.created_at || '',
      author_name: frontmatter.author_name || '',
      author_image: frontmatter.author_image || '',
      author_role: frontmatter.author_role || '',
      image: frontmatter.image || '',
      date: frontmatter.date || '',
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      seo_keywords: Array.isArray(frontmatter.seo_keywords)
        ? frontmatter.seo_keywords
        : Array.isArray(frontmatter.tags)
          ? frontmatter.tags
          : [],
      categories: normalizePostCategories(frontmatter.categories),
      faqs: normalizePostFaqs(frontmatter.faqs),
      how_to_steps: normalizeHowToSteps(frontmatter.how_to_steps),
      video: normalizePostVideo(frontmatter.video),
    },
    canonicalLocale,
    postPrefix
  );

  return post;
}

function normalizePostVideo(video: unknown): BlogPostType['video'] {
  if (!video || typeof video !== 'object') {
    return undefined;
  }

  const input = video as Record<string, unknown>;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const description =
    typeof input.description === 'string' ? input.description.trim() : '';
  const thumbnailUrl =
    typeof input.thumbnailUrl === 'string' ? input.thumbnailUrl.trim() : '';
  const uploadDate =
    typeof input.uploadDate === 'string'
      ? input.uploadDate.trim()
      : toISOStringSafe(
          input.uploadDate as string | Date | number | null | undefined
        ) || '';
  const contentUrl =
    typeof input.contentUrl === 'string' ? input.contentUrl.trim() : '';
  const embedUrl =
    typeof input.embedUrl === 'string' ? input.embedUrl.trim() : '';

  if (
    !name ||
    !description ||
    !thumbnailUrl ||
    !uploadDate ||
    (!contentUrl && !embedUrl)
  ) {
    return undefined;
  }

  const toOptionalNumber = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return undefined;
  };

  const width = toOptionalNumber(input.width);
  const height = toOptionalNumber(input.height);

  return {
    name,
    description,
    thumbnailUrl,
    uploadDate,
    ...(contentUrl ? { contentUrl } : {}),
    ...(embedUrl ? { embedUrl } : {}),
    ...(typeof input.duration === 'string' && input.duration.trim()
      ? { duration: input.duration.trim() }
      : {}),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };
}

// get local page from: content/pages/*.md
export async function getLocalPage({
  slug,
  locale,
}: {
  slug: string;
  locale: string;
}): Promise<BlogPostType | null> {
  const localPage = await pagesSource.getPage([slug], locale);
  if (!localPage) {
    return null;
  }

  const MDXContent = localPage.data.body;
  const body = (
    <MDXContent
      components={getMDXComponents({
        // this allows you to link to other pages with relative file paths
        a: createRelativeLink(pagesSource, localPage),
      })}
    />
  );

  const frontmatter = localPage.data as any;

  const post: BlogPostType = {
    id: localPage.path,
    slug: slug,
    title: localPage.data.title || '',
    description: localPage.data.description || '',
    content: '',
    body: body,
    toc: localPage.data.toc, // Use fumadocs auto-generated TOC
    created_at: frontmatter.created_at
      ? getPostDate({
          created_at: frontmatter.created_at,
          locale,
        })
      : '',
    author_name: frontmatter.author_name || '',
    author_image: frontmatter.author_image || '',
    author_role: '',
    url: `/${locale}/${slug}`,
  };

  return post;
}

// get posts and categories, both from local files and database
export async function getPostsAndCategories({
  page = 1,
  limit = 30,
  locale,
  postPrefix = '/blog/',
  categoryPrefix = '/blog/category/',
}: {
  page?: number;
  limit?: number;
  locale: string;
  postPrefix?: string;
  categoryPrefix?: string;
}) {
  let posts: BlogPostType[] = [];

  // merge posts from both locale and remote, remove duplicates by slug
  // remote posts have higher priority
  const postsMap = new Map<string, BlogPostType>();

  // 1. get local posts
  const { posts: localPosts, categories: localCategories } =
    await getLocalPostsAndCategories({
      locale,
      postPrefix,
      categoryPrefix,
    });

  // add local posts to postsMap
  localPosts.forEach((post) => {
    if (post.slug) {
      postsMap.set(post.slug, post);
    }
  });

  // 2. get remote posts
  const { posts: remotePosts, categories: remoteCategories } =
    await getRemotePostsAndCategories({
      page,
      limit,
      locale,
      postPrefix,
      categoryPrefix,
    });

  // add remote posts to postsMap
  remotePosts.forEach((post) => {
    if (post.slug) {
      postsMap.set(post.slug, post);
    }
  });

  // Convert map to array and sort by created_at desc
  posts = Array.from(postsMap.values()).sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  const categoriesMap = new Map<string, BlogCategoryType>();
  [...localCategories, ...remoteCategories].forEach((category) => {
    if (category.slug) {
      categoriesMap.set(category.slug, category);
    }
  });

  return {
    posts,
    postsCount: posts.length,
    categories: Array.from(categoriesMap.values()),
    categoriesCount: categoriesMap.size,
  };
}

// get remote posts and categories
export async function getRemotePostsAndCategories({
  page = 1,
  limit = 30,
  locale,
  postPrefix = '/blog/',
  categoryPrefix = '/blog/category/',
}: {
  page?: number;
  limit?: number;
  locale: string;
  postPrefix?: string;
  categoryPrefix?: string;
}) {
  const dbPostsList: BlogPostType[] = [];
  const dbCategoriesList: BlogCategoryType[] = [];

  try {
    // get posts from database
    const dbPosts = await getPosts({
      type: PostType.ARTICLE,
      status: PostStatus.PUBLISHED,
      page,
      limit,
    });

    if (!dbPosts || dbPosts.length === 0) {
      return {
        posts: [],
        postsCount: 0,
        categories: [],
        categoriesCount: 0,
      };
    }

    dbPostsList.push(
      ...dbPosts.map((post) => ({
        id: post.id,
        slug: post.slug,
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
        locale: defaultLocale,
        canonical_locale: defaultLocale,
        available_locales: [defaultLocale],
        url: getPostHref({
          slug: post.slug,
          postPrefix,
        }),
      }))
    );

    // get categories from database
    const dbCategories = await getTaxonomies({
      type: TaxonomyType.CATEGORY,
      status: TaxonomyStatus.PUBLISHED,
    });

    dbCategoriesList.push(
      ...(dbCategories || []).map((category) => ({
        id: category.id,
        slug: category.slug,
        title: category.title,
        url: `${categoryPrefix}${category.slug}`,
      }))
    );
  } catch (e) {
    console.log('get remote posts and categories failed:', e);
  }

  return {
    posts: dbPostsList,
    postsCount: dbPostsList.length,
    categories: dbCategoriesList,
    categoriesCount: dbCategoriesList.length,
  };
}

// get local posts and categories
export async function getLocalPostsAndCategories({
  locale,
  postPrefix = '/blog/',
  categoryPrefix = '/blog/category/',
  type = PostType.ARTICLE,
}: {
  locale: string;
  postPrefix?: string;
  categoryPrefix?: string;
  type?: PostType;
}) {
  const localPostsList: BlogPostType[] = [];
  const localCategoriesMap = new Map<string, BlogCategoryType>();

  // get posts from local files
  let localPosts = postsSource.getPages(locale);
  if (type === PostType.LOG) {
    localPosts = logsSource.getPages(locale);
  }

  // no local posts
  if (!localPosts || localPosts.length === 0) {
    return {
      posts: [],
      postsCount: 0,
      categories: [],
      categoriesCount: 0,
    };
  }

  // Build posts data from local content
  localPostsList.push(
    ...localPosts.map((post) => {
      const frontmatter = post.data as any;
      const slug = getPostSlug({
        url: post.url,
        locale,
        prefix: postPrefix,
      });
      const canonicalLocale = getPostCanonicalLocaleFromPath(post.path);

      let body: React.ReactNode = undefined;
      if (type === PostType.LOG) {
        const MDXContent = post.data.body;
        body = <MDXContent components={getMDXComponents()} />;
      }

      const createdAt = frontmatter.created_at
        ? getPostDate({
            created_at: frontmatter.created_at,
            locale,
          })
        : '';
      const normalizedCategories = normalizePostCategories(
        frontmatter.categories,
        categoryPrefix
      );

      normalizedCategories.forEach((category) => {
        if (category.slug) {
          localCategoriesMap.set(category.slug, category);
        }
      });

      return {
        id: post.path,
        slug: slug,
        locale: canonicalLocale,
        canonical_locale: canonicalLocale,
        available_locales: [canonicalLocale],
        title: post.data.title || '',
        description: post.data.description || '',
        author_name: frontmatter.author_name || '',
        author_image: frontmatter.author_image || '',
        author_role: frontmatter.author_role || '',
        created_at: createdAt,
        date: frontmatter.date || createdAt,
        image: frontmatter.image || '',
        url: getPostHref({
          slug,
          postPrefix,
        }),
        version: frontmatter.version || '',
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
        categories: normalizedCategories,
        video: normalizePostVideo(frontmatter.video),
        body,
      };
    })
  );

  return {
    posts: localPostsList,
    postsCount: localPostsList.length,
    categories: Array.from(localCategoriesMap.values()),
    categoriesCount: localCategoriesMap.size,
  };
}

// Helper function to replace slug for local posts
export function getPostSlug({
  url,
  locale,
  prefix = '/blog/',
}: {
  url: string; // post url, like: /zh/blog/what-is-xxx
  locale: string; // locale
  prefix?: string; // post slug prefix
}): string {
  if (url.startsWith(prefix)) {
    return url.replace(prefix, '');
  } else if (url.startsWith(`/${locale}${prefix}`)) {
    return url.replace(`/${locale}${prefix}`, '');
  }

  return url;
}

export function getPostDate({
  created_at,
  locale,
}: {
  created_at: string | Date | number | null | undefined;
  locale?: string;
}) {
  const parsedDate = parseDateValue(created_at);
  if (!parsedDate) {
    return '';
  }

  return moment(parsedDate)
    .locale(locale || 'en')
    .format(locale === 'zh' ? 'YYYY/MM/DD' : 'MMM D, YYYY');
}

// Helper function to remove frontmatter from markdown content
export function removePostFrontmatter(content: string): string {
  // Match frontmatter pattern: ---\n...content...\n---
  const frontmatterRegex = /^---\r?\n[\s\S]*?\r?\n---\r?\n/;
  return content.replace(frontmatterRegex, '').trim();
}

export function normalizePostCategories(
  categories: unknown,
  categoryPrefix = '/blog/category/'
): BlogCategoryType[] {
  if (!Array.isArray(categories)) {
    return [];
  }

  return categories
    .map((category): BlogCategoryType | null => {
      if (typeof category === 'string') {
        const slug = toCategorySlug(category);
        return slug
          ? {
              slug,
              title: category,
              url: `${categoryPrefix}${slug}`,
            }
          : null;
      }

      if (!category || typeof category !== 'object') {
        return null;
      }

      const input = category as Record<string, unknown>;
      const title = typeof input.title === 'string' ? input.title.trim() : '';
      const slug =
        typeof input.slug === 'string'
          ? input.slug.trim()
          : toCategorySlug(title);

      if (!title || !slug) {
        return null;
      }

      return {
        id: typeof input.id === 'string' ? input.id : slug,
        slug,
        title,
        description:
          typeof input.description === 'string' ? input.description : undefined,
        image: typeof input.image === 'string' ? input.image : undefined,
        url:
          typeof input.url === 'string'
            ? input.url
            : `${categoryPrefix}${slug}`,
      };
    })
    .filter((category): category is BlogCategoryType =>
      Boolean(category?.slug)
    );
}

export function normalizePostFaqs(faqs: unknown) {
  if (!Array.isArray(faqs)) {
    return [];
  }

  return faqs
    .map((faq) => {
      if (!faq || typeof faq !== 'object') {
        return null;
      }

      const input = faq as Record<string, unknown>;
      const question =
        typeof input.question === 'string' ? input.question.trim() : '';
      const answer =
        typeof input.answer === 'string' ? input.answer.trim() : '';

      if (!question || !answer) {
        return null;
      }

      return {
        question,
        answer,
      };
    })
    .filter(
      (
        faq
      ): faq is {
        question: string;
        answer: string;
      } => Boolean(faq)
    );
}

export function normalizeHowToSteps(steps: unknown) {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps
    .map((step) => {
      if (!step || typeof step !== 'object') {
        return null;
      }

      const input = step as Record<string, unknown>;
      const name = typeof input.name === 'string' ? input.name.trim() : '';
      const text = typeof input.text === 'string' ? input.text.trim() : '';

      if (!name || !text) {
        return null;
      }

      return {
        name,
        text,
      };
    })
    .filter(
      (
        step
      ): step is {
        name: string;
        text: string;
      } => Boolean(step)
    );
}

function toCategorySlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
