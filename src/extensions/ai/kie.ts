import { nanoid } from 'nanoid';

import { getUuid } from '@/shared/lib/hash';
import {
  isKlingVideoModel,
  KLING_VIDEO_MODEL,
  KlingElementInput,
  KlingShotInput,
  KlingVideoOptions,
  normalizeKlingElementToken,
  parseKlingDuration,
} from '@/shared/lib/kling-video';
import {
  isSeedance2AssetModel,
  isSeedance2FaceModel,
  isSeedance2GenerationModel,
  isSeedance15Model,
  Seedance2VideoOptions,
  Seedance15VideoOptions,
  SeedanceAssetKind,
  SeedanceTimedReferenceAsset,
} from '@/shared/lib/seedance-video';

import { saveFiles } from '.';
import {
  AIConfigs,
  AIFile,
  AIGenerateParams,
  AIImage,
  AIMediaType,
  AIProvider,
  AISong,
  AITaskResult,
  AITaskStatus,
  AIVideo,
} from './types';

const VIDEO_URL_KEYS = [
  'video',
  'videoUrl',
  'video_url',
  'videos',
  'videoUrls',
  'video_urls',
  'resultUrls',
];
const IMAGE_URL_KEYS = [
  'image',
  'imageUrl',
  'image_url',
  'images',
  'imageUrls',
  'image_urls',
  'lastFrameUrl',
  'last_frame_url',
  'lastFrameUrls',
  'last_frame_urls',
];

function unwrapKiePayloadOrThrow(payload: any, fallbackMessage: string) {
  if (typeof payload?.code === 'number' && payload.code !== 200) {
    throw new Error(
      typeof payload?.msg === 'string' && payload.msg.trim()
        ? payload.msg.trim()
        : fallbackMessage
    );
  }

  return payload?.data ?? payload;
}

function collectNestedResponseRecords(source: unknown) {
  const records: Record<string, unknown>[] = [];
  const visited = new WeakSet<object>();

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const record = getRecord(value);
    if (!record || visited.has(record)) {
      return;
    }

    visited.add(record);
    records.push(record);

    Object.values(record).forEach(visit);
  };

  visit(source);

  return records;
}

function findFirstRecordStringValue(
  records: Record<string, unknown>[],
  keys: string[]
) {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }
  }

  return '';
}

function extractSeedanceAssetResponseFields(source: unknown) {
  const records = collectNestedResponseRecords(source);

  return {
    assetId: findFirstRecordStringValue(records, ['assetId', 'asset_id', 'id']),
    status: findFirstRecordStringValue(records, [
      'status',
      'state',
      'assetStatus',
      'asset_status',
    ]),
    url: findFirstRecordStringValue(records, ['url', 'assetUrl', 'asset_url']),
    errorMessage: findFirstRecordStringValue(records, [
      'errorMsg',
      'errorMessage',
      'failMsg',
      'failMessage',
    ]),
  };
}

function logSeedanceAssetDebug(
  stage: string,
  details: Record<string, unknown>
) {
  console.info('[seedance-asset-debug]', stage, details);
}

function normalizeSeedanceAssetProviderStatus(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (
    normalized === 'active' ||
    normalized === 'ready' ||
    normalized === 'success' ||
    normalized === 'succeeded' ||
    normalized === 'completed' ||
    normalized === 'complete'
  ) {
    return 'Active';
  }

  if (
    normalized === 'failed' ||
    normalized === 'fail' ||
    normalized === 'error'
  ) {
    return 'Failed';
  }

  if (
    normalized === 'processing' ||
    normalized === 'pending' ||
    normalized === 'queued' ||
    normalized === 'running' ||
    normalized === 'created' ||
    normalized === 'creating' ||
    normalized === 'in_progress' ||
    normalized === 'in-progress'
  ) {
    return 'Processing';
  }

  return null;
}

