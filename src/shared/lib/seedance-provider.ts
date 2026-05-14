import {
  isSeedance2FaceModel,
  isSeedance2GenerationModel,
  Seedance2VideoOptions,
} from '@/shared/lib/seedance-video';

export const SEEDANCE_PROVIDER_KIE = 'kie' as const;
export const SEEDANCE_PROVIDER_APIMART = 'apimart' as const;
export const SEEDANCE_2_PROVIDER_STRATEGY_KIE_WITH_APIMART_FACE =
  'kie_with_apimart_face' as const;
export const SEEDANCE_2_PROVIDER_STRATEGY_APIMART_ALL = 'apimart_all' as const;

export type SeedanceRuntimeProvider =
  | typeof SEEDANCE_PROVIDER_KIE
  | typeof SEEDANCE_PROVIDER_APIMART;
export type Seedance2ProviderStrategy =
  | typeof SEEDANCE_2_PROVIDER_STRATEGY_KIE_WITH_APIMART_FACE
  | typeof SEEDANCE_2_PROVIDER_STRATEGY_APIMART_ALL;

export function normalizeSeedanceProvider(
  value?: string | null
): SeedanceRuntimeProvider {
  return value === SEEDANCE_PROVIDER_APIMART
    ? SEEDANCE_PROVIDER_APIMART
    : SEEDANCE_PROVIDER_KIE;
}

export function normalizeSeedance2ProviderStrategy(
  value?: string | null
): Seedance2ProviderStrategy {
  return value === SEEDANCE_2_PROVIDER_STRATEGY_APIMART_ALL ||
    value === SEEDANCE_PROVIDER_APIMART
    ? SEEDANCE_2_PROVIDER_STRATEGY_APIMART_ALL
    : SEEDANCE_2_PROVIDER_STRATEGY_KIE_WITH_APIMART_FACE;
}

export function shouldUseApimartForSeedance2({
  model,
  configs,
}: {
  model?: string | null;
  configs?: Record<string, string | undefined> | null;
}) {
  if (isSeedance2FaceModel(model)) {
    return true;
  }

  if (!isSeedance2GenerationModel(model)) {
    return false;
  }

  return (
    normalizeSeedance2ProviderStrategy(
      configs?.seedance_2_provider_strategy
    ) === SEEDANCE_2_PROVIDER_STRATEGY_APIMART_ALL
  );
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
  if (shouldUseApimartForSeedance2({ model, configs })) {
    return SEEDANCE_PROVIDER_APIMART;
  }

  if (isSeedance2GenerationModel(model)) {
    return SEEDANCE_PROVIDER_KIE;
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
