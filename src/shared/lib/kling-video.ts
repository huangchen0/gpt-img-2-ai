export type KlingVideoQuality = 'std' | 'pro';
export type KlingGeneratorCreateMode = 'single-scene' | 'story-mode';

export interface KlingShotInput {
  title?: string;
  prompt: string;
  duration: number;
}

export interface KlingElementInput {
  name: string;
  description: string;
  image_urls?: string[];
  video_url?: string;
}

export interface KlingVideoOptions {
  image_urls?: string[];
  sound?: boolean;
  duration?: number | string;
  aspect_ratio?: string;
  mode?: KlingVideoQuality;
  multi_shots?: boolean;
  multi_prompt?: KlingShotInput[];
  kling_elements?: KlingElementInput[];
}

export interface KlingGeneratorPreset {
  createMode: KlingGeneratorCreateMode;
  prompt: string;
  duration: number;
  quality: KlingVideoQuality;
  sound: boolean;
  shots?: KlingShotInput[];
  elements?: Array<Pick<KlingElementInput, 'name' | 'description'>>;
}

export const KLING_VIDEO_MODEL = 'kling-3.0/video';
export const KLING_GENERATOR_PRESET_EVENT = 'kling-3:load-preset';
export const KLING_GENERATOR_PRESET_STORAGE_KEY = 'kling-3-generator-preset';
export const KLING_MIN_DURATION = 3;
export const KLING_MAX_DURATION = 15;
export const KLING_ASPECT_RATIO_OPTIONS = ['16:9', '9:16', '1:1'] as const;
export const KLING_MAX_REFERENCE_IMAGES = 2;
export const KLING_MAX_STORY_REFERENCE_IMAGES = 1;
export const KLING_MAX_ELEMENTS = 4;
export const KLING_IMAGE_ELEMENT_MIN_IMAGES = 2;
export const KLING_IMAGE_ELEMENT_MAX_IMAGES = 4;
export const KLING_STORY_SHOT_MIN_DURATION = 1;
export const KLING_STORY_SHOT_MAX_DURATION = 12;
export const KLING_VIDEO_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;
export const KLING_VIDEO_UPLOAD_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
] as const;
export const KLING_ELEMENT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const KLING_ELEMENT_IMAGE_MIN_DIMENSION = 300;
export const KLING_IMAGE_UPLOAD_INPUT_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;
export const KLING_ELEMENT_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const;
export const KLING_RATE_PER_SECOND = {
  std: {
    silent: 85,
    sound: 125,
  },
  pro: {
    silent: 115,
    sound: 170,
  },
} as const;

export function isKlingVideoModel(model: string | undefined | null) {
  return model === KLING_VIDEO_MODEL;
}