function pushUniqueUrl(target: string[], value: string) {
  if (!target.includes(value)) {
    target.push(value);
  }
}

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function extractExplicitUrlValues(value: unknown, nestedKeys: string[]) {
  const urls: string[] = [];

  const visit = (item: unknown) => {
    if (!item) {
      return;
    }

    if (typeof item === 'string') {
      const normalized = item.trim();
      if (normalized) {
        pushUniqueUrl(urls, normalized);
      }
      return;
    }

    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }

    const record = getRecord(item);
    if (!record) {
      return;
    }

    nestedKeys.forEach((key) => {
      if (key in record) {
        visit(record[key]);
      }
    });
  };

  visit(value);
  return urls;
}

function getResultContainers(resultJson: unknown) {
  const containers: Record<string, unknown>[] = [];
  const visited = new WeakSet<object>();

  const visit = (value: unknown) => {
    const record = getRecord(value);
    if (!record || visited.has(record)) {
      return;
    }

    visited.add(record);
    containers.push(record);

    ['output', 'data', 'result', 'response'].forEach((key) => {
      visit(record[key]);
    });

    if (Array.isArray(record.outputs)) {
      record.outputs.forEach(visit);
    }
  };

  visit(resultJson);

  return containers;
}

function collectUrlsFromContainers(
  containers: Record<string, unknown>[],
  keys: string[],
  nestedKeys: string[]
) {
  const urls: string[] = [];

  containers.forEach((container) => {
    keys.forEach((key) => {
      if (!(key in container)) {
        return;
      }

      extractExplicitUrlValues(container[key], nestedKeys).forEach((url) => {
        pushUniqueUrl(urls, url);
      });
    });
  });

  return urls;
}

function extractVideoUrlsFromResultJson(resultJson: unknown) {
  const containers = getResultContainers(resultJson);

  const structuredUrls = collectUrlsFromContainers(
    containers,
    ['videos'],
    ['videoUrl', 'video_url', 'url', 'uri', 'src']
  );
  if (structuredUrls.length > 0) {
    return structuredUrls;
  }

  return collectUrlsFromContainers(containers, VIDEO_URL_KEYS, [
    'videoUrl',
    'video_url',
    'url',
    'uri',
    'src',
  ]);
}

function extractImageUrlsFromResultJson(
  resultJson: unknown,
  { includeResultUrls = false }: { includeResultUrls?: boolean } = {}
) {
  const containers = getResultContainers(resultJson);
  const imageKeys = includeResultUrls
    ? [...IMAGE_URL_KEYS, 'resultUrls']
    : IMAGE_URL_KEYS;

  const structuredUrls = collectUrlsFromContainers(
    containers,
    ['images'],
    ['imageUrl', 'image_url', 'url', 'uri', 'src']
  );
  if (structuredUrls.length > 0) {
    return structuredUrls;
  }

  return collectUrlsFromContainers(containers, imageKeys, [
    'imageUrl',
    'image_url',
    'url',
    'uri',
    'src',
  ]);
}

function normalizeSeedanceReferenceUrls(
  value: SeedanceTimedReferenceAsset[] | string[] | undefined
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }

      if (item && typeof item === 'object') {
        if (typeof item.assetId === 'string' && item.assetId.trim()) {
          return item.assetId.trim();
        }

        if (typeof item.url === 'string') {
          return item.url.trim();
        }
      }

      return '';
    })
    .filter(Boolean);
}

/**
 * Kie configs
 * @docs https://kie.ai/
 */
export interface KieConfigs extends AIConfigs {
  apiKey: string;
  customStorage?: boolean; // use custom storage to save files
}

/**
 * Kie provider
 * @docs https://kie.ai/
 */
export class KieProvider implements AIProvider {
  // provider name
  readonly name = 'kie';
  // provider configs
  configs: KieConfigs;

  // api base url
  private baseUrl = 'https://api.kie.ai/api/v1';

  // init provider
  constructor(configs: KieConfigs) {
    this.configs = configs;
  }

