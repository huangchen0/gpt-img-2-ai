import {
  getShowcasePublicPath,
  getVisibleShowcaseTags,
} from '@/shared/lib/showcase-seo';
import { buildShowcasePromptPreview } from '@/shared/lib/showcase-template';
import { getIsoTimestr, toISOStringSafe } from '@/shared/lib/time';
import type { Showcase } from '@/shared/models/showcase';

export type ShowcaseFlowItem = {
  id: string;
  title: string;
  description?: string | null;
  prompt?: string | null;
  promptPreview?: string | null;
  image: string;
  video?: string | null;
  poster?: string | null;
  tags?: string[];
  detailUrl?: string | null;
  createdAt: string;
};

export const HOME_SHOWCASE_LIMIT = 12;

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'];

export function isImageUrl(url?: string | null): boolean {
  if (!url) {
    return false;
  }

  const lowerUrl = url.toLowerCase();
  return IMAGE_EXTENSIONS.some((extension) => lowerUrl.includes(extension));
}

export function getHomeShowcaseFallbackItems(
  locale: string
): ShowcaseFlowItem[] {
  const now = new Date().toISOString();
  const isZh = locale.startsWith('zh');

  return [
    {
      id: 'fallback-3d-case-presentation',
      title: isZh ? '3D 产品与场景视觉' : '3D Product and Scene Visual',
      description: isZh
        ? '来自 Nano Banana 风格参考的精选图片示例'
        : 'Curated image example inspired by the Nano Banana reference site',
      image:
        'https://cdn.nano-banana-2-ai.com/uploads/landing/friend/nano-banana/showcase/3d-case-presentation.webp',
      createdAt: now,
    },
    {
      id: 'fallback-pro-ai-img',
      title: isZh
        ? '写实人物与产品合成'
        : 'Photoreal Character and Product Composite',
      description: isZh ? '首页展示兜底图片' : 'Homepage image fallback item',
      image:
        'https://cdn.nano-banana-2-ai.com/uploads/landing/friend/nano-banana/showcase/pro-ai-img.webp',
      createdAt: now,
    },
    {
      id: 'fallback-fighting-actions',
      title: isZh ? '动作风格重绘' : 'Action Style Recomposition',
      description: isZh ? '首页展示兜底图片' : 'Homepage image fallback item',
      image:
        'https://cdn.nano-banana-2-ai.com/uploads/landing/friend/nano-banana/showcase/fighting-actions.webp',
      createdAt: now,
    },
    {
      id: 'fallback-sticker-maker',
      title: isZh ? '贴纸与表情设计' : 'Sticker and Meme Design',
      description: isZh ? '首页展示兜底图片' : 'Homepage image fallback item',
      image:
        'https://cdn.nano-banana-2-ai.com/uploads/landing/friend/nano-banana/showcase/sticker-maker.webp',
      createdAt: now,
    },
    {
      id: 'fallback-math-solution',
      title: isZh ? '图文说明可视化' : 'Text-heavy Visual Explanation',
      description: isZh ? '首页展示兜底图片' : 'Homepage image fallback item',
      image:
        'https://cdn.nano-banana-2-ai.com/uploads/landing/friend/nano-banana/showcase/math-solution.webp',
      createdAt: now,
    },
    {
      id: 'fallback-ecommerce-product-model',
      title: isZh ? '电商产品展示图' : 'E-commerce Product Visual',
      description: isZh ? '首页展示兜底图片' : 'Homepage image fallback item',
      image:
        'https://cdn.nano-banana-2-ai.com/uploads/landing/friend/nano-banana/showcase/ecommerce-product-model.webp',
      createdAt: now,
    },
    {
      id: 'fallback-clothing-removal-tryon',
      title: isZh ? '服饰试穿概念图' : 'Virtual Try-on Concept',
      description: isZh ? '首页展示兜底图片' : 'Homepage image fallback item',
      image:
        'https://cdn.nano-banana-2-ai.com/uploads/landing/friend/nano-banana/showcase/clothing-removal-tryon.webp',
      createdAt: now,
    },
    {
      id: 'fallback-anime-figure-1',
      title: isZh ? '动漫手办风格' : 'Anime Figure Style',
      description: isZh ? '首页展示兜底图片' : 'Homepage image fallback item',
      image:
        'https://cdn.nano-banana-2-ai.com/uploads/landing/friend/nano-banana/showcase/anime-figure-1.webp',
      createdAt: now,
    },
    {
      id: 'fallback-graffiti-action',
      title: isZh ? '涂鸦动作海报' : 'Graffiti Action Poster',
      description: isZh ? '首页展示兜底图片' : 'Homepage image fallback item',
      image:
        'https://cdn.nano-banana-2-ai.com/uploads/landing/friend/nano-banana/showcase/graffiti-action.webp',
      createdAt: now,
    },
    {
      id: 'fallback-face-swap',
      title: isZh ? '人像替换与重绘' : 'Portrait Swap and Edit',
      description: isZh ? '首页展示兜底图片' : 'Homepage image fallback item',
      image:
        'https://cdn.nano-banana-2-ai.com/uploads/landing/friend/nano-banana/showcase/face-swap.webp',
      createdAt: now,
    },
  ];
}

export function mapShowcasesToFlowItems(
  showcases: Showcase[],
  locale?: string
): ShowcaseFlowItem[] {
  return showcases.map((item) => ({
    ...item,
    tags: getVisibleShowcaseTags(item.tags),
    promptPreview: buildShowcasePromptPreview({
      title: item.title,
      description: item.description,
      prompt: item.prompt,
      tags: getVisibleShowcaseTags(item.tags),
    }),
    detailUrl: getShowcasePublicPath(item, locale),
    createdAt: toISOStringSafe(item.createdAt) ?? getIsoTimestr(),
  }));
}

export function buildCombinedShowcaseItems({
  locale,
  showcases,
  limit,
}: {
  locale: string;
  showcases: Showcase[];
  limit?: number;
}): ShowcaseFlowItem[] {
  const mappedItems = mapShowcasesToFlowItems(showcases, locale);
  const items =
    mappedItems.length > 0 ? mappedItems : getHomeShowcaseFallbackItems(locale);

  return typeof limit === 'number' ? items.slice(0, limit) : items;
}

export function buildHomeImageShowcaseItems({
  locale,
  showcases,
  limit,
}: {
  locale: string;
  showcases: Showcase[];
  limit?: number;
}): ShowcaseFlowItem[] {
  const mappedItems = mapShowcasesToFlowItems(showcases, locale).filter(
    (item) => isImageUrl(item.image)
  );
  const items =
    mappedItems.length > 0 ? mappedItems : getHomeShowcaseFallbackItems(locale);

  return typeof limit === 'number' ? items.slice(0, limit) : items;
}
