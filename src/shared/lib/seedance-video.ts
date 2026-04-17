export const SEEDANCE_PREFILL_PROMPT_KEY = 'seedance_prefill_prompt';
export const SEEDANCE_GENERATOR_PREFILL_EVENT = 'seedance-generator-prefill';

export const SEEDANCE_15_MODEL = 'bytedance/seedance-1.5-pro' as const;
export const SEEDANCE_2_MODEL = 'bytedance/seedance-2' as const;
export const SEEDANCE_2_FAST_MODEL = 'bytedance/seedance-2-fast' as const;
export const SEEDANCE_2_FACE_MODEL = 'bytedance/seedance-2-face' as const;
export const SEEDANCE_2_FAST_FACE_MODEL =
  'bytedance/seedance-2-fast-face' as const;
export const SEEDANCE_2_ASSET_MODEL = 'bytedance/seedance-2-asset' as const;
export const SEEDANCE_2_GENERATION_MODELS = [
  SEEDANCE_2_FAST_MODEL,
  SEEDANCE_2_MODEL,
  SEEDANCE_2_FAST_FACE_MODEL,
  SEEDANCE_2_FACE_MODEL,
] as const;

export const SEEDANCE_MODELS = [
  SEEDANCE_2_FAST_MODEL,
  SEEDANCE_2_MODEL,
  SEEDANCE_2_FAST_FACE_MODEL,
  SEEDANCE_2_FACE_MODEL,
  SEEDANCE_2_ASSET_MODEL,
  SEEDANCE_15_MODEL,
] as const;

export type SeedanceModel = (typeof SEEDANCE_MODELS)[number];
export type SeedanceFamily = 'seedance-1.5' | 'seedance-2';
export type Seedance15Scene = 'text-to-video' | 'image-to-video';
export type Seedance2Mode =
  | 'text'
  | 'first-frame'
  | 'first-last-frame'
  | 'multimodal-reference';
export type SeedanceGeneratorMode = Seedance15Scene | Seedance2Mode;
export type SeedanceAssetKind = 'image' | 'video' | 'audio';
export type SeedanceAssetStatus = 'idle' | 'processing' | 'active' | 'failed';

export const SEEDANCE_15_ALLOWED_DURATIONS = ['4', '8', '12'] as const;
export const SEEDANCE_15_ALLOWED_ASPECT_RATIOS = [
  '1:1',
  '4:3',
  '3:4',
  '16:9',
  '9:16',
  '21:9',
] as const;
export const SEEDANCE_2_ALLOWED_ASPECT_RATIOS = [
  ...SEEDANCE_15_ALLOWED_ASPECT_RATIOS,
  'adaptive',
] as const;
export const SEEDANCE_2_MIN_DURATION = 4;
export const SEEDANCE_2_MAX_DURATION = 15;

export const SEEDANCE_2_REFERENCE_IMAGE_MAX_ITEMS = 9;
export const SEEDANCE_2_REFERENCE_VIDEO_MAX_ITEMS = 3;
export const SEEDANCE_2_REFERENCE_AUDIO_MAX_ITEMS = 3;
export const SEEDANCE_2_REFERENCE_MAX_TOTAL_ITEMS = 12;
export const SEEDANCE_2_REFERENCE_VIDEO_MIN_DURATION = 2;
export const SEEDANCE_2_REFERENCE_VIDEO_MAX_DURATION = 15;
export const SEEDANCE_2_REFERENCE_AUDIO_MIN_DURATION = 2;
export const SEEDANCE_2_REFERENCE_AUDIO_MAX_DURATION = 15;
export const SEEDANCE_2_REFERENCE_VIDEO_MAX_TOTAL_DURATION = 15;
export const SEEDANCE_2_REFERENCE_AUDIO_MAX_TOTAL_DURATION = 15;
export const SEEDANCE_2_REFERENCE_VIDEO_MAX_PIXEL_COUNT = 927408;
export const SEEDANCE_2_APIMART_REFERENCE_VIDEO_MIN_RESOLUTION = 480;
export const SEEDANCE_2_APIMART_REFERENCE_VIDEO_MAX_RESOLUTION = 720;

