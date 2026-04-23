import {
  getCustomizationTips,
  getPrimaryCategory,
  getSuggestedSettings,
} from './insights';
import type { PromptLibraryItem, PromptLibraryListItem } from './types';

export type PromptLibraryLocale = 'en' | 'zh';

type PromptLike = PromptLibraryItem | PromptLibraryListItem;

export const promptLibraryLocales: PromptLibraryLocale[] = ['en', 'zh'];

const categoryLabels: Record<PromptLibraryLocale, Record<string, string>> = {
  en: {
    All: 'All',
    Product: 'Product',
    Infographic: 'Infographic',
    'UI Mockup': 'UI Mockup',
    Character: 'Character',
    Story: 'Story',
    Education: 'Education',
    Social: 'Social',
    Creative: 'Creative',
  },
  zh: {
    All: '全部',
    Product: '产品视觉',
    Infographic: '信息图',
    'UI Mockup': '界面稿',
    Character: '角色设定',
    Story: '场景叙事',
    Education: '教学资料',
    Social: '社媒内容',
    Creative: '创意灵感',
  },
};

const categorySearchAliases: Record<string, string> = {
  Product: '产品 商品 电商 包装 海报 广告 品牌 商拍',
  Infographic: '信息图 图解 图表 长图 时间线 说明图',
  'UI Mockup': '界面 UI 截图 App 网站 Dashboard 落地页 原型',
  Character: '角色 人物 头像 吉祥物 二次元 肖像 设定',
  Story: '分镜 漫画 场景 镜头 叙事 电影感',
  Education: '教学 课程 学习 笔记 课件 知识',
  Social: '社媒 小红书 抖音 封面 直播 缩略图 帖子',
  Creative: '创意 灵感 风格化 概念 实验',
};

const zhUseCaseSentences: Record<string, string> = {
  Product:
    '适合快速搭建产品图、包装展示和品牌海报：主体、材质、背景与商业修图方向已经有框架，换掉变量就能开跑。',
  Infographic:
    '适合做图解、清单、路线图和知识长图：先锁定信息层级，再把文字量控制在模型能稳定处理的范围里。',
  'UI Mockup':
    '适合生成网页、App 或仪表盘界面稿：先保留模块结构，再替换成你的业务文案和品牌视觉。',
  Character:
    '适合沉淀头像、角色设定和吉祥物方向：先固定身份特征，再用参考图或小步修改保持一致性。',
  Story:
    '适合做分镜、漫画感画面和电影场景：把人物、动作、镜头和氛围拆开写，后续更容易微调。',
  Education:
    '适合做课件、学习笔记和讲解图：把重点、标签和版式先说清楚，再追加风格细节。',
  Social:
    '适合做封面、帖子、直播间和社媒素材：画面钩子和信息重点已经明确，改成你的平台语境即可。',
  Creative:
    '适合作为创意起点：保留它的主体、构图和风格骨架，再替换成你的主题与使用场景。',
};

