export const GPT_IMAGE_PROVIDER_KIE = 'kie';
export const GPT_IMAGE_PROVIDER_APIMART = 'apimart';
export const GPT_IMAGE_PROVIDER = GPT_IMAGE_PROVIDER_APIMART;
export const GPT_IMAGE_TEXT_TO_IMAGE_MODEL = 'gpt-image-2-text-to-image';
export const GPT_IMAGE_IMAGE_TO_IMAGE_MODEL = 'gpt-image-2-image-to-image';
export const GPT_IMAGE_APIMART_MODEL = 'gpt-image-2';
export const GPT_IMAGE_KIE_MAX_REFERENCE_IMAGES = 4;
export const GPT_IMAGE_APIMART_MAX_REFERENCE_IMAGES = 16;
export const GPT_IMAGE_MAX_REFERENCE_IMAGES =
  GPT_IMAGE_APIMART_MAX_REFERENCE_IMAGES;

export type GptImageRuntimeProvider =
  | typeof GPT_IMAGE_PROVIDER_KIE
  | typeof GPT_IMAGE_PROVIDER_APIMART;

export function normalizeGptImageProvider(
  value?: string | null
): GptImageRuntimeProvider | null {
  if (value === GPT_IMAGE_PROVIDER_APIMART) {
    return GPT_IMAGE_PROVIDER_APIMART;
  }

  if (value === GPT_IMAGE_PROVIDER_KIE) {
    return GPT_IMAGE_PROVIDER_KIE;
  }

  return null;
}

export function resolveGptImageProvider({
  requestedProvider,
  configs,
  availableProviders,
}: {
  requestedProvider?: string | null;
  configs?: Record<string, string | undefined> | null;
  availableProviders?: string[] | null;
} = {}): GptImageRuntimeProvider {
  const configuredProvider = normalizeGptImageProvider(
    configs?.gpt_image_2_provider
  );
  const requestedRuntimeProvider = normalizeGptImageProvider(requestedProvider);
  const hasApimart =
    Boolean(configs?.apimart_api_key) ||
    Boolean(availableProviders?.includes(GPT_IMAGE_PROVIDER_APIMART));
  const hasKie =
    Boolean(configs?.kie_api_key) ||
    Boolean(availableProviders?.includes(GPT_IMAGE_PROVIDER_KIE));

  if (configuredProvider === GPT_IMAGE_PROVIDER_KIE) {
    return GPT_IMAGE_PROVIDER_KIE;
  }

  if (hasApimart) {
    return GPT_IMAGE_PROVIDER_APIMART;
  }

  if (hasKie) {
    return GPT_IMAGE_PROVIDER_KIE;
  }

  if (requestedRuntimeProvider) {
    return requestedRuntimeProvider;
  }

  return GPT_IMAGE_PROVIDER_APIMART;
}

export function isKieGptImageModel(model?: string | null) {
  return (
    model === GPT_IMAGE_TEXT_TO_IMAGE_MODEL ||
    model === GPT_IMAGE_IMAGE_TO_IMAGE_MODEL
  );
}

export function isApimartGptImageModel(model?: string | null) {
  return model === GPT_IMAGE_APIMART_MODEL;
}

export function isAnyGptImageModel(model?: string | null) {
  return isKieGptImageModel(model) || isApimartGptImageModel(model);
}

export function isKieGptImageToImageModel(model?: string | null) {
  return model === GPT_IMAGE_IMAGE_TO_IMAGE_MODEL;
}

export function getKieGptImageModelForScene(scene?: string | null) {
  return scene === 'image-to-image'
    ? GPT_IMAGE_IMAGE_TO_IMAGE_MODEL
    : GPT_IMAGE_TEXT_TO_IMAGE_MODEL;
}

export function getGptImageModelForScene({
  provider,
  scene,
}: {
  provider: GptImageRuntimeProvider;
  scene?: string | null;
}) {
  if (provider === GPT_IMAGE_PROVIDER_APIMART) {
    return GPT_IMAGE_APIMART_MODEL;
  }

  return getKieGptImageModelForScene(scene);
}

export function getGptImageMaxReferenceImages(provider?: string | null) {
  return provider === GPT_IMAGE_PROVIDER_APIMART
    ? GPT_IMAGE_APIMART_MAX_REFERENCE_IMAGES
    : GPT_IMAGE_KIE_MAX_REFERENCE_IMAGES;
}
