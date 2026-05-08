import type {
  PromptLibraryDataset,
  PromptLibraryIndexDataset,
  PromptLibraryIndexItem,
  PromptLibraryItem,
  PromptLibraryMedia,
  PromptLibraryModel,
  PromptLibraryPromptVariant,
} from './types';

const hiddenSourcePattern = /\b(?:Kitlib|YouMind|OpenNana|PromptGallery)\b/gi;

const textReplacements: Array<[RegExp, string]> = [
  [/\bKitlib(?:\s+PromptGallery)?\b/gi, 'curated prompt library'],
  [/\bYouMind\b/gi, 'curated prompt library'],
  [/\bOpenNana\b/gi, 'curated prompt library'],
  [/\bPromptGallery\b/gi, 'prompt gallery'],
  [/\bNano Banana(?:\s+Pro)?\b/gi, 'image generation model'],
  [/\bChatGPT\b/gi, 'AI assistant'],
  [/\bOpenAI\b/gi, 'AI company'],
  [/default=(["'])Submarine\1/gi, 'default=$1energy drink brand$1'],
  [
    /\bSubmarine\b(?=[^{}]{0,80}\b(?:energy drink|beverage|brand|logo)\b)/gi,
    'energy drink brand',
  ],
  [/\bYouTube(?:\s+Music)?\b/gi, 'video platform'],
  [/\byoutube\.com\b/gi, 'video-platform.example'],
  [/\bNike\b/gi, 'sportswear brand'],
  [/\bTesla\b/gi, 'electric vehicle brand'],
  [/\bNetflix\b/gi, 'streaming platform'],
  [/\bYahoo\b/gi, 'search portal'],
  [/\bPhotoshop\b/gi, 'image editor'],
  [/\bLightroom\b/gi, 'photo editor'],
  [/\bCLIP STUDIO PAINT\b/gi, 'illustration software'],
  [/\bMrBeast\b/gi, 'online creator'],
  [/\bGQ\b/g, 'style magazine'],
  [/\bSam Altman\b/gi, 'tech founder'],
  [/\bGreg Brockman\b/gi, 'tech executive'],
  [/\bMike Tyson\b/gi, 'boxing champion'],
  [/\bDoraemon\b/gi, 'anime character'],
  [/\bNaruto\b/gi, 'anime ninja character'],
  [/\bNobita\b/gi, 'anime character'],
  [/\bSatoru Gojo\b/gi, 'anime mentor character'],
  [/\bPok[eé]mon\b/gi, 'anime creature series'],
  [/\bNick Wilde\b/gi, 'animated fox character'],
  [/\bZootopia\b/gi, 'animated animal city film'],
  [/\bGTA(?::?\s*Vice City)?\b/gi, 'retro open-world game'],
  [/\bBTS\b/g, 'idol group'],
  [/\bKPOP Demon Hunters\b/gi, 'idol fantasy movie'],
  [/\bCardcaptor Sakura\b/gi, 'magical girl anime'],
  [/\bSteve Carell\b/gi, 'comedy actor'],
  [/\bThe Office\b/gi, 'workplace comedy series'],
  [/\bBlack Sails\b/gi, 'pirate drama series'],
  [/\bSavage Books\b/gi, 'book review channel'],
  [/\bDead By Daylight\b/gi, 'survival horror game'],
  [/\bDead of Daylight\b/gi, 'survival horror game'],
  [/\bYouTuber\b/gi, 'video creator'],
  [/\bInstagram\b/gi, 'social media app'],
  [/\bDisneySea\b/gi, 'theme park'],
  [/\bDisney\b/gi, 'animation studio'],
  [/\bPixar\b/gi, 'animation studio'],
  [/\bMeta Quest(?:\s+\d+)?\b/gi, 'VR headset'],
  [/\bElon Musk\b/gi, 'tech entrepreneur'],
  [/\bSpaceX\b/gi, 'space company'],
  [/\bTetris\b/gi, 'block puzzle game'],
  [/\bIrasutoya\b/gi, 'simple illustration style'],
];

const blockedUrlPattern =
  /(kitlib|youmind|opennana|nano-banana|twitter\.com|x\.com|t\.co)/i;

const slugReplacements: Array<[RegExp, string]> = [
  [/kitlib/g, 'prompt'],
  [/youmind/g, 'prompt'],
  [/opennana/g, 'prompt'],
  [/chatgpt/g, 'ai-assistant'],
  [/openai/g, 'ai-company'],
  [/nano-banana-pro/g, 'image-model'],
  [/nano-banana/g, 'image-model'],
  [/youtube/g, 'video-platform'],
  [/nike/g, 'sportswear'],
  [/tesla/g, 'electric-vehicle'],
  [/netflix/g, 'streaming-platform'],
  [/yahoo/g, 'search-portal'],
  [/photoshop/g, 'image-editor'],
  [/lightroom/g, 'photo-editor'],
  [/clip-studio-paint/g, 'illustration-software'],
  [/mrbeast/g, 'online-creator'],
  [/instagram/g, 'social-app'],
  [/disney/g, 'animation-studio'],
  [/pixar/g, 'animation-studio'],
  [/meta-quest/g, 'vr-headset'],
  [/spacex/g, 'space-company'],
  [/tetris/g, 'block-puzzle'],
  [/irasutoya/g, 'simple-illustration'],
];

type SanitizeOptions = {
  model?: PromptLibraryModel;
  assetBaseUrl?: string;
  mediaBasePath?: string;
};

function sanitizeTextValue(value: string) {
  return textReplacements.reduce(
    (nextValue, [pattern, replacement]) =>
      nextValue.replace(pattern, replacement),
    value
  );
}

export function sanitizePromptLibraryText<T extends string | null | undefined>(
  value: T
) {
  if (typeof value !== 'string') return value;

  return sanitizeTextValue(value) as T;
}

export function getPublicPromptSlug(slug: string) {
  return slugReplacements
    .reduce(
      (nextSlug, [pattern, replacement]) =>
        nextSlug.replace(pattern, replacement),
      slug.toLowerCase()
    )
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getPublicPromptId(id: string, slug: string) {
  return isHiddenSourceLabel(id) || getPublicPromptSlug(id) !== id ? slug : id;
}

function isHiddenSourceLabel(value?: string | null) {
  return Boolean(value && value.match(hiddenSourcePattern));
}

function sanitizePromptVariant(
  variant: PromptLibraryPromptVariant
): PromptLibraryPromptVariant {
  return {
    ...variant,
    label: isHiddenSourceLabel(variant.label)
      ? null
      : sanitizePromptLibraryText(variant.label),
    text: sanitizePromptLibraryText(variant.text),
  };
}

function getMediaProxyPath(
  model: PromptLibraryModel,
  slug: string,
  index: number,
  variant: 'full' | 'thumbnail',
  mediaBasePath?: string
) {
  const basePath = (mediaBasePath || '/api/prompt-library').replace(/\/+$/, '');
  const suffix = variant === 'thumbnail' ? '?variant=thumbnail' : '';

  return `${basePath}/${model}/media/${encodeURIComponent(slug)}/${index}${suffix}`;
}

function shouldProxyMediaUrl(value?: string | null) {
  if (!value) return false;
  if (value.startsWith('/')) return false;

  return /^https?:\/\//i.test(value) || blockedUrlPattern.test(value);
}

function sanitizeMediaItem(
  media: PromptLibraryMedia,
  model: PromptLibraryModel,
  slug: string,
  index: number,
  options: SanitizeOptions = {}
): PromptLibraryMedia {
  const fullSource = media.r2Url || media.url;
  const thumbnailSource = media.r2Thumbnail || media.thumbnail || fullSource;
  const shouldProxyFull = shouldProxyMediaUrl(fullSource);
  const shouldProxyThumbnail = shouldProxyMediaUrl(thumbnailSource);
  const fullUrl = shouldProxyFull
    ? getMediaProxyPath(model, slug, index, 'full', options.mediaBasePath)
    : fullSource || '';
  const thumbnailUrl = shouldProxyThumbnail
    ? getMediaProxyPath(model, slug, index, 'thumbnail', options.mediaBasePath)
    : thumbnailSource || fullUrl;

  return {
    ...media,
    url: fullUrl,
    thumbnail: thumbnailUrl,
    r2Url: fullUrl,
    r2Thumbnail: thumbnailUrl,
    sourceUrl: null,
  };
}

export function sanitizePromptLibraryItem<T extends PromptLibraryItem>(
  item: T,
  options: SanitizeOptions = {}
): T {
  const model = options.model || item.model;
  const slug = getPublicPromptSlug(item.slug);

  return {
    ...item,
    id: getPublicPromptId(item.id, slug),
    slug,
    title: sanitizePromptLibraryText(item.title),
    description: sanitizePromptLibraryText(item.description),
    prompt: sanitizePromptLibraryText(item.prompt),
    promptVariants: item.promptVariants?.map(sanitizePromptVariant),
    authorName: null,
    authorUrl: null,
    sourceUrl: null,
    tags: item.tags?.map((tag) => sanitizePromptLibraryText(tag)),
    media: item.media.map((media, index) =>
      sanitizeMediaItem(media, model, slug, index, options)
    ),
  };
}

export function sanitizePromptLibraryIndexItem<
  T extends PromptLibraryIndexItem,
>(item: T, options: SanitizeOptions = {}): T {
  const model = options.model || item.model;
  const slug = getPublicPromptSlug(item.slug);

  return {
    ...item,
    id: getPublicPromptId(item.id, slug),
    slug,
    title: sanitizePromptLibraryText(item.title),
    description: sanitizePromptLibraryText(item.description),
    promptPreview: sanitizePromptLibraryText(item.promptPreview),
    authorName: null,
    authorUrl: null,
    sourceUrl: null,
    media: item.media.map((media, index) =>
      sanitizeMediaItem(media, model, slug, index, options)
    ),
  };
}

export function sanitizePromptLibraryDataset<T extends PromptLibraryDataset>(
  dataset: T,
  options?: SanitizeOptions
): T;
export function sanitizePromptLibraryDataset<
  T extends PromptLibraryIndexDataset,
>(dataset: T, options?: SanitizeOptions): T;
export function sanitizePromptLibraryDataset(
  dataset: PromptLibraryDataset | PromptLibraryIndexDataset,
  options: SanitizeOptions = {}
) {
  const model = options.model || dataset.model;
  const datasetAssetBaseUrl =
    'assetBaseUrl' in dataset ? dataset.assetBaseUrl : undefined;
  const assetBaseUrl = options.assetBaseUrl || datasetAssetBaseUrl;
  const items = dataset.items.map((item) =>
    'promptPreview' in item
      ? sanitizePromptLibraryIndexItem(item, { ...options, model })
      : sanitizePromptLibraryItem(item, { ...options, model })
  );

  return {
    ...dataset,
    source: 'Curated prompt library',
    sourceUrl: `/prompts/${model}`,
    ...(assetBaseUrl ? { assetBaseUrl } : {}),
    items,
  };
}
