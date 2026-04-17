import { calculateVideoCredits, VideoScene } from '@/shared/lib/video-pricing';

import {
  isSeedance2GenerationModel,
  isSeedance15Model,
  Seedance2VideoOptions,
  Seedance15VideoOptions,
  SeedanceModel,
} from './seedance-video';

const SEEDANCE_2_RATE_TABLE = {
  fast: {
    withVideo: {
      '480p': 20,
      '720p': 45,
    },
    withoutVideo: {
      '480p': 35,
      '720p': 70,
    },
  },
  standard: {
    withVideo: {
      '480p': 25,
      '720p': 50,
    },
    withoutVideo: {
      '480p': 40,
      '720p': 80,
    },
  },
} as const;

const SEEDANCE_2_PRICING_CONFIG = {
  'bytedance/seedance-2-fast': {
    rateKey: 'fast',
    creditMultiplier: 1.5,
    roundingStep: 5,
  },
  'bytedance/seedance-2-fast-face': {
    rateKey: 'fast',
    creditMultiplier: 1.8,
    roundingStep: 5,
  },
  'bytedance/seedance-2': {
    rateKey: 'standard',
    creditMultiplier: 1.5,
    roundingStep: 10,
  },
  'bytedance/seedance-2-face': {
    rateKey: 'standard',
    creditMultiplier: 1.8,
    roundingStep: 10,
  },
} as const;

function parseNumericDuration(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed =
    typeof value === 'number' ? value : Number(String(value).trim());

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function normalizeSeedance2Resolution(value?: string | null) {
  return value === '720p' ? '720p' : '480p';
}

function hasSeedance2ImageInput(
  scene: VideoScene,
  options?: Seedance2VideoOptions | null
) {
  return Boolean(
    scene === 'image-to-video' ||
      options?.first_frame_url ||
      options?.last_frame_url ||
      options?.reference_image_urls?.length
  );
}

function getSeedance2ReferenceVideoDuration(
  options?: Seedance2VideoOptions | null
) {
  if (!Array.isArray(options?.reference_videos)) {
    return 0;
  }

  return options.reference_videos.reduce((total, video) => {
    if (!video) {
      return total;
    }

    const duration = parseNumericDuration(video.durationSeconds);
    return duration === null ? total : total + duration;
  }, 0);
}

function applySeedance2CreditMarkup({
  model,
  credits,
}: {
  model: keyof typeof SEEDANCE_2_PRICING_CONFIG;
  credits: number;
}) {
  const { creditMultiplier, roundingStep } = SEEDANCE_2_PRICING_CONFIG[model];
  return Math.ceil((credits * creditMultiplier) / roundingStep) * roundingStep;
}

export function calculateSeedance2Credits({
  model,
  scene,
  options,
}: {
  model: typeof SEEDANCE_2_PRICING_CONFIG extends Record<infer T, unknown>
    ? T
    : never;
  scene: VideoScene;
  options?: Seedance2VideoOptions | null;
}) {
  const pricingConfig = SEEDANCE_2_PRICING_CONFIG[model];
  const rateTable = SEEDANCE_2_RATE_TABLE[pricingConfig.rateKey];
  const resolution = normalizeSeedance2Resolution(options?.resolution);
  const outputDuration = parseNumericDuration(options?.duration) ?? 4;
  const inputVideoDuration = getSeedance2ReferenceVideoDuration(options);
  const hasVideoInput = inputVideoDuration > 0;
  const rate = hasVideoInput
    ? rateTable.withVideo[resolution]
    : rateTable.withoutVideo[resolution];

  const base = hasVideoInput
    ? (inputVideoDuration + outputDuration) * rate
    : outputDuration * rate;

  let addons = 0;
  if (hasSeedance2ImageInput(scene, options)) {
    addons += 20;
  }
  if (options?.generate_audio) {
    addons += 60;
  }

  const rawCredits = Math.ceil((base + addons) / 5) * 5;
  return applySeedance2CreditMarkup({
    model,
    credits: rawCredits,
  });
}

export function calculateSeedanceCredits({
  model,
  scene,
  options,
}: {
  model: SeedanceModel;
  scene: VideoScene;
  options?: Seedance15VideoOptions | Seedance2VideoOptions | null;
}) {
  if (isSeedance15Model(model)) {
    const legacyOptions = (options || {}) as Seedance15VideoOptions;

    return calculateVideoCredits({
      scene,
      duration:
        legacyOptions.duration === undefined
          ? undefined
          : String(legacyOptions.duration),
      resolution: legacyOptions.resolution,
      generateAudio: legacyOptions.generate_audio,
    });
  }

  if (isSeedance2GenerationModel(model)) {
    return calculateSeedance2Credits({
      model,
      scene,
      options: (options || {}) as Seedance2VideoOptions,
    });
  }

  throw new Error(`unsupported seedance model: ${model}`);
}
