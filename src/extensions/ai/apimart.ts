import { getUuid } from '@/shared/lib/hash';
import {
  isSeedance2GenerationModel,
  SEEDANCE_2_FACE_MODEL,
  SEEDANCE_2_FAST_FACE_MODEL,
  SEEDANCE_2_FAST_MODEL,
  Seedance2VideoOptions,
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
  AITaskResult,
  AITaskStatus,
  AIVideo,
} from './types';

/**
 * APIMart configs
 * @docs https://docs.apimart.ai/
 */
export interface ApimartConfigs extends AIConfigs {
  apiKey: string;
  baseUrl?: string;
  customStorage?: boolean;
}

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseEmbeddedJsonRecord(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const candidates = new Set<string>([trimmed]);
  const tidIndex = trimmed.lastIndexOf(' tid:');
  if (tidIndex > 0) {
    candidates.add(trimmed.slice(0, tidIndex).trim());
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.add(trimmed.slice(firstBrace, lastBrace + 1).trim());
  }

  if (tidIndex > 0) {
    const withoutTid = trimmed.slice(0, tidIndex).trim();
    const innerFirstBrace = withoutTid.indexOf('{');
    const innerLastBrace = withoutTid.lastIndexOf('}');
    if (innerFirstBrace >= 0 && innerLastBrace > innerFirstBrace) {
      candidates.add(
        withoutTid.slice(innerFirstBrace, innerLastBrace + 1).trim()
      );
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {}
  }

  return null;
}

function collectUrls(value: unknown): string[] {
  const urls: string[] = [];

  const visit = (item: unknown) => {
    if (!item) {
      return;
    }

    if (typeof item === 'string') {
      const normalized = item.trim();
      if (normalized && !urls.includes(normalized)) {
        urls.push(normalized);
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

    ['url', 'urls', 'uri', 'src'].forEach((key) => {
      if (key in record) {
        visit(record[key]);
      }
    });
  };

  visit(value);

  return urls;
}

function normalizeTimedReferenceUrls(
  items?: SeedanceTimedReferenceAsset[] | null
) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => item.url?.trim())
    .filter((item): item is string => Boolean(item));
}

function getApimartErrorDetails(payload: unknown) {
  const visited = new WeakSet<object>();

  const visit = (value: unknown): { message: string; code: string } | null => {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      const normalized = value.trim();
      if (!normalized) {
        return null;
      }

      const embeddedRecord = parseEmbeddedJsonRecord(normalized);
      if (embeddedRecord) {
        const nested = visit(embeddedRecord);
        if (nested) {
          return nested;
        }
      }

      return {
        message: normalized,
        code: '',
      };
    }

    const record = getRecord(value);
    if (!record || visited.has(record)) {
      return null;
    }

    visited.add(record);

    const error = getRecord(record.error);
    if (error) {
      const nestedDetails = visit(error);
      if (nestedDetails) {
        const errorCode =
          typeof error.code === 'number' || typeof error.code === 'string'
            ? String(error.code)
            : nestedDetails.code;
        const param =
          typeof error.param === 'string' && error.param.trim()
            ? error.param.trim()
            : '';
        const message =
          param && !nestedDetails.message.includes(param)
            ? `${nestedDetails.message} (param: ${param})`
            : nestedDetails.message;

        return {
          message,
          code: errorCode,
        };
      }

      const errorCode =
        typeof error.code === 'number' || typeof error.code === 'string'
          ? String(error.code)
          : '';
      if (errorCode) {
        return {
          message: '',
          code: errorCode,
        };
      }
    }

    for (const key of ['message', 'msg', 'detail']) {
      const nestedDetails = visit(record[key]);
      if (nestedDetails) {
        const recordCode =
          typeof record.code === 'number' || typeof record.code === 'string'
            ? String(record.code)
            : nestedDetails.code;
        return {
          message: nestedDetails.message,
          code: recordCode,
        };
      }
    }

    const recordCode =
      typeof record.code === 'number' || typeof record.code === 'string'
        ? String(record.code)
        : '';
    if (recordCode) {
      return {
        message: '',
        code: recordCode,
      };
    }

    return null;
  };

  return visit(payload) ?? { message: '', code: '' };
}