export const SEEDANCE_2_REFERENCE_VIDEO_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
export const SEEDANCE_2_REFERENCE_VIDEO_UPLOAD_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
] as const;
export const SEEDANCE_2_REFERENCE_AUDIO_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;
export const SEEDANCE_2_REFERENCE_AUDIO_UPLOAD_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
] as const;

export interface SeedanceTimedReferenceAsset {
  url: string;
  durationSeconds: number;
  width?: number;
  height?: number;
  name?: string;
  metadataToken?: string;
  assetId?: string;
  promptAlias?: string;
}

export interface SeedanceReferenceImageAsset {
  url: string;
  assetId?: string;
  promptAlias?: string;
}

export interface SeedancePromptReferenceBinding {
  token: string;
  kind: SeedanceAssetKind;
  target: string;
  label?: string;
}

export interface Seedance15VideoOptions {
  image_input?: string[];
  aspect_ratio?: string;
  resolution?: string;
  duration?: string | number;
  fixed_lens?: boolean;
  generate_audio?: boolean;
}

export interface Seedance2VideoOptions {
  seedance_mode?: Seedance2Mode;
  first_frame_url?: string;
  last_frame_url?: string;
  reference_image_urls?: string[];
  reference_videos?: SeedanceTimedReferenceAsset[];
  reference_audios?: SeedanceTimedReferenceAsset[];
  seed?: number;
  return_last_frame?: boolean;
  generate_audio?: boolean;
  resolution?: string;
  aspect_ratio?: string;
  duration?: string | number;
  web_search?: boolean;
  prompt_reference_bindings?: SeedancePromptReferenceBinding[];
}

export type SeedanceGeneratorPrefillDetail = {
  prompt: string;
  model?: SeedanceModel;
  mode?: SeedanceGeneratorMode;
  aspectRatio?: string;
  duration?: string | number;
  resolution?: string;
  audio?: boolean;
};

function isSeedance15Scene(
  value: string | undefined
): value is Seedance15Scene {
  return value === 'text-to-video' || value === 'image-to-video';
}

export function isSeedance2Mode(
  value: string | undefined
): value is Seedance2Mode {
  return (
    value === 'text' ||
    value === 'first-frame' ||
    value === 'first-last-frame' ||
    value === 'multimodal-reference'
  );
}

function isSeedanceGeneratorMode(
  value: string | undefined
): value is SeedanceGeneratorMode {
  return isSeedance15Scene(value) || isSeedance2Mode(value);
}

export function isSeedance15Model(
  model: string | undefined | null
): model is typeof SEEDANCE_15_MODEL {
  return model === SEEDANCE_15_MODEL;
}

export function isSeedance2Model(
  model: string | undefined | null
): model is
  | typeof SEEDANCE_2_MODEL
  | typeof SEEDANCE_2_FAST_MODEL
  | typeof SEEDANCE_2_FACE_MODEL
  | typeof SEEDANCE_2_FAST_FACE_MODEL
  | typeof SEEDANCE_2_ASSET_MODEL {
  return (
    model === SEEDANCE_2_MODEL ||
    model === SEEDANCE_2_FAST_MODEL ||
    model === SEEDANCE_2_FACE_MODEL ||
    model === SEEDANCE_2_FAST_FACE_MODEL ||
    model === SEEDANCE_2_ASSET_MODEL
  );
}

export function isSeedance2GenerationModel(
  model: string | undefined | null
): model is (typeof SEEDANCE_2_GENERATION_MODELS)[number] {
  return (
    model === SEEDANCE_2_MODEL ||
    model === SEEDANCE_2_FAST_MODEL ||
    model === SEEDANCE_2_FACE_MODEL ||
    model === SEEDANCE_2_FAST_FACE_MODEL
  );
}

export function isSeedance2AssetModel(
  model: string | undefined | null
): model is typeof SEEDANCE_2_ASSET_MODEL {
  return model === SEEDANCE_2_ASSET_MODEL;
}