export function normalizeKlingElementToken(value: string | undefined | null) {
  const normalized = (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  return normalized || 'element';
}

export function parseKlingDuration(value: number | string | undefined | null) {
  if (value === undefined || value === null) {
    return null;
  }

  const parsed =
    typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

export function calculateKlingCredits({
  duration,
  mode,
  sound,
}: {
  duration?: number | string;
  mode?: KlingVideoQuality;
  sound?: boolean;
}) {
  const normalizedDuration = parseKlingDuration(duration) ?? KLING_MIN_DURATION;
  const normalizedMode = mode === 'pro' ? 'pro' : 'std';
  const rate = sound
    ? KLING_RATE_PER_SECOND[normalizedMode].sound
    : KLING_RATE_PER_SECOND[normalizedMode].silent;

  return normalizedDuration * rate;
}

function hasDuplicateNames(values: string[]) {
  const normalized = values
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return new Set(normalized).size !== normalized.length;
}

export function validateKlingVideoOptions({
  prompt,
  options,
}: {
  prompt?: string | null;
  options?: KlingVideoOptions | null;
}) {
  const errors: string[] = [];
  const normalizedPrompt = prompt?.trim() ?? '';
  const duration = parseKlingDuration(options?.duration);
  const mode = options?.mode;
  const referenceImages = Array.isArray(options?.image_urls)
    ? options?.image_urls.filter((url) => typeof url === 'string' && url.trim())
    : [];
  const isStoryMode = options?.multi_shots === true;
  const shots = Array.isArray(options?.multi_prompt)
    ? options.multi_prompt
    : [];
  const elements = Array.isArray(options?.kling_elements)
    ? options.kling_elements
    : [];
  const aspectRatio = options?.aspect_ratio?.trim() ?? '';

  if (!isStoryMode && !normalizedPrompt) {
    errors.push('prompt is required');
  }

  if (!mode || !['std', 'pro'].includes(mode)) {
    errors.push('invalid kling mode');
  }

  if (
    duration === null ||
    duration < KLING_MIN_DURATION ||
    duration > KLING_MAX_DURATION
  ) {
    errors.push('invalid kling duration');
  }

  if (!isStoryMode && referenceImages.length > KLING_MAX_REFERENCE_IMAGES) {
    errors.push('single scene supports up to 2 reference images');
  }

  if (
    isStoryMode &&
    referenceImages.length > KLING_MAX_STORY_REFERENCE_IMAGES
  ) {
    errors.push('story mode supports up to 1 reference image');
  }

  if (!referenceImages.length && !aspectRatio) {
    errors.push('aspect_ratio is required when no reference image is provided');
  } else if (
    aspectRatio &&
    !KLING_ASPECT_RATIO_OPTIONS.includes(
      aspectRatio as (typeof KLING_ASPECT_RATIO_OPTIONS)[number]
    )
  ) {
    errors.push('invalid kling aspect_ratio');
  }

  if (isStoryMode) {
    if (!shots.length) {
      errors.push('story mode requires at least one shot');
    }

    const totalDuration = shots.reduce((sum, shot, index) => {
      const shotPrompt = shot?.prompt?.trim() ?? '';
      const shotDuration = parseKlingDuration(shot?.duration);

      if (!shotPrompt) {
        errors.push(`shot ${index + 1} prompt is required`);
      }

      if (
        !shotDuration ||
        shotDuration < KLING_STORY_SHOT_MIN_DURATION ||
        shotDuration > KLING_STORY_SHOT_MAX_DURATION
      ) {
        errors.push(
          `shot ${index + 1} duration must be between ${KLING_STORY_SHOT_MIN_DURATION} and ${KLING_STORY_SHOT_MAX_DURATION} seconds`
        );
        return sum;
      }

      return sum + shotDuration;
    }, 0);

    if (duration !== null && totalDuration !== duration) {
      errors.push(
        'story mode duration must equal the sum of all shot durations'
      );
    }
  }

  if (elements.length > KLING_MAX_ELEMENTS) {
    errors.push(`kling elements support up to ${KLING_MAX_ELEMENTS} items`);
  }

  if (
    hasDuplicateNames(
      elements.map((element) => normalizeKlingElementToken(element?.name))
    )
  ) {
    errors.push('element names must be unique');
  }

  elements.forEach((element, index) => {
    const name = element?.name?.trim() ?? '';
    const description = element?.description?.trim() ?? '';
    const imageUrls = Array.isArray(element?.image_urls)
      ? element.image_urls.filter(
          (url) => typeof url === 'string' && url.trim()
        )
      : [];
    const videoUrl = element?.video_url?.trim() ?? '';

    if (!name) {
      errors.push(`element ${index + 1} name is required`);
    }

    if (!description) {
      errors.push(`element ${index + 1} description is required`);
    }

    if (imageUrls.length > 0 && videoUrl) {
      errors.push(`element ${index + 1} cannot contain both images and video`);
    }

    if (!imageUrls.length && !videoUrl) {
      errors.push(`element ${index + 1} requires images or a video`);
    }

    if (imageUrls.length > 0) {
      if (
        imageUrls.length < KLING_IMAGE_ELEMENT_MIN_IMAGES ||
        imageUrls.length > KLING_IMAGE_ELEMENT_MAX_IMAGES
      ) {
        errors.push(
          `element ${index + 1} image elements require 2 to 4 images`
        );
      }
    }
  });

  return errors;
}
