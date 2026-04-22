import type { PromptLibraryItem, PromptLibraryListItem } from './types';

type PromptLike = Pick<PromptLibraryItem, 'title' | 'description'> & {
  prompt?: string;
  promptPreview?: string;
};

const categoryRules = [
  {
    label: 'Product',
    terms: ['product', 'ecommerce', 'e-commerce', 'packaging', 'poster', 'ad ', 'advertising', 'brand'],
  },
  {
    label: 'Infographic',
    terms: ['infographic', 'diagram', 'chart', 'map', 'timeline', 'explainer', 'slide'],
  },
  {
    label: 'UI Mockup',
    terms: ['ui', 'interface', 'app', 'dashboard', 'website', 'mockup', 'landing page'],
  },
  {
    label: 'Character',
    terms: ['character', 'avatar', 'mascot', 'anime', 'portrait', 'profile'],
  },
  {
    label: 'Story',
    terms: ['storyboard', 'comic', 'manga', 'panel', 'scene', 'cinematic'],
  },
  {
    label: 'Education',
    terms: ['study', 'lesson', 'school', 'learning', 'educational', 'exam'],
  },
  {
    label: 'Social',
    terms: ['social', 'post', 'newsletter', 'thumbnail', 'livestream', 'live stream'],
  },
];

function sourceText(item: PromptLike) {
  return `${item.title} ${item.description} ${item.prompt || item.promptPreview || ''}`.toLowerCase();
}

export function getPromptCategories(item: PromptLike) {
  const text = sourceText(item);
  const matches = categoryRules
    .filter((rule) => rule.terms.some((term) => text.includes(term)))
    .map((rule) => rule.label);

  return matches.length > 0 ? Array.from(new Set(matches)).slice(0, 3) : ['Creative'];
}

export function getPrimaryCategory(item: PromptLike) {
  return getPromptCategories(item)[0] || 'Creative';
}

export function getSuggestedSettings(item: PromptLike) {
  const category = getPrimaryCategory(item);
  const text = sourceText(item);
  const isWide = ['UI Mockup', 'Infographic', 'Story'].includes(category);
  const isPortrait = text.includes('portrait') || text.includes('profile') || text.includes('poster');

  return {
    aspectRatio: isWide ? '16:9 or 4:3' : isPortrait ? '4:5 or 3:4' : '1:1 or 4:5',
    quality: text.includes('detailed') || text.includes('photorealistic') ? 'High detail' : 'Standard first, then high detail',
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

export function getPromptUseCaseSentence(item: PromptLibraryItem | PromptLibraryListItem) {
  const category = getPrimaryCategory(item);
  const lowerCategory = category.toLowerCase();

  return `This ${lowerCategory} prompt is a strong starting point when you need a composed GPT Image 2 result with a clear subject, visual structure, and reusable style direction.`;
}
