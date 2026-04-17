import {
  isSeedance2FaceModel,
  isSeedance2GenerationModel,
  Seedance2VideoOptions,
} from '@/shared/lib/seedance-video';

export const SEEDANCE_PROVIDER_KIE = 'kie' as const;
export const SEEDANCE_PROVIDER_APIMART = 'apimart' as const;

export type SeedanceRuntimeProvider =
  | typeof SEEDANCE_PROVIDER_KIE
  | typeof SEEDANCE_PROVIDER_APIMART;

export function normalizeSeedanceProvider(
  value?: string | null
): SeedanceRuntimeProvider {
  return value === SEEDANCE_PROVIDER_APIMART
    ? SEEDANCE_PROVIDER_APIMART
    : SEEDANCE_PROVIDER_KIE;
}

export function resolveVideoGenerationProvider({
  requestedProvider,
  model,
  configs,
}: {
  requestedProvider: string;
  model?: string | null;
  configs?: Record<string, string | undefined> | null;
}) {
  if (isSeedance2FaceModel(model)) {
    return SEEDANCE_PROVIDER_APIMART;
  }

  if (isSeedance2GenerationModel(model)) {
    return normalizeSeedanceProvider(configs?.seedance_provider);
  }

  return requestedProvider;
}

export function isSeedanceReferenceAssetId(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) {
    return false;
  }

  return !/^https?:\/\//i.test(normalized);
}

export function hasSeedanceAssetReferences(
  options?: Seedance2VideoOptions | null
) {
  const hasReferenceImageAssetIds = Boolean(
    options?.reference_image_urls?.some((item) =>
      isSeedanceReferenceAssetId(item)
    )
  );
  const hasReferenceVideoAssetIds = Boolean(
    options?.reference_videos?.some(
      (item) =>
        isSeedanceReferenceAssetId(item.assetId) ||
        isSeedanceReferenceAssetId(item.url)
    )
  );
  const hasReferenceAudioAssetIds = Boolean(
    options?.reference_audios?.some(
      (item) =>
        isSeedanceReferenceAssetId(item.assetId) ||
        isSeedanceReferenceAssetId(item.url)
    )
  );

  return (
    hasReferenceImageAssetIds ||
    hasReferenceVideoAssetIds ||
    hasReferenceAudioAssetIds
  );
}
