export const MIN_GENERATION_FALLBACK_CREDITS = 40;
export const IMAGE_STANDARD_FALLBACK_CREDITS = MIN_GENERATION_FALLBACK_CREDITS;
export const VIDEO_CLASSIC_FALLBACK_CREDITS = MIN_GENERATION_FALLBACK_CREDITS;

export type GenerationCreditFallbackOptionId =
  | 'image_standard'
  | 'video_classic';

export interface GenerationCreditFallbackOption {
  id: GenerationCreditFallbackOptionId;
  requiredCredits: number;
}

export interface GenerationCreditFallbackPayload {
  type: 'insufficient_credits_with_fallback';
  requestedCostCredits: number;
  remainingCredits: number;
  fallbackOptions: GenerationCreditFallbackOption[];
}

function createOption(id: GenerationCreditFallbackOptionId) {
  return {
    id,
    requiredCredits:
      id === 'image_standard'
        ? IMAGE_STANDARD_FALLBACK_CREDITS
        : VIDEO_CLASSIC_FALLBACK_CREDITS,
  } satisfies GenerationCreditFallbackOption;
}

export function buildGenerationCreditFallbackPayload({
  mediaType,
  requestedCostCredits,
  remainingCredits,
}: {
  mediaType: string;
  requestedCostCredits: number;
  remainingCredits: number;
}): GenerationCreditFallbackPayload | null {
  if (
    requestedCostCredits <= 0 ||
    remainingCredits >= requestedCostCredits ||
    remainingCredits < MIN_GENERATION_FALLBACK_CREDITS
  ) {
    return null;
  }

  const fallbackOptions: GenerationCreditFallbackOption[] = [];

  if (mediaType === 'image') {
    if (requestedCostCredits > IMAGE_STANDARD_FALLBACK_CREDITS) {
      fallbackOptions.push(createOption('image_standard'));
    }
  } else if (mediaType === 'video') {
    if (requestedCostCredits > VIDEO_CLASSIC_FALLBACK_CREDITS) {
      fallbackOptions.push(createOption('video_classic'));
      fallbackOptions.push(createOption('image_standard'));
    }
  }

  if (fallbackOptions.length === 0) {
    return null;
  }

  return {
    type: 'insufficient_credits_with_fallback',
    requestedCostCredits,
    remainingCredits,
    fallbackOptions,
  };
}

function isGenerationCreditFallbackOption(
  value: unknown
): value is GenerationCreditFallbackOption {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const option = value as Partial<GenerationCreditFallbackOption>;
  return (
    (option.id === 'image_standard' || option.id === 'video_classic') &&
    typeof option.requiredCredits === 'number'
  );
}

export function isGenerationCreditFallbackPayload(
  value: unknown
): value is GenerationCreditFallbackPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<GenerationCreditFallbackPayload>;

  return (
    payload.type === 'insufficient_credits_with_fallback' &&
    typeof payload.requestedCostCredits === 'number' &&
    typeof payload.remainingCredits === 'number' &&
    Array.isArray(payload.fallbackOptions) &&
    payload.fallbackOptions.every(isGenerationCreditFallbackOption)
  );
}

export function buildGeneratorPromptHref(href: string, prompt: string) {
  const [path, hash = ''] = href.split('#');
  const searchParams = new URLSearchParams();

  if (prompt.trim()) {
    searchParams.set('prompt', prompt.trim());
  }

  const query = searchParams.toString();
  const hashSuffix = hash ? `#${hash}` : '';

  return `${path}${query ? `?${query}` : ''}${hashSuffix}`;
}
