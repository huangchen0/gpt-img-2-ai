import type { ShareActionLabels } from '@/shared/blocks/common/share-action-grid';

type TranslationGetter = ((key: string) => string) & {
  has?: (key: string) => boolean;
};

function getLabel(t: TranslationGetter, key: string, fallback: string) {
  if (typeof t.has === 'function' && t.has(key)) {
    return t(key);
  }

  return fallback;
}

export function buildShareActionLabels({
  t,
  namespace,
  includeCopyPrompt = false,
}: {
  t: TranslationGetter;
  namespace: string;
  includeCopyPrompt?: boolean;
}): ShareActionLabels {
  const key = (suffix: string) => `${namespace}.${suffix}`;

  return {
    ...(includeCopyPrompt
      ? {
          copyPrompt: getLabel(t, key('copy_prompt'), 'Copy prompt'),
        }
      : {}),
    copyCaption: getLabel(t, key('copy_caption'), 'Copy caption'),
    copyLink: getLabel(t, key('copy_link'), 'Copy link'),
    copyMarkdown: getLabel(t, key('copy_markdown'), 'Copy Markdown'),
    copyEmbed: getLabel(t, key('copy_embed'), 'Copy embed'),
    more: getLabel(t, key('more'), 'More'),
    wechat: getLabel(t, key('wechat'), 'WeChat'),
    weibo: getLabel(t, key('weibo'), 'Weibo'),
    xiaohongshu: getLabel(t, key('xiaohongshu'), 'Xiaohongshu'),
    douyin: getLabel(t, key('douyin'), 'Douyin'),
    instagram: getLabel(t, key('instagram'), 'Instagram'),
    tiktok: getLabel(t, key('tiktok'), 'TikTok'),
    reddit: getLabel(t, key('reddit'), 'Reddit'),
    pinterest: getLabel(t, key('pinterest'), 'Pinterest'),
    x: getLabel(t, key('x'), 'X'),
    copied: getLabel(t, key('copied'), 'Copied'),
    copyFailed: getLabel(t, key('copy_failed'), 'Copy failed'),
  };
}
