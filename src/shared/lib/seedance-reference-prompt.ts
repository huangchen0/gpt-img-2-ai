import {
  SeedanceAssetKind,
  SeedancePromptReferenceBinding,
  SeedanceTimedReferenceAsset,
} from '@/shared/lib/seedance-video';

const TOKEN_KIND_PREFIX: Record<SeedanceAssetKind, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
};

const PROMPT_REFERENCE_TOKEN_PATTERN = /@(?:Image|Video|Audio)\d+\b/g;

export function createSeedancePromptReferenceToken({
  kind,
  index,
}: {
  kind: SeedanceAssetKind;
  index: number;
}) {
  return `@${TOKEN_KIND_PREFIX[kind]}${index}`;
}

export function extractSeedancePromptReferenceTokens(prompt?: string | null) {
  if (!prompt) {
    return [];
  }

  const matches = prompt.match(PROMPT_REFERENCE_TOKEN_PATTERN);
  if (!matches) {
    return [];
  }

  return matches.filter(
    (token, index) => token && matches.indexOf(token) === index
  );
}

function isSeedancePromptReferenceTokenForKind({
  token,
  kind,
}: {
  token: string;
  kind: SeedanceAssetKind;
}) {
  return new RegExp(`^@${TOKEN_KIND_PREFIX[kind]}\\d+$`).test(token);
}

export function normalizeSeedancePromptReferenceBindings(value: unknown): {
  items: SeedancePromptReferenceBinding[];
  invalidCount: number;
} {
  if (!Array.isArray(value)) {
    return {
      items: [],
      invalidCount: 0,
    };
  }

  const items: SeedancePromptReferenceBinding[] = [];
  const seenTokens = new Set<string>();
  let invalidCount = 0;

  value.forEach((item) => {
    if (!item || typeof item !== 'object') {
      invalidCount += 1;
      return;
    }

    const record = item as Record<string, unknown>;
    const token = typeof record.token === 'string' ? record.token.trim() : '';
    const kind =
      record.kind === 'image' || record.kind === 'video' || record.kind === 'audio'
        ? record.kind
        : null;
    const target =
      typeof record.target === 'string' ? record.target.trim() : '';
    const label =
      typeof record.label === 'string' && record.label.trim()
        ? record.label.trim()
        : undefined;

    if (!token || !kind || !target) {
      invalidCount += 1;
      return;
    }

    if (
      !isSeedancePromptReferenceTokenForKind({
        token,
        kind,
      }) ||
      seenTokens.has(token)
    ) {
      invalidCount += 1;
      return;
    }

    seenTokens.add(token);
    items.push({
      token,
      kind,
      target,
      label,
    });
  });

  return {
    items,
    invalidCount,
  };
}

export function validateSeedancePromptReferenceTokens({
  prompt,
  bindings,
  allowTokens,
  availableTargets,
}: {
  prompt?: string | null;
  bindings: SeedancePromptReferenceBinding[];
  allowTokens: boolean;
  availableTargets: Iterable<string>;
}) {
  const tokens = extractSeedancePromptReferenceTokens(prompt);
  if (tokens.length === 0) {
    return null;
  }

  if (!allowTokens) {
    return 'prompt reference tokens are only supported in multimodal-reference mode';
  }

  const availableTargetSet = new Set(
    Array.from(availableTargets)
      .map((item) => item.trim())
      .filter(Boolean)
  );
  const bindingMap = new Map(bindings.map((item) => [item.token, item]));

  for (const token of tokens) {
    const binding = bindingMap.get(token);
    if (!binding) {
      return `invalid prompt reference token: ${token}`;
    }

    if (!availableTargetSet.has(binding.target)) {
      return `prompt reference token target is unavailable: ${token}`;
    }
  }

  return null;
}

type SeedancePromptReferenceSelection = {
  prompt: string;
  activeBindings: SeedancePromptReferenceBinding[];
  referenceImageUrls: string[];
  referenceVideos: SeedanceTimedReferenceAsset[];
  referenceAudios: SeedanceTimedReferenceAsset[];
  referenceIndexByToken: Map<string, number>;
};

function setIfMissing<T>(map: Map<string, T>, key: string, value: T) {
  if (!key || map.has(key)) {
    return;
  }

  map.set(key, value);
}

function indexTimedReferenceAssets(
  items: SeedanceTimedReferenceAsset[]
) {
  const byTarget = new Map<string, SeedanceTimedReferenceAsset>();

  items.forEach((item) => {
    const assetId = item.assetId?.trim() || '';
    const url = item.url?.trim() || '';

    setIfMissing(byTarget, assetId, item);
    setIfMissing(byTarget, url, item);
  });

  return byTarget;
}

