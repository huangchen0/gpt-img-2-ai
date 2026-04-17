/**
 * Calculate video generation credits based on parameters
 * Used for both frontend preview and backend billing
 */

export type VideoScene = 'text-to-video' | 'image-to-video' | 'video-to-video';

export interface VideoCreditsParams {
  scene: VideoScene;
  duration?: string;
  resolution?: string;
  generateAudio?: boolean;
}

/**
 * Calculate the total credits cost for video generation
 *
 * Matrix pricing:
 * - 480p text(no audio): 4s=40, 8s=80, 12s=120
 * - 720p multiplier: x2
 * - 1080p multiplier: x4
 * - Image-to-Video premium: +20
 * - Generate Audio: +60 credits
 *
 * @param params Video generation parameters
 * @returns Total credits cost
 */
export function calculateVideoCredits(params: VideoCreditsParams): number {
  const { scene, duration, resolution, generateAudio } = params;

  // Keep legacy fallback for video-to-video (hidden in current UI).
  if (scene === 'video-to-video') {
    return generateAudio ? 70 : 10;
  }

  const durationBaseCredits: Record<string, number> = {
    '4': 40,
    '8': 80,
    '12': 120,
  };

  const resolutionMultipliers: Record<string, number> = {
    '480p': 1,
    '720p': 2,
    '1080p': 4,
  };

  const normalizedDuration = durationBaseCredits[duration || '']
    ? String(duration)
    : '8';
  const normalizedResolution = resolutionMultipliers[resolution || '']
    ? String(resolution)
    : '720p';

  let credits =
    durationBaseCredits[normalizedDuration] *
    resolutionMultipliers[normalizedResolution];

  if (scene === 'image-to-video') {
    credits += 20;
  }

  if (generateAudio === true) {
    credits += 60;
  }

  return credits;
}
