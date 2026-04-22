export const GPT_IMAGE_PROVIDER = 'kie';
export const GPT_IMAGE_TEXT_TO_IMAGE_MODEL = 'gpt-image-2-text-to-image';
export const GPT_IMAGE_IMAGE_TO_IMAGE_MODEL = 'gpt-image-2-image-to-image';
export const GPT_IMAGE_MAX_REFERENCE_IMAGES = 4;

export function isKieGptImageModel(model?: string | null) {
  return (
    model === GPT_IMAGE_TEXT_TO_IMAGE_MODEL ||
    model === GPT_IMAGE_IMAGE_TO_IMAGE_MODEL
  );
}

export function isKieGptImageToImageModel(model?: string | null) {
  return model === GPT_IMAGE_IMAGE_TO_IMAGE_MODEL;
}

export function getKieGptImageModelForScene(scene?: string | null) {
  return scene === 'image-to-image'
    ? GPT_IMAGE_IMAGE_TO_IMAGE_MODEL
    : GPT_IMAGE_TEXT_TO_IMAGE_MODEL;
}
