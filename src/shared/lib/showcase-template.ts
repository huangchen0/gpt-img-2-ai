type ShowcaseTemplateSource = {
  title?: string | null;
  description?: string | null;
  prompt?: string | null;
  promptPreview?: string | null;
  tags?: string[] | string | null;
};

const PROMPT_PREVIEW_MAX_LENGTH = 160;

function collapseWhitespace(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function normalizeTags(tags?: string[] | string | null) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => collapseWhitespace(tag)).filter(Boolean);
  }

  return collapseWhitespace(tags)
    .split(',')
    .map((tag) => collapseWhitespace(tag))
    .filter(Boolean);
}

function uniqueSegments(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = value.toLowerCase();

    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

export function buildShowcaseTemplatePrompt(source: ShowcaseTemplateSource) {
  const prompt = collapseWhitespace(source.prompt);

  if (prompt) {
    return prompt;
  }

  const segments = uniqueSegments(
    [
      collapseWhitespace(source.title),
      collapseWhitespace(source.description),
      normalizeTags(source.tags).length > 0
        ? `Tags: ${normalizeTags(source.tags).join(', ')}`
        : '',
    ].filter(Boolean)
  );

  return segments.join('. ').trim();
}

export function buildShowcasePromptPreview(source: ShowcaseTemplateSource) {
  const previewSource =
    collapseWhitespace(source.promptPreview) ||
    buildShowcaseTemplatePrompt(source);

  if (previewSource.length <= PROMPT_PREVIEW_MAX_LENGTH) {
    return previewSource;
  }

  const truncatedAtWord = previewSource
    .slice(0, PROMPT_PREVIEW_MAX_LENGTH)
    .replace(/\s+\S*$/g, '')
    .trim();

  return `${truncatedAtWord || previewSource.slice(0, PROMPT_PREVIEW_MAX_LENGTH).trim()}...`;
}
