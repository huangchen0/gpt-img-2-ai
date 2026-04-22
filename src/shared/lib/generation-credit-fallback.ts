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

function canUseOption(
  option: GenerationCreditFallbackOption,
  remainingCredits: number
) {
  return remainingCredits >= option.requiredCredits;
}

export function createGenerationCreditFallbackPayload({
  mediaType,
  requestedCostCredits,
  remainingCredits,
}: {
  mediaType: string;
  requestedCostCredits: number;
  remainingCredits: number;
}): GenerationCreditFallbackPayload {
  const fallbackOptions: GenerationCreditFallbackOption[] = [];

  if (mediaType === 'image') {
    const option = createOption('image_standard');
    if (
      requestedCostCredits > option.requiredCredits &&
      canUseOption(option, remainingCredits)
    ) {
      fallbackOptions.push(option);
    }
  } else if (mediaType === 'video') {
    const videoOption = createOption('video_classic');
    const imageOption = createOption('image_standard');

    if (
      requestedCostCredits > videoOption.requiredCredits &&
      canUseOption(videoOption, remainingCredits)
    ) {
      fallbackOptions.push(videoOption);
    }

    if (
      requestedCostCredits > imageOption.requiredCredits &&
      canUseOption(imageOption, remainingCredits)
    ) {
      fallbackOptions.push(imageOption);
    }
  }

  return {
    type: 'insufficient_credits_with_fallback',
    requestedCostCredits,
    remainingCredits,
    fallbackOptions,
  };
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
  if (requestedCostCredits <= 0 || remainingCredits >= requestedCostCredits) {
    return null;
  }

  return createGenerationCreditFallbackPayload({
    mediaType,
    requestedCostCredits,
    remainingCredits,
  });
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