  async createSeedanceAsset({
    kind,
    url,
  }: {
    kind: SeedanceAssetKind;
    url: string;
  }) {
    const apiUrl = `${this.baseUrl}/playground/createAsset`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    const assetType =
      kind === 'image' ? 'Image' : kind === 'video' ? 'Video' : 'Audio';

    logSeedanceAssetDebug('create.request', {
      assetType,
      kind,
      url,
    });

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        assetType,
        url,
      }),
    });

    if (!resp.ok) {
      logSeedanceAssetDebug('create.http_error', {
        assetType,
        kind,
        url,
        status: resp.status,
      });
      throw new Error(`create asset failed with status: ${resp.status}`);
    }

    const payload = await resp.json();
    const data = unwrapKiePayloadOrThrow(payload, 'create asset failed');
    const { assetId, status } = extractSeedanceAssetResponseFields(data);

    logSeedanceAssetDebug('create.response', {
      assetType,
      kind,
      url,
      payload,
      data,
      extracted: {
        assetId,
        status,
      },
    });

    if (!assetId) {
      throw new Error('create asset failed: no assetId in response');
    }

    return {
      assetId,
      status: normalizeSeedanceAssetProviderStatus(status) ?? 'Processing',
    };
  }

  async getSeedanceAsset({ assetId }: { assetId: string }) {
    const apiUrl = `${this.baseUrl}/playground/getAsset?assetId=${encodeURIComponent(assetId)}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });

    if (!resp.ok) {
      logSeedanceAssetDebug('query.http_error', {
        assetId,
        status: resp.status,
      });
      throw new Error(`query asset failed with status: ${resp.status}`);
    }

    const payload = await resp.json();
    const data = unwrapKiePayloadOrThrow(payload, 'query asset failed');
    const {
      assetId: resolvedAssetId,
      status: rawStatus,
      url,
      errorMessage,
    } = extractSeedanceAssetResponseFields(data);
    const status = normalizeSeedanceAssetProviderStatus(rawStatus);

    logSeedanceAssetDebug('query.response', {
      requestedAssetId: assetId,
      payload,
      data,
      extracted: {
        assetId: resolvedAssetId,
        status: rawStatus,
        url,
        errorMessage,
      },
    });

    if (!status) {
      throw new Error(errorMessage || 'query asset failed: invalid response');
    }

    return {
      assetId: resolvedAssetId || assetId,
      status,
      url: url || undefined,
      errorMessage,
    };
  }

  async generateMusic({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/generate`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    // todo: check model
    if (!params.model) {
      params.model = 'V5';
    }

    // build request params
    let payload: any = {
      prompt: params.prompt,
      model: params.model,
      callBackUrl: params.callbackUrl,
    };

    if (params.options && params.options.customMode) {
      // custom mode
      payload.customMode = true;
      payload.title = params.options.title;
      payload.style = params.options.style;
      payload.instrumental = params.options.instrumental;
      if (!params.options.instrumental) {
        // not instrumental, lyrics is used as prompt
        payload.prompt = params.options.lyrics;
      }
    } else {
      // not custom mode
      payload.customMode = false;
      payload.prompt = params.prompt;
      payload.instrumental = params.options?.instrumental;
    }

    // const params = {
    //   customMode: false,
    //   instrumental: false,
    //   style: "",
    //   title: "",
    //   prompt: prompt || "",
    //   model: model || "V4_5",
    //   callBackUrl,
    //   negativeTags: "",
    //   vocalGender: "m", // m or f
    //   styleWeight: 0.65,
    //   weirdnessConstraint: 0.65,
    //   audioWeight: 0.65,
    // };

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(`generate music failed: ${msg}`);
    }

    if (!data || !data.taskId) {
      throw new Error(`generate music failed: no taskId`);
    }

    return {
      taskStatus: AITaskStatus.PENDING,
      taskId: data.taskId,
      taskInfo: {},
      taskResult: data,
    };
  }

  async generateImage({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/jobs/createTask`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    if (!params.model) {
      throw new Error('model is required');
    }

    if (!params.prompt) {
      throw new Error('prompt is required');
    }

    // build request params
    let payload: any = {
      model: params.model,
      callBackUrl: params.callbackUrl,
      input: {
        prompt: params.prompt,
      },
    };

    if (params.options) {
      const options = params.options;
      if (options.image_input && Array.isArray(options.image_input)) {
        payload.input.image_input = options.image_input;
      }
      if (options.aspect_ratio) {
        payload.input.aspect_ratio = options.aspect_ratio;
      }
      if (options.resolution) {
        payload.input.resolution = options.resolution;
      }
      if (options.output_format) {
        payload.input.output_format = options.output_format;
      }
      if (options.google_search) {
        payload.input.google_search = true;
      }
    }

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(`generate image failed: ${msg}`);
    }

    if (!data || !data.taskId) {
      throw new Error(`generate image failed: no taskId`);
    }

    return {
      taskStatus: AITaskStatus.PENDING,
      taskId: data.taskId,
      taskInfo: {},
      taskResult: data,
    };
  }

  async generateSeedance15Video({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/jobs/createTask`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    if (!params.model) {
      throw new Error('model is required');
    }

    if (!params.prompt) {
      throw new Error('prompt is required');
    }

    // Validate prompt length (3-2500 characters per Seedance 1.5 spec)
    const promptLength = params.prompt.trim().length;
    if (promptLength < 3 || promptLength > 2500) {
      throw new Error('prompt must be between 3 and 2500 characters');
    }

    // Build request for Bytedance Seedance 1.5 Pro
    let payload: any = {
      model: params.model,
      callBackUrl: params.callbackUrl,
      input: {
        prompt: params.prompt,
        aspect_ratio: '16:9', // default
        duration: '4', // default 4s
      },
    };

    if (params.options) {
      const options = params.options as Seedance15VideoOptions;

      // input_urls (0-2 images for image-to-video)
      if (options.image_input && Array.isArray(options.image_input)) {
        payload.input.input_urls = options.image_input.slice(0, 2);
      }

      // aspect_ratio: 1:1, 21:9, 4:3, 3:4, 16:9, 9:16
      if (options.aspect_ratio) {
        const validAspectRatios = ['1:1', '21:9', '4:3', '3:4', '16:9', '9:16'];
        if (!validAspectRatios.includes(options.aspect_ratio)) {
          throw new Error(
            `Invalid aspect_ratio: ${options.aspect_ratio}. Must be one of: ${validAspectRatios.join(', ')}`
          );
        }
        payload.input.aspect_ratio = options.aspect_ratio;
      }

      // resolution: 480p, 720p, 1080p
      if (options.resolution) {
        const validResolutions = ['480p', '720p', '1080p'];
        if (!validResolutions.includes(options.resolution)) {
          throw new Error(
            `Invalid resolution: ${options.resolution}. Must be one of: ${validResolutions.join(', ')}`
          );
        }
        payload.input.resolution = options.resolution;
      }

      // duration: 4, 8, 12 (seconds)
      if (options.duration) {
        const validDurations = ['4', '8', '12'];
        const durationStr = String(options.duration);
        if (!validDurations.includes(durationStr)) {
          throw new Error(
            `Invalid duration: ${options.duration}. Must be one of: ${validDurations.join(', ')} seconds`
          );
        }
        payload.input.duration = durationStr;
      }

      // fixed_lens (boolean)
      if (typeof options.fixed_lens === 'boolean') {
        payload.input.fixed_lens = options.fixed_lens;
      }

      // generate_audio (boolean)
      if (typeof options.generate_audio === 'boolean') {
        payload.input.generate_audio = options.generate_audio;
      }
    }

    // Debug logging in development only
    if (process.env.NODE_ENV === 'development') {
      console.log('kie seedance-1.5-pro request:', payload);
    }

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(`generate video failed: ${msg}`);
    }

    if (!data || !data.taskId) {
      throw new Error(`generate video failed: no taskId`);
    }

    return {
      taskStatus: AITaskStatus.PENDING,
      taskId: data.taskId,
      taskInfo: {},
      taskResult: data,
    };
  }

  async generateSeedance2Video({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/jobs/createTask`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    if (isSeedance2AssetModel(params.model)) {
      throw new Error(
        'seedance-2-asset is only used for reference asset preparation'
      );
    }

    if (isSeedance2FaceModel(params.model)) {
      throw new Error(
        'Real Person Mode requires the APIMart Seedance provider'
      );
    }

    if (!params.model || !isSeedance2GenerationModel(params.model)) {
      throw new Error('invalid seedance 2 model');
    }

    if (!params.prompt) {
      throw new Error('prompt is required');
    }

    const promptLength = params.prompt.trim().length;
    if (promptLength < 3 || promptLength > 2500) {
      throw new Error('prompt must be between 3 and 2500 characters');
    }

    const options = (params.options || {}) as Seedance2VideoOptions;
    const allowWebSearch = options.seedance_mode === 'text';
    const payload: any = {
      model: params.model,
      callBackUrl: params.callbackUrl,
      input: {
        prompt: params.prompt,
        resolution: options.resolution || '480p',
        aspect_ratio: options.aspect_ratio || '16:9',
        duration: Number(options.duration || 4),
        generate_audio:
          typeof options.generate_audio === 'boolean'
            ? options.generate_audio
            : true,
        return_last_frame: Boolean(options.return_last_frame),
        web_search: allowWebSearch && Boolean(options.web_search),
      },
    };

    if (options.first_frame_url) {
      payload.input.first_frame_url = options.first_frame_url;
    }

    if (options.last_frame_url) {
      payload.input.last_frame_url = options.last_frame_url;
    }

    const referenceImageUrls = Array.isArray(options.reference_image_urls)
      ? options.reference_image_urls.filter(
          (url) => typeof url === 'string' && url.trim()
        )
      : [];
    if (referenceImageUrls.length > 0) {
      payload.input.reference_image_urls = referenceImageUrls;
    }

    const referenceVideoUrls = normalizeSeedanceReferenceUrls(
      options.reference_videos as SeedanceTimedReferenceAsset[] | undefined
    );
    if (referenceVideoUrls.length > 0) {
      payload.input.reference_video_urls = referenceVideoUrls;
    }

    const referenceAudioUrls = normalizeSeedanceReferenceUrls(
      options.reference_audios as SeedanceTimedReferenceAsset[] | undefined
    );
    if (referenceAudioUrls.length > 0) {
      payload.input.reference_audio_urls = referenceAudioUrls;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('kie seedance-2 request:', payload);
    }

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(`generate video failed: ${msg}`);
    }

    if (!data || !data.taskId) {
      throw new Error(`generate video failed: no taskId`);
    }

    return {
      taskStatus: AITaskStatus.PENDING,
      taskId: data.taskId,
      taskInfo: {},
      taskResult: data,
    };
  }

  private normalizeKlingShots(shots: KlingShotInput[] | undefined) {
    if (!Array.isArray(shots)) {
      return undefined;
    }

    return shots.map((shot) => ({
      prompt: shot.prompt.trim(),
      duration: shot.duration,
    }));
  }

  private normalizeKlingElements(elements: KlingElementInput[] | undefined) {
    if (!Array.isArray(elements)) {
      return undefined;
    }

    return elements.map((element) => {
      const normalized: Record<string, any> = {
        name: normalizeKlingElementToken(element.name),
        description: element.description.trim(),
      };

      if (Array.isArray(element.image_urls) && element.image_urls.length > 0) {
        normalized.element_input_urls = element.image_urls;
      }

      if (element.video_url) {
        normalized.element_input_video_urls = [element.video_url];
      }

      return normalized;
    });
  }

  async generateKlingVideo({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/jobs/createTask`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    if (!params.model) {
      params.model = KLING_VIDEO_MODEL;
    }

    const options = (params.options || {}) as KlingVideoOptions;
    const isStoryMode = options.multi_shots === true;
    const normalizedPrompt = params.prompt?.trim() ?? '';
    const normalizedDuration = parseKlingDuration(options.duration);

    if (!isStoryMode && !normalizedPrompt) {
      throw new Error('prompt is required');
    }

    if (normalizedDuration === null) {
      throw new Error('invalid kling duration');
    }

    const referenceImages = Array.isArray(options.image_urls)
      ? options.image_urls.filter(
          (url) => typeof url === 'string' && url.trim()
        )
      : [];
    const input: Record<string, any> = {
      duration: String(normalizedDuration),
      mode: options.mode || 'std',
      sound: Boolean(options.sound),
      multi_shots: Boolean(options.multi_shots),
    };

    if (normalizedPrompt) {
      input.prompt = normalizedPrompt;
    }

    if (referenceImages.length > 0) {
      input.image_urls = referenceImages;
    }

    if (!referenceImages.length && options.aspect_ratio) {
      input.aspect_ratio = options.aspect_ratio;
    }

    if (options.multi_shots) {
      const multiPrompt = this.normalizeKlingShots(options.multi_prompt);
      if (multiPrompt) {
        input.multi_prompt = multiPrompt;
      }
    }

    const klingElements = this.normalizeKlingElements(options.kling_elements);
    if (klingElements && klingElements.length > 0) {
      input.kling_elements = klingElements;
    }

    const payload = {
      model: params.model,
      callBackUrl: params.callbackUrl,
      input,
    };

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(`generate kling video failed: ${msg}`);
    }

    if (!data || !data.taskId) {
      throw new Error(`generate kling video failed: no taskId`);
    }

    return {
      taskStatus: AITaskStatus.PENDING,
      taskId: data.taskId,
      taskInfo: {},
      taskResult: data,
    };
  }

  async generateVideo({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    if (isKlingVideoModel(params.model)) {
      return this.generateKlingVideo({ params });
    }

    if (isSeedance2AssetModel(params.model)) {
      throw new Error(
        'seedance-2-asset is only used for reference asset preparation'
      );
    }

    if (isSeedance2GenerationModel(params.model)) {
      return this.generateSeedance2Video({ params });
    }

    if (isSeedance15Model(params.model)) {
      return this.generateSeedance15Video({ params });
    }

    return this.generateSeedance15Video({ params });
  }

  // generate task
  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    if (
      ![AIMediaType.MUSIC, AIMediaType.IMAGE, AIMediaType.VIDEO].includes(
        params.mediaType
      )
    ) {
      throw new Error(`mediaType not supported: ${params.mediaType}`);
    }

    if (params.mediaType === AIMediaType.MUSIC) {
      return this.generateMusic({ params });
    } else if (params.mediaType === AIMediaType.IMAGE) {
      return this.generateImage({ params });
    } else if (params.mediaType === AIMediaType.VIDEO) {
      return this.generateVideo({ params });
    }

    throw new Error(`mediaType not supported: ${params.mediaType}`);
  }

  async queryImage({ taskId }: { taskId: string }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/jobs/recordInfo?taskId=${taskId}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(msg);
    }

    if (!data || !data.state) {
      throw new Error(`query failed`);
    }

    let images: AIImage[] | undefined = undefined;

    if (data.resultJson) {
      const resultJson = JSON.parse(data.resultJson);
      const imageUrls = extractImageUrlsFromResultJson(resultJson, {
        includeResultUrls: true,
      });
      if (imageUrls.length > 0) {
        images = imageUrls.map((imageUrl: string) => ({
          id: '',
          createTime: new Date(data.createTime),
          imageUrl,
        }));
      }
    }

    const taskStatus = this.mapImageStatus(data.state);

    // use custom storage to save images
    if (
      taskStatus === AITaskStatus.SUCCESS &&
      images &&
      images.length > 0 &&
      this.configs.customStorage
    ) {
      const filesToSave: AIFile[] = [];
      images.forEach((image, index) => {
        if (image.imageUrl) {
          filesToSave.push({
            url: image.imageUrl,
            contentType: 'image/png',
            key: `kie/image/${getUuid()}.png`,
            index: index,
            type: 'image',
          });
        }
      });

      if (filesToSave.length > 0) {
        const uploadedFiles = await saveFiles(filesToSave);
        if (uploadedFiles) {
          uploadedFiles.forEach((file: AIFile) => {
            if (file && file.url && images && file.index !== undefined) {
              const image = images[file.index];
              if (image) {
                image.imageUrl = file.url;
              }
            }
          });
        }
      }
    }

    return {
      taskId,
      taskStatus,
      taskInfo: {
        images,
        status: data.state,
        errorCode: data.failCode,
        errorMessage: data.failMsg,
        createTime: new Date(data.createTime),
      },
      taskResult: data,
    };
  }

  async queryVideo({ taskId }: { taskId: string }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/jobs/recordInfo?taskId=${taskId}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(msg);
    }

    if (!data || !data.state) {
      throw new Error(`query failed`);
    }

    let videos: AIVideo[] | undefined = undefined;
    let images: AIImage[] | undefined = undefined;

    if (data.resultJson) {
      const resultJson = JSON.parse(data.resultJson);
      const videoUrls = extractVideoUrlsFromResultJson(resultJson);
      const imageUrls = extractImageUrlsFromResultJson(resultJson);

      if (videoUrls.length > 0) {
        videos = videoUrls.map((videoUrl) => ({
          id: '',
          createTime: new Date(data.createTime),
          videoUrl,
        }));
      }

      if (imageUrls.length > 0) {
        images = imageUrls.map((imageUrl) => ({
          id: '',
          createTime: new Date(data.createTime),
          imageUrl,
        }));
      }
    }

    const taskStatus = this.mapImageStatus(data.state);

    // use custom storage to save videos and optional last-frame images
    if (taskStatus === AITaskStatus.SUCCESS && this.configs.customStorage) {
      const filesToSave: AIFile[] = [];
      videos?.forEach((video, index) => {
        if (video.videoUrl) {
          filesToSave.push({
            url: video.videoUrl,
            contentType: 'video/mp4',
            key: `kie/video/${getUuid()}.mp4`,
            index,
            type: 'video',
          });
        }
      });
      images?.forEach((image, index) => {
        if (image.imageUrl) {
          filesToSave.push({
            url: image.imageUrl,
            contentType: 'image/png',
            key: `kie/image/${getUuid()}.png`,
            index,
            type: 'image',
          });
        }
      });

      if (filesToSave.length > 0) {
        const uploadedFiles = await saveFiles(filesToSave);
        if (uploadedFiles) {
          uploadedFiles.forEach((file: AIFile) => {
            if (!file || !file.url || file.index === undefined) {
              return;
            }

            if (file.type === 'video' && videos) {
              const video = videos[file.index];
              if (video) {
                video.videoUrl = file.url;
              }
            }

            if (file.type === 'image' && images) {
              const image = images[file.index];
              if (image) {
                image.imageUrl = file.url;
              }
            }
          });
        }
      }
    }

    return {
      taskId,
      taskStatus,
      taskInfo: {
        images,
        videos,
        status: data.state,
        errorCode: data.failCode,
        errorMessage: data.failMsg,
        createTime: new Date(data.createTime),
      },
      taskResult: data,
    };
  }

  // query task
  async query({
    taskId,
    mediaType,
  }: {
    taskId: string;
    mediaType?: AIMediaType;
  }): Promise<AITaskResult> {
    if (mediaType === AIMediaType.IMAGE) {
      return this.queryImage({ taskId });
    }

    if (mediaType === AIMediaType.VIDEO) {
      return this.queryVideo({ taskId });
    }

    const apiUrl = `${this.baseUrl}/generate/record-info?taskId=${taskId}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });
    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const { code, msg, data } = await resp.json();

    if (code !== 200) {
      throw new Error(msg);
    }

    if (!data || !data.status) {
      throw new Error(`query failed`);
    }

    const songs: AISong[] = data?.response?.sunoData?.map((song: any) => ({
      id: song.id,
      createTime: new Date(song.createTime),
      audioUrl: song.audioUrl,
      imageUrl: song.imageUrl,
      duration: song.duration,
      prompt: song.prompt,
      title: song.title,
      tags: song.tags,
      style: song.style,
      model: song.modelName,
      artist: song.artist,
      album: song.album,
    }));

    const taskStatus = this.mapStatus(data.status);

    // save files if custom storage is enabled
    if (
      taskStatus === AITaskStatus.SUCCESS &&
      songs &&
      songs.length > 0 &&
      this.configs.customStorage
    ) {
      const audioFilesToSave: AIFile[] = [];
      const imageFilesToSave: AIFile[] = [];

      songs.forEach((song, index) => {
        if (song.audioUrl) {
          audioFilesToSave.push({
            url: song.audioUrl,
            contentType: 'audio/mpeg',
            key: `kie/audio/${getUuid()}.mp3`,
            index: index,
            type: 'audio',
          });
        }
        if (song.imageUrl) {
          imageFilesToSave.push({
            url: song.imageUrl,
            contentType: 'image/png',
            key: `kie/image/${getUuid()}.png`,
            index: index,
            type: 'image',
          });
        }
      });

      if (audioFilesToSave.length > 0) {
        const uploadedFiles = await saveFiles(audioFilesToSave);
        if (uploadedFiles) {
          uploadedFiles.forEach((file: AIFile) => {
            if (file && file.url && songs && file.index !== undefined) {
              const song = songs[file.index];
              song.audioUrl = file.url;
            }
          });
        }
      }

      if (imageFilesToSave.length > 0) {
        const uploadedFiles = await saveFiles(imageFilesToSave);
        if (uploadedFiles) {
          uploadedFiles.forEach((file: AIFile) => {
            if (file && file.url && songs && file.index !== undefined) {
              const song = songs[file.index];
              song.imageUrl = file.url;
            }
          });
        }
      }
    }

    return {
      taskId,
      taskStatus,
      taskInfo: {
        songs,
        status: data.status,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        createTime: new Date(data.createTime),
      },
      taskResult: data,
    };
  }

  // map image task status
  private mapImageStatus(status: string): AITaskStatus {
    switch (status) {
      case 'waiting':
        return AITaskStatus.PENDING;
      case 'queuing':
        return AITaskStatus.PENDING;
      case 'generating':
        return AITaskStatus.PROCESSING;
      case 'success':
        return AITaskStatus.SUCCESS;
      case 'fail':
        return AITaskStatus.FAILED;
      default:
        throw new Error(`unknown status: ${status}`);
    }
  }

  // map music task status
  private mapStatus(status: string): AITaskStatus {
    switch (status) {
      case 'PENDING':
        return AITaskStatus.PENDING;
      case 'TEXT_SUCCESS':
        return AITaskStatus.PROCESSING;
      case 'FIRST_SUCCESS':
        return AITaskStatus.PROCESSING;
      case 'SUCCESS':
        return AITaskStatus.SUCCESS;
      case 'CREATE_TASK_FAILED':
      case 'GENERATE_AUDIO_FAILED':
      case 'CALLBACK_EXCEPTION':
      case 'SENSITIVE_WORD_ERROR':
        return AITaskStatus.FAILED;
      default:
        throw new Error(`unknown status: ${status}`);
    }
  }
}
