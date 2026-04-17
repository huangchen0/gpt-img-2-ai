export type ImageScene = 'text-to-image' | 'image-to-image';
export type ImageResolution = '1K' | '2K' | '4K';
export type CanonicalImageModel = 'nano-banana-2' | 'nano-banana-pro';

const BASE_FALLBACK_CREDITS: Record<ImageScene, number> = {
  'text-to-image': 4,
  'image-to-image': 6,
};

const NANO_BANANA_MODEL_PRICING: Record<
  CanonicalImageModel,
  Record<ImageResolution, number>
> = {
  'nano-banana-2': {
    '1K': 4,
    '2K': 8,
    '4K': 10,
  },
  'nano-banana-pro': {
    '1K': 6,
    '2K': 8,
    '4K': 12,
  },
};

export function normalizeImageResolution(value?: string): ImageResolution {
  if (value === '2K' || value === '4K') {
    return value;
  }

  return '1K';
}

export function getCanonicalImageModel(
  model: string | undefined | null
): CanonicalImageModel | null {
  if (!model) {
    return null;
  }

  if (model.includes('nano-banana-2')) {
    return 'nano-banana-2';
  }

  if (model.includes('nano-banana-pro')) {
    return 'nano-banana-pro';
  }

  return null;
}

export function getAdvancedImageModel(
  provider: string | undefined | null,
  model: string | undefined | null
): CanonicalImageModel | null {
  if (provider !== 'kie') {
    return null;
  }

  return getCanonicalImageModel(model);
}

interface CalculateImageCreditsInput {
  scene: ImageScene;
  provider?: string | null;
  model?: string | null;
  resolution?: string;
  googleSearch?: boolean;
  multiplier?: number;
}

export function calculateImageCredits({
  scene,
  provider,
  model,
  resolution,
  googleSearch = false,
  multiplier = 1,
}: CalculateImageCreditsInput): number {
  const canonicalModel = getAdvancedImageModel(provider, model);
  const normalizedResolution = normalizeImageResolution(resolution);

  if (!canonicalModel) {
    return BASE_FALLBACK_CREDITS[scene] * multiplier;
  }

  const baseCostCredits =
    NANO_BANANA_MODEL_PRICING[canonicalModel][normalizedResolution];
  const searchExtraCredits =
    canonicalModel === 'nano-banana-2' && googleSearch ? 2 : 0;

  return baseCostCredits * multiplier + searchExtraCredits;
}