export const promptLibraryMessages = {
  en: {
    aria: {
      loadingGallery: 'Loading prompt gallery',
      openPrompt: (title: string) => `Open ${title}`,
      promptImageAlt: (title: string) => `${title} GPT Image 2 prompt example`,
    },
    badges: {
      featured: 'Featured',
    },
    buttons: {
      copy: 'Copy',
      copied: 'Copied',
      failed: 'Failed',
      copyFailed: 'Failed',
      copyPrompt: 'Copy prompt',
      copyPromptFailed: 'Copy failed',
      linkCopied: 'Link copied',
      copyLink: 'Copy link',
      use: 'Use',
      useInGenerator: 'Use in generator',
      openGenerator: 'Open generator',
      tryRandomPrompt: 'Try random prompt',
      loadMore: 'Load more prompts',
      loading: 'Loading',
      originalSource: 'Original source',
    },
    detail: {
      backToGallery: 'Prompt gallery',
      noPreviewImage: 'No preview image',
      sourceCreator: 'Source creator:',
      fullPromptHeading: 'Full GPT Image 2 prompt',
      customizationHeading: 'How to customize it',
      relatedHeading: 'Related GPT Image 2 prompts',
      settingLabels: {
        aspectRatio: 'Aspect ratio',
        quality: 'Quality pass',
        workflow: 'Workflow',
      },
    },
    gallery: {
      eyebrow: 'GPT Image 2 prompt gallery',
      title: 'Copyable GPT Image 2 prompts for real image workflows',
      description: (total: number) =>
        `Explore ${total} practical prompts for product visuals, posters, UI mockups, characters, infographics, and social images. Each detail page adds usage notes and GPT Image 2 rewrite guidance so this is more than a mirrored prompt dump.`,
      snapshotTitle: 'Library snapshot',
      promptsLabel: 'Prompts',
      useCasesLabel: 'Use cases',
      snapshotDescription:
        'Built for GPT Image 2 specifically: search by intent, inspect examples, then send the full prompt into the generator.',
      searchPlaceholder: 'Search prompts, categories, styles, authors...',
      shownCount: (count: number) => `${count} shown`,
      loadingPrompts: 'Loading prompts',
      unavailableTitle: 'Prompt library is temporarily unavailable',
      unavailableDescription: 'Please refresh the page in a moment.',
      emptyTitle: 'No prompts found',
      emptyDescription: 'Try a broader use case or clear the search box.',
    },
    languageLabels: {
      en: 'English',
      zh: 'Chinese',
      ja: 'Japanese',
      ko: 'Korean',
      es: 'Spanish',
      ms: 'Malay',
      uk: 'Ukrainian',
    } as Record<string, string>,
  },
  zh: {
    aria: {
      loadingGallery: '正在加载提示词库',
      openPrompt: (title: string) => `打开 ${title}`,
      promptImageAlt: (title: string) => `${title} 的 GPT Image 2 提示词示例图`,
    },
    badges: {
      featured: '精选',
    },
    buttons: {
      copy: '复制',
      copied: '已复制',
      failed: '出错了',
      copyFailed: '复制失败',
      copyPrompt: '复制提示词',
      copyPromptFailed: '复制失败',
      linkCopied: '链接已复制',
      copyLink: '复制链接',
      use: '使用',
      useInGenerator: '拿去生成',
      openGenerator: '打开生成器',
      tryRandomPrompt: '随便试一条',
      loadMore: '继续浏览',
      loading: '加载中',
      originalSource: '查看原始来源',
    },
    detail: {
      backToGallery: '返回提示词库',
      noPreviewImage: '暂无预览图',
      sourceCreator: '来源作者：',
      fullPromptHeading: '完整 GPT Image 2 提示词',
      customizationHeading: '怎么改得更适合你',
      relatedHeading: '相关 GPT Image 2 提示词',
      settingLabels: {
        aspectRatio: '画幅建议',
        quality: '细节策略',
        workflow: '生成流程',
      },
    },
    gallery: {
      eyebrow: 'GPT Image 2 提示词库',
      title: '可以直接复制，也值得二次改写的图片 Prompt',
      description: (total: number) =>
        `这里整理了 ${total} 条适合真实创作流程的 GPT Image 2 提示词，覆盖产品图、海报、界面稿、角色设定、信息图和社媒配图。每个详情页都补了改写思路，方便你按中文创作语境继续调整。`,
      snapshotTitle: '素材概览',
      promptsLabel: '提示词',
      useCasesLabel: '创作场景',
      snapshotDescription:
        '按用途找灵感，看示例图判断方向，再把完整 Prompt 带到生成器里微调。',
      searchPlaceholder:
        '搜索用途、风格、作者，或输入“产品图”“信息图”等中文场景',
      shownCount: (count: number) => `已筛出 ${count} 条`,
      loadingPrompts: '提示词加载中',
      unavailableTitle: '提示词库暂时没加载出来',
      unavailableDescription: '稍等一下刷新页面，通常就能恢复。',
      emptyTitle: '没有找到合适的提示词',
      emptyDescription: '换个更宽一点的用途，或者先清空搜索条件。',
    },
    languageLabels: {
      en: '英文',
      zh: '中文',
      ja: '日文',
      ko: '韩文',
      es: '西班牙语',
      ms: '马来语',
      uk: '乌克兰语',
    } as Record<string, string>,
  },
} as const;