export function isSeedance2FaceModel(
  model: string | undefined | null
): model is typeof SEEDANCE_2_FACE_MODEL | typeof SEEDANCE_2_FAST_FACE_MODEL {
  return (
    model === SEEDANCE_2_FACE_MODEL || model === SEEDANCE_2_FAST_FACE_MODEL
  );
}

export function getSeedance2BaseGenerationModel(
  model: string | undefined | null
): typeof SEEDANCE_2_MODEL | typeof SEEDANCE_2_FAST_MODEL | null {
  if (model === SEEDANCE_2_MODEL || model === SEEDANCE_2_FACE_MODEL) {
    return SEEDANCE_2_MODEL;
  }

  if (model === SEEDANCE_2_FAST_MODEL || model === SEEDANCE_2_FAST_FACE_MODEL) {
    return SEEDANCE_2_FAST_MODEL;
  }

  return null;
}

export function toSeedance2FaceModel(
  model: string | undefined | null
): typeof SEEDANCE_2_FACE_MODEL | typeof SEEDANCE_2_FAST_FACE_MODEL | null {
  if (model === SEEDANCE_2_MODEL || model === SEEDANCE_2_FACE_MODEL) {
    return SEEDANCE_2_FACE_MODEL;
  }

  if (model === SEEDANCE_2_FAST_MODEL || model === SEEDANCE_2_FAST_FACE_MODEL) {
    return SEEDANCE_2_FAST_FACE_MODEL;
  }

  return null;
}

export function getSeedanceFamily(
  model: string | undefined | null
): SeedanceFamily | null {
  if (isSeedance15Model(model)) {
    return 'seedance-1.5';
  }

  if (isSeedance2Model(model)) {
    return 'seedance-2';
  }

  return null;
}

export function getSeedance2CanonicalScene({
  mode,
  hasReferenceImages,
}: {
  mode?: string | null;
  hasReferenceImages?: boolean;
}): Seedance15Scene {
  if (mode === 'text') {
    return 'text-to-video';
  }

  if (mode === 'multimodal-reference' && !hasReferenceImages) {
    return 'text-to-video';
  }

  return 'image-to-video';
}

export function normalizeSeedanceAspectRatio(
  value?: string | null,
  model?: string | null
) {
  if (!value) {
    return undefined;
  }

  const ratios = isSeedance2Model(model)
    ? SEEDANCE_2_ALLOWED_ASPECT_RATIOS
    : SEEDANCE_15_ALLOWED_ASPECT_RATIOS;

  return ratios.find((ratio) => ratio === value);
}

export function normalizeSeedance15Duration(value?: string | number | null) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed =
    typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  const supportedDurations = SEEDANCE_15_ALLOWED_DURATIONS.map(Number);

  const closest = supportedDurations.reduce((best, current) => {
    const currentDistance = Math.abs(current - parsed);
    const bestDistance = Math.abs(best - parsed);

    if (currentDistance < bestDistance) {
      return current;
    }

    if (currentDistance === bestDistance) {
      return current < best ? current : best;
    }

    return best;
  });

  return String(closest) as (typeof SEEDANCE_15_ALLOWED_DURATIONS)[number];
}

export function normalizeSeedance2Duration(value?: string | number | null) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed =
    typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.min(
    SEEDANCE_2_MAX_DURATION,
    Math.max(SEEDANCE_2_MIN_DURATION, Math.round(parsed))
  );
}

export function getSeedanceReferenceVideoPixelCount({
  width,
  height,
}: {
  width?: number;
  height?: number;
}) {
  if (
    typeof width !== 'number' ||
    !Number.isFinite(width) ||
    width <= 0 ||
    typeof height !== 'number' ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    return null;
  }

  return Math.round(width) * Math.round(height);
}

export function exceedsSeedanceReferenceVideoPixelCount({
  width,
  height,
}: {
  width?: number;
  height?: number;
}) {
  const pixelCount = getSeedanceReferenceVideoPixelCount({
    width,
    height,
  });

  return (
    pixelCount !== null &&
    pixelCount > SEEDANCE_2_REFERENCE_VIDEO_MAX_PIXEL_COUNT
  );
}