function getApimartErrorMessage(payload: unknown) {
  return getApimartErrorDetails(payload).message;
}

function getObjectKeys(value: unknown) {
  const record = getRecord(value);
  if (!record) {
    return [];
  }

  return Object.keys(record).slice(0, 20);
}

/**
 * APIMart provider
 * @docs https://docs.apimart.ai/
 */
const APIMART_SEEDANCE_2_MODEL_MAP = {
  [SEEDANCE_2_FAST_MODEL]: 'doubao-seedance-2.0-fast',
  [SEEDANCE_2_FAST_FACE_MODEL]: 'doubao-seedance-2.0-fast-face',
  'bytedance/seedance-2': 'doubao-seedance-2.0',
  [SEEDANCE_2_FACE_MODEL]: 'doubao-seedance-2.0-face',
} as const;

export class ApimartProvider implements AIProvider {
  readonly name = 'apimart';
  configs: ApimartConfigs;

  private baseUrl: string;

  constructor(configs: ApimartConfigs) {
    this.configs = configs;
    this.baseUrl = (configs.baseUrl || 'https://api.apimart.ai').replace(
      /\/$/,
      ''
    );
  }

  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    if (params.mediaType !== AIMediaType.VIDEO) {
      throw new Error(`mediaType not supported: ${params.mediaType}`);
    }

    if (!params.model || !isSeedance2GenerationModel(params.model)) {
      throw new Error('APIMart only supports Seedance 2.x video generation');
    }