export function resolveSeedancePromptReferenceSelection({
  prompt,
  bindings,
  referenceImageUrls,
  referenceVideos,
  referenceAudios,
}: {
  prompt?: string | null;
  bindings: SeedancePromptReferenceBinding[];
  referenceImageUrls?: string[] | null;
  referenceVideos?: SeedanceTimedReferenceAsset[] | null;
  referenceAudios?: SeedanceTimedReferenceAsset[] | null;
}): SeedancePromptReferenceSelection {
  const trimmedPrompt = prompt?.trim() ?? '';
  const referencedTokens = extractSeedancePromptReferenceTokens(trimmedPrompt);
  const normalizedReferenceImageUrls = Array.isArray(referenceImageUrls)
    ? referenceImageUrls.map((item) => item.trim()).filter(Boolean)
    : [];
  const normalizedReferenceVideos = Array.isArray(referenceVideos)
    ? referenceVideos.filter(Boolean)
    : [];
  const normalizedReferenceAudios = Array.isArray(referenceAudios)
    ? referenceAudios.filter(Boolean)
    : [];

  if (referencedTokens.length === 0) {
    return {
      prompt: trimmedPrompt,
      activeBindings: [],
      referenceImageUrls: normalizedReferenceImageUrls,
      referenceVideos: normalizedReferenceVideos,
      referenceAudios: normalizedReferenceAudios,
      referenceIndexByToken: new Map(),
    };
  }

  const bindingMap = new Map(bindings.map((item) => [item.token, item]));
  const referenceImageByTarget = new Map(
    normalizedReferenceImageUrls.map((item) => [item, item])
  );
  const referenceVideoByTarget = indexTimedReferenceAssets(
    normalizedReferenceVideos
  );
  const referenceAudioByTarget = indexTimedReferenceAssets(
    normalizedReferenceAudios
  );

  const activeBindings: SeedancePromptReferenceBinding[] = [];
  const selectedReferenceImageUrls: string[] = [];
  const selectedReferenceVideos: SeedanceTimedReferenceAsset[] = [];
  const selectedReferenceAudios: SeedanceTimedReferenceAsset[] = [];
  const selectedImageIndexByTarget = new Map<string, number>();
  const selectedVideoIndexByTarget = new Map<string, number>();
  const selectedAudioIndexByTarget = new Map<string, number>();
  const referenceIndexByToken = new Map<string, number>();

  referencedTokens.forEach((token) => {
    const binding = bindingMap.get(token);
    if (!binding) {
      return;
    }

    activeBindings.push(binding);

    if (binding.kind === 'image') {
      const target = referenceImageByTarget.get(binding.target);
      if (!target) {
        return;
      }

      if (!selectedImageIndexByTarget.has(target)) {
        selectedReferenceImageUrls.push(target);
        selectedImageIndexByTarget.set(target, selectedReferenceImageUrls.length);
      }

      referenceIndexByToken.set(
        token,
        selectedImageIndexByTarget.get(target) as number
      );
      return;
    }

    if (binding.kind === 'video') {
      const target = referenceVideoByTarget.get(binding.target);
      if (!target) {
        return;
      }

      const identity = target.assetId?.trim() || target.url.trim();
      if (!selectedVideoIndexByTarget.has(identity)) {
        selectedReferenceVideos.push(target);
        selectedVideoIndexByTarget.set(identity, selectedReferenceVideos.length);
      }

      referenceIndexByToken.set(
        token,
        selectedVideoIndexByTarget.get(identity) as number
      );
      return;
    }

    const target = referenceAudioByTarget.get(binding.target);
    if (!target) {
      return;
    }

    const identity = target.assetId?.trim() || target.url.trim();
    if (!selectedAudioIndexByTarget.has(identity)) {
      selectedReferenceAudios.push(target);
      selectedAudioIndexByTarget.set(identity, selectedReferenceAudios.length);
    }

    referenceIndexByToken.set(
      token,
      selectedAudioIndexByTarget.get(identity) as number
    );
  });

  return {
    prompt: renderSeedancePromptWithBindings({
      prompt: trimmedPrompt,
      bindings: activeBindings,
      referenceIndexByToken,
    }),
    activeBindings,
    referenceImageUrls: selectedReferenceImageUrls,
    referenceVideos: selectedReferenceVideos,
    referenceAudios: selectedReferenceAudios,
    referenceIndexByToken,
  };
}

export function renderSeedancePromptWithBindings({
  prompt,
  bindings,
  referenceIndexByToken,
}: {
  prompt: string;
  bindings: SeedancePromptReferenceBinding[];
  referenceIndexByToken?: ReadonlyMap<string, number>;
}) {
  const trimmedPrompt = prompt.trim();
  const referencedTokens = extractSeedancePromptReferenceTokens(trimmedPrompt);
  if (referencedTokens.length === 0) {
    return trimmedPrompt;
  }

  const referencedTokenSet = new Set(referencedTokens);
  const activeBindings = bindings.filter((item) => referencedTokenSet.has(item.token));

  if (activeBindings.length === 0) {
    return trimmedPrompt;
  }

  const kindCounters: Record<SeedanceAssetKind, number> = {
    image: 0,
    video: 0,
    audio: 0,
  };

  const bindingLines = activeBindings.map((binding) => {
    const referenceIndex = referenceIndexByToken?.get(binding.token);
    const referenceName = TOKEN_KIND_PREFIX[binding.kind].toLowerCase();

    if (referenceIndex === undefined) {
      kindCounters[binding.kind] += 1;
    }

    return `${binding.token} refers to ${referenceName} reference ${
      referenceIndex ?? kindCounters[binding.kind]
    } provided in this request.`;
  });

  return [
    'Reference bindings:',
    ...bindingLines,
    'When the prompt mentions a token, use the matching reference asset provided in this request.',
    '',
    'User prompt:',
    trimmedPrompt,
  ].join('\n');
}
