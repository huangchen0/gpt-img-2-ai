import { getPromptLibraryLocale } from './localization';
import type { PromptLibraryItem, PromptLibraryPromptVariant } from './types';

type PromptLike = Pick<
  PromptLibraryItem,
  'prompt' | 'promptVariants' | 'language'
>;

export function getPromptVariants(
  item: PromptLike
): PromptLibraryPromptVariant[] {
  if (item.promptVariants && item.promptVariants.length > 0) {
    return item.promptVariants;
  }

  return [{ text: item.prompt, type: item.language, label: null }];
}

export function getPreferredPromptVariant(item: PromptLike, locale?: string) {
  const variants = getPromptVariants(item);
  const promptLocale = getPromptLibraryLocale(locale);

  if (promptLocale === 'zh') {
    return (
      variants.find((variant) => variant.type === 'zh') ||
      variants.find((variant) => variant.type === 'en') ||
      variants[0]
    );
  }

  return (
    variants.find((variant) => variant.type === 'en') ||
    variants.find((variant) => variant.type === 'zh') ||
    variants[0]
  );
}

export function getPreferredPrompt(item: PromptLike, locale?: string) {
  return getPreferredPromptVariant(item, locale)?.text || item.prompt.trim();
}
