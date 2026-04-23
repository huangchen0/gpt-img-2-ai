import type { PromptLibraryItem, PromptLibraryListItem } from './types';

type PromptLike = Pick<PromptLibraryItem, 'title' | 'description'> & {
  prompt?: string;
  promptPreview?: string;
  tags?: string[];
};

const categoryRules = [
  {
    label: 'Product',
    terms: [
      'product',
      'ecommerce',
      'e-commerce',
      'packaging',
      'poster',
      'ad ',
      'advertising',
      'brand',
      '产品',
      '商品',
      '电商',
      '包装',
      '广告',
      '营销',
      '品牌',
      '香水',
      '手机壳',
    ],
  },
  {
    label: 'Infographic',
    terms: [
      'infographic',
      'diagram',
      'chart',
      'map',
      'timeline',
      'explainer',
      'slide',
      '信息图',
      '图解',
      '图鉴',
      '流程',
      '百科',
      '路线图',
      '示意图',
    ],
  },
  {
    label: 'UI Mockup',
    terms: [
      'ui',
      'interface',
      'app',
      'dashboard',
      'website',
      'mockup',
      'landing page',
      '界面',
      '截图',
      '网页',
      '网站',
      '应用',
      '后台',
      '仪表盘',
      '落地页',
    ],
  },
  {
    label: 'Character',
    terms: [
      'character',
      'avatar',
      'mascot',
      'anime',
      'portrait',
      'profile',
      '角色',
      '立绘',
      '人物',
      '美女',
      '少女',
      '肖像',
      '头像',
      '吉祥物',
    ],
  },
  {
    label: 'Story',
    terms: [
      'storyboard',
      'comic',
      'manga',
      'panel',
      'scene',
      'cinematic',
      '电影感',
      '场景',
      '群聊',
      '朋友圈',
      '分镜',
      '漫画',
      '直播',
    ],
  },
  {
    label: 'Education',
    terms: [
      'study',
      'lesson',
      'school',
      'learning',
      'educational',
      'exam',
      '教学',
      '课程',
      '学习',
      '笔记',
      '课件',
      '科普',
      '知识',
    ],
  },
  {
    label: 'Social',
    terms: [
      'social',
      'post',
      'newsletter',
      'thumbnail',
      'livestream',
      'live stream',
      '社媒',
      '小红书',
      '抖音',
      '直播间',
      '帖子',
      '封面',
      '群聊',
      '朋友圈',
    ],
  },
];

function sourceText(item: PromptLike) {
  return `${item.title} ${item.description} ${item.prompt || item.promptPreview || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
}

export function getPromptCategories(item: PromptLike) {
  const text = sourceText(item);
  const matches = categoryRules
    .filter((rule) => rule.terms.some((term) => text.includes(term)))
    .map((rule) => rule.label);

  return matches.length > 0
    ? Array.from(new Set(matches)).slice(0, 3)
    : ['Creative'];
}

export function getPrimaryCategory(item: PromptLike) {
  return getPromptCategories(item)[0] || 'Creative';
}

export function getSuggestedSettings(item: PromptLike) {
  const category = getPrimaryCategory(item);
  const text = sourceText(item);
  const isWide = ['UI Mockup', 'Infographic', 'Story'].includes(category);
  const isPortrait =
    text.includes('portrait') ||
    text.includes('profile') ||
    text.includes('poster');

  return {
    aspectRatio: isWide
      ? '16:9 or 4:3'
      : isPortrait
        ? '4:5 or 3:4'
        : '1:1 or 4:5',
    quality:
      text.includes('detailed') || text.includes('photorealistic')
        ? 'High detail'
        : 'Standard first, then high detail',
    workflow:
      text.includes('reference') || text.includes('using reference')
        ? 'Use image-to-image when matching an existing layout or subject matters.'
        : 'Start text-to-image, then rerun with one focused edit at a time.',
  };
}

export function getCustomizationTips(item: PromptLike) {
  const category = getPrimaryCategory(item);
  const common = [
    'Replace bracketed variables before changing the whole structure.',
    'Keep the subject, layout, and style instructions in separate sentences.',
  ];

  if (category === 'Product') {
    return [
      'Swap in your exact product type, material, packaging color, and background.',
      'Add cleanup rules for labels, logos, hands, and reflections when the output needs to feel commercial.',
      ...common,
    ];
  }

  if (category === 'Infographic') {
    return [
      'List the sections and labels explicitly so the model can organize the composition.',
      'Keep copy short inside the image and move complex text into a second revision pass.',
      ...common,
    ];
  }

  if (category === 'UI Mockup') {
    return [
      'Define the screen type, visible modules, and hierarchy before adding visual polish.',
      'Use real interface copy only when you need it; otherwise ask for readable placeholder labels.',
      ...common,
    ];
  }

  if (category === 'Character') {
    return [
      'Lock identity details first: age range, outfit, silhouette, colors, and expression.',
      'Use a reference image for repeated characters or branded mascots.',
      ...common,
    ];
  }

  return [
    'Change one variable at a time so you can tell which detail improved the image.',
    'Name the final use case, such as thumbnail, poster, landing-page visual, or presentation slide.',
    ...common,
  ];
}

export function getPromptUseCaseSentence(
  item: PromptLibraryItem | PromptLibraryListItem
) {
  const category = getPrimaryCategory(item);
  const lowerCategory = category.toLowerCase();

  return `This ${lowerCategory} prompt is a strong starting point when you need a composed GPT Image 2 result with a clear subject, visual structure, and reusable style direction.`;
}