export function getPromptLibraryLocale(locale?: string): PromptLibraryLocale {
  return locale?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function getPromptLibraryMessages(locale?: string) {
  return promptLibraryMessages[getPromptLibraryLocale(locale)];
}

export function getLocalizedPromptCategory(category: string, locale?: string) {
  const promptLocale = getPromptLibraryLocale(locale);
  return categoryLabels[promptLocale][category] || category;
}

export function getPromptCategorySearchText(category: string, locale?: string) {
  const promptLocale = getPromptLibraryLocale(locale);

  if (promptLocale === 'zh') {
    return [
      category,
      getLocalizedPromptCategory(category, promptLocale),
      categorySearchAliases[category],
    ]
      .filter(Boolean)
      .join(' ');
  }

  return category;
}

export function getLocalizedPromptUseCaseSentence(
  item: PromptLike,
  locale?: string
) {
  const promptLocale = getPromptLibraryLocale(locale);
  const category = getPrimaryCategory(item);

  if (promptLocale === 'zh') {
    return zhUseCaseSentences[category] || zhUseCaseSentences.Creative;
  }

  const lowerCategory = category.toLowerCase();
  return `This ${lowerCategory} prompt is a strong starting point when you need a composed GPT Image 2 result with a clear subject, visual structure, and reusable style direction.`;
}

export function getLocalizedSuggestedSettings(
  item: PromptLike,
  locale?: string
) {
  const settings = getSuggestedSettings(item);
  const promptLocale = getPromptLibraryLocale(locale);

  if (promptLocale !== 'zh') return settings;

  const aspectRatio =
    settings.aspectRatio === '16:9 or 4:3'
      ? '16:9 或 4:3'
      : settings.aspectRatio === '4:5 or 3:4'
        ? '4:5 或 3:4'
        : '1:1 或 4:5';

  return {
    aspectRatio,
    quality:
      settings.quality === 'High detail'
        ? '直接用高细节'
        : '先标准出图，再高细节精修',
    workflow: settings.workflow.startsWith('Use image-to-image')
      ? '需要贴合参考图或既有版式时，用图生图；其他情况先用文字生成定方向。'
      : '先用文字生成定主画面，再一次只改一个重点细节。',
  };
}

export function getLocalizedCustomizationTips(
  item: PromptLike,
  locale?: string
) {
  const promptLocale = getPromptLibraryLocale(locale);
  if (promptLocale !== 'zh') return getCustomizationTips(item);

  const category = getPrimaryCategory(item);
  const common = [
    '先替换变量里的品类、人物、城市、品牌色，不急着改整段结构。',
    '把主体、构图和风格分开写，后续微调会更稳。',
  ];

  if (category === 'Product') {
    return [
      '换成你的具体品类、材质、包装色和拍摄背景。',
      '如果要做商业图，补上标签、Logo、手部和反光的清理要求。',
      ...common,
    ];
  }

  if (category === 'Infographic') {
    return [
      '先列清楚模块、标题和标签，让画面有明确的信息层级。',
      '图内文字尽量短，复杂说明留到第二轮修订。',
      ...common,
    ];
  }

  if (category === 'UI Mockup') {
    return [
      '先定义页面类型、关键模块和视觉层级，再加动效感或材质细节。',
      '需要真实展示时再写具体文案，否则可以让模型生成可读的占位标签。',
      ...common,
    ];
  }

  if (category === 'Character') {
    return [
      '先锁定年龄感、服装、轮廓、配色和表情，避免每轮都漂移。',
      '需要连续产出同一角色时，优先上传参考图再做小步修改。',
      ...common,
    ];
  }

  return [
    '一次只改一个变量，方便判断是哪处细节让画面变好了。',
    '补一句最终用途，例如封面、海报、落地页首图或汇报页插图。',
    ...common,
  ];
}

export function getLocalizedPromptLanguageLabel(
  language?: string | null,
  locale?: string
) {
  if (!language) return '';

  const messages = getPromptLibraryMessages(locale);
  return messages.languageLabels[language] || language;
}