    const apiUrl = `${this.baseUrl}/v1/videos/generations`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };
    const payload = this.buildSeedance2Payload({
      model: params.model,
      prompt: params.prompt,
      options: (params.options || {}) as Seedance2VideoOptions,
    });

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    let data: any = null;
    try {
      data = await resp.json();
    } catch {
      data = null;
    }

    if (!resp.ok) {
      throw new Error(
        getApimartErrorMessage(data) ||
          `APIMart request failed with status: ${resp.status}`
      );
    }

    if (data?.code !== 200) {
      throw new Error(
        getApimartErrorMessage(data) || 'APIMart video generation failed'
      );
    }

    const taskInfo = Array.isArray(data.data) ? data.data[0] : data.data;
    const taskId = taskInfo?.task_id || taskInfo?.taskId;

    if (!taskId) {
      throw new Error('APIMart video generation failed: no task_id');
    }

    return {
      taskStatus: this.mapSubmissionStatus(taskInfo?.status),
      taskId,
      taskInfo: {
        status:
          typeof taskInfo?.status === 'string' ? taskInfo.status : 'submitted',
      },
      taskResult: data,
    };
  }

  async query({
    taskId,
  }: {
    taskId: string;
    mediaType?: string;
    model?: string;
  }): Promise<AITaskResult> {
    const apiUrl = `${this.baseUrl}/v1/tasks/${encodeURIComponent(taskId)}`;
    const headers = {
      Authorization: `Bearer ${this.configs.apiKey}`,
    };

    const resp = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });

    let payload: any = null;
    try {
      payload = await resp.json();
    } catch {
      payload = null;
    }

    if (!resp.ok) {
      throw new Error(
        getApimartErrorMessage(payload) ||
          `APIMart query failed with status: ${resp.status}`
      );
    }

    if (payload?.code !== 200 || !payload?.data) {
      throw new Error(
        getApimartErrorMessage(payload) || 'APIMart query failed'
      );
    }

    const data = payload.data;
    const providerStatus =
      typeof data.status === 'string' ? data.status : undefined;
    const taskStatus = this.mapTaskStatus(data.status);
    const taskResult = getRecord(data.result) || {};
    const fallbackThumbnailUrl =
      typeof taskResult.thumbnail_url === 'string'
        ? taskResult.thumbnail_url
        : typeof data.thumbnail_url === 'string'
          ? data.thumbnail_url
          : undefined;

    let videos = this.extractVideos(taskResult, fallbackThumbnailUrl);
    let images = this.extractImages(taskResult);
    const errorDetails = getApimartErrorDetails(data.error);

    console.info('[seedance.apimart.query] response', {
      taskId,
      providerStatus,
      finalTaskStatus: taskStatus,
      customStorage: this.configs.customStorage,
      resultKeys: getObjectKeys(taskResult),
      dataKeys: getObjectKeys(data),
      videoCount: videos.length,
      imageCount: images.length,
      errorCode: errorDetails.code || '',
      errorMessage: errorDetails.message || '',
    });

    if (taskStatus === AITaskStatus.SUCCESS && this.configs.customStorage) {
      const filesToSave: AIFile[] = [];

      videos.forEach((video, index) => {
        if (video.videoUrl) {
          filesToSave.push({
            url: video.videoUrl,
            contentType: 'video/mp4',
            key: `apimart/video/${getUuid()}.mp4`,
            index,
            type: 'video',
          });
        }
      });

      images.forEach((image, index) => {
        if (image.imageUrl) {
          filesToSave.push({
            url: image.imageUrl,
            contentType: 'image/png',
            key: `apimart/image/${getUuid()}.png`,
            index,
            type: 'image',
          });
        }
      });

      if (filesToSave.length > 0) {
        console.info('[seedance.apimart.storage] start', {
          taskId,
          fileCount: filesToSave.length,
          fileTypes: filesToSave.map((file) => file.type || 'unknown'),
        });
        const uploadedFiles = await saveFiles(filesToSave);
        if (uploadedFiles) {
          uploadedFiles.forEach((file) => {
            if (!file.url || file.index === undefined) {
              return;
            }

            if (file.type === 'video') {
              const video = videos[file.index];
              if (video) {
                video.videoUrl = file.url;
              }
            }

            if (file.type === 'image') {
              const image = images[file.index];
              if (image) {
                image.imageUrl = file.url;
              }
            }
          });

          console.info('[seedance.apimart.storage] completed', {
            taskId,
            uploadedCount: uploadedFiles.length,
            videoCount: videos.length,
            imageCount: images.length,
          });
        } else {
          console.warn('[seedance.apimart.storage] no-uploaded-files', {
            taskId,
            requestedCount: filesToSave.length,
          });
        }
      }
    }

    const createdAt =
      typeof data.created === 'number'
        ? new Date(data.created * 1000)
        : new Date();
    const errorCode = errorDetails.code;
    const errorMessage =
      errorDetails.message ||
      (providerStatus === 'cancelled' ? 'APIMart task was cancelled' : '');

    return {
      taskId,
      taskStatus,
      taskInfo: {
        videos: videos.length > 0 ? videos : undefined,
        images: images.length > 0 ? images : undefined,
        status: providerStatus,
        errorCode,
        errorMessage,
        createTime: createdAt,
      },
      taskResult: data,
    };
  }

  private buildSeedance2Payload({
    model,
    prompt,
    options,
  }: {
    model: string;
    prompt: string;
    options: Seedance2VideoOptions;
  }) {
    const payload: Record<string, unknown> = {
      model:
        APIMART_SEEDANCE_2_MODEL_MAP[
          model as keyof typeof APIMART_SEEDANCE_2_MODEL_MAP
        ] ?? 'doubao-seedance-2.0',
      resolution: options.resolution || '480p',
      size: options.aspect_ratio || '16:9',
      duration: Number(options.duration || 4),
      generate_audio:
        typeof options.generate_audio === 'boolean'
          ? options.generate_audio
          : true,
      return_last_frame: Boolean(options.return_last_frame),
    };

    if (typeof options.seed === 'number' && Number.isInteger(options.seed)) {
      payload.seed = options.seed;
    }

    const normalizedPrompt = prompt?.trim();
    if (normalizedPrompt) {
      payload.prompt = normalizedPrompt;
    }

    if (options.web_search) {
      payload.tools = [{ type: 'web_search' }];
    }

    if (options.first_frame_url || options.last_frame_url) {
      const imageWithRoles: Array<{ url: string; role: string }> = [];

      if (options.first_frame_url?.trim()) {
        imageWithRoles.push({
          url: options.first_frame_url.trim(),
          role: 'first_frame',
        });
      }

      if (options.last_frame_url?.trim()) {
        imageWithRoles.push({
          url: options.last_frame_url.trim(),
          role: 'last_frame',
        });
      }

      if (imageWithRoles.length > 0) {
        payload.image_with_roles = imageWithRoles;
      }
    } else if (options.reference_image_urls?.length) {
      payload.image_urls = options.reference_image_urls
        .map((item) => item.trim())
        .filter((item) => Boolean(item));
    }

    const videoUrls = normalizeTimedReferenceUrls(options.reference_videos);
    if (videoUrls.length > 0) {
      payload.video_urls = videoUrls;
    }

    const audioUrls = normalizeTimedReferenceUrls(options.reference_audios);
    if (audioUrls.length > 0) {
      payload.audio_urls = audioUrls;
    }

    return payload;
  }

  private extractVideos(
    result: Record<string, unknown>,
    fallbackThumbnailUrl?: string
  ) {
    const rawVideos = Array.isArray(result.videos)
      ? result.videos
      : result.video
        ? [result.video]
        : [];

    const videos: AIVideo[] = [];

    rawVideos.forEach((item) => {
      const record = getRecord(item);
      const url = collectUrls(
        record?.url ?? record?.video_url ?? record?.videoUrl ?? item
      )[0];

      if (!url) {
        return;
      }

      const thumbnailUrl =
        (typeof record?.thumbnail_url === 'string' && record.thumbnail_url) ||
        (typeof record?.thumbnailUrl === 'string' && record.thumbnailUrl) ||
        fallbackThumbnailUrl;

      videos.push({
        id: '',
        createTime: new Date(),
        videoUrl: url,
        thumbnailUrl,
      });
    });

    if (videos.length > 0) {
      return videos;
    }

    return collectUrls(result.video_urls).map((url) => ({
      id: '',
      createTime: new Date(),
      videoUrl: url,
      thumbnailUrl: fallbackThumbnailUrl,
    }));
  }

  private extractImages(result: Record<string, unknown>) {
    const images: AIImage[] = [];
    const rawImages = Array.isArray(result.images)
      ? result.images
      : result.image
        ? [result.image]
        : [];

    rawImages.forEach((item) => {
      const record = getRecord(item);
      const url = collectUrls(
        record?.url ?? record?.image_url ?? record?.imageUrl ?? item
      )[0];

      if (!url) {
        return;
      }

      images.push({
        id: '',
        createTime: new Date(),
        imageUrl: url,
      });
    });

    collectUrls(result.last_frame_url).forEach((url) => {
      if (!images.some((item) => item.imageUrl === url)) {
        images.push({
          id: '',
          createTime: new Date(),
          imageUrl: url,
        });
      }
    });

    collectUrls(result.last_frame_urls).forEach((url) => {
      if (!images.some((item) => item.imageUrl === url)) {
        images.push({
          id: '',
          createTime: new Date(),
          imageUrl: url,
        });
      }
    });

    return images;
  }

  private mapSubmissionStatus(status?: string): AITaskStatus {
    switch (status) {
      case 'submitted':
      case 'pending':
        return AITaskStatus.PENDING;
      case 'processing':
        return AITaskStatus.PROCESSING;
      case 'completed':
        return AITaskStatus.SUCCESS;
      case 'failed':
      case 'cancelled':
        return AITaskStatus.FAILED;
      default:
        return AITaskStatus.PENDING;
    }
  }

  private mapTaskStatus(status: string): AITaskStatus {
    switch (status) {
      case 'pending':
        return AITaskStatus.PENDING;
      case 'processing':
        return AITaskStatus.PROCESSING;
      case 'completed':
        return AITaskStatus.SUCCESS;
      case 'failed':
      case 'cancelled':
        return AITaskStatus.FAILED;
      default:
        throw new Error(`unknown APIMart status: ${status}`);
    }
  }
}