export function getSeedanceReferenceVideoPixelLimitMessage({
  name,
  width,
  height,
}: {
  name?: string;
  width?: number;
  height?: number;
}) {
  const label = name?.trim() || 'Reference video';
  const pixelCount = getSeedanceReferenceVideoPixelCount({
    width,
    height,
  });

  if (
    typeof width !== 'number' ||
    !Number.isFinite(width) ||
    width <= 0 ||
    typeof height !== 'number' ||
    !Number.isFinite(height) ||
    height <= 0 ||
    pixelCount === null
  ) {
    return `${label} exceeds the supported limit. Please upload a 480P-720P reference video and keep total pixels within ${SEEDANCE_2_REFERENCE_VIDEO_MAX_PIXEL_COUNT} (width x height), for example 1280x720.`;
  }

  return `${label} is ${Math.round(width)}x${Math.round(height)} (${pixelCount} pixels). Please upload a 480P-720P reference video and keep total pixels within ${SEEDANCE_2_REFERENCE_VIDEO_MAX_PIXEL_COUNT} (width x height), for example 1280x720.`;
}

export function normalizeSeedanceDuration(
  value?: string | number | null,
  model?: string | null
) {
  if (isSeedance2Model(model)) {
    const normalized = normalizeSeedance2Duration(value);
    return normalized === undefined ? undefined : String(normalized);
  }

  return normalizeSeedance15Duration(value);
}

export function normalizeSeedanceGeneratorPrefill(
  detail: SeedanceGeneratorPrefillDetail | string
) {
  const rawDetail =
    typeof detail === 'string'
      ? {
          prompt: detail,
        }
      : detail;

  const trimmedPrompt = rawDetail.prompt?.trim();
  if (!trimmedPrompt) {
    return null;
  }

  const normalized: SeedanceGeneratorPrefillDetail = {
    prompt: trimmedPrompt,
  };

  if (rawDetail.model && SEEDANCE_MODELS.includes(rawDetail.model)) {
    normalized.model = rawDetail.model;
  }

  if (isSeedanceGeneratorMode(rawDetail.mode)) {
    normalized.mode = rawDetail.mode;
  }

  const aspectRatio = normalizeSeedanceAspectRatio(
    rawDetail.aspectRatio,
    normalized.model
  );
  if (aspectRatio) {
    normalized.aspectRatio = aspectRatio;
  }

  const duration = normalizeSeedanceDuration(
    rawDetail.duration,
    normalized.model
  );
  if (duration) {
    normalized.duration = duration;
  }

  if (
    rawDetail.resolution === '480p' ||
    rawDetail.resolution === '720p' ||
    rawDetail.resolution === '1080p'
  ) {
    normalized.resolution = rawDetail.resolution;
  }

  if (typeof rawDetail.audio === 'boolean') {
    normalized.audio = rawDetail.audio;
  }

  return normalized;
}

export function parseSeedanceGeneratorPrefill(rawValue: string | null) {
  if (!rawValue) {
    return null;
  }

  try {
    return normalizeSeedanceGeneratorPrefill(JSON.parse(rawValue));
  } catch {
    return normalizeSeedanceGeneratorPrefill(rawValue);
  }
}

export function dispatchSeedanceGeneratorPrefill(
  detail: SeedanceGeneratorPrefillDetail | string
) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedDetail = normalizeSeedanceGeneratorPrefill(detail);
  if (!normalizedDetail) {
    return;
  }

  window.sessionStorage.setItem(
    SEEDANCE_PREFILL_PROMPT_KEY,
    JSON.stringify(normalizedDetail)
  );
  window.dispatchEvent(
    new CustomEvent<SeedanceGeneratorPrefillDetail>(
      SEEDANCE_GENERATOR_PREFILL_EVENT,
      {
        detail: normalizedDetail,
      }
    )
  );
}
