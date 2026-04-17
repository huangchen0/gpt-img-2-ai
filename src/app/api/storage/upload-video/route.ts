import { getUuid } from '@/shared/lib/hash';
import {
  KLING_VIDEO_UPLOAD_MAX_BYTES,
  KLING_VIDEO_UPLOAD_MIME_TYPES,
} from '@/shared/lib/kling-video';
import { parseMediaMetadata } from '@/shared/lib/media-metadata';
import { respData, respErr } from '@/shared/lib/resp';
import { signSeedanceReferenceToken } from '@/shared/lib/seedance-reference-server';
import { getUserInfo } from '@/shared/models/user';
import { getStorageService } from '@/shared/services/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;
const LOG_PREFIX = '[storage.upload-video]';

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const extFromMime = (mimeType: string) => {
  const map: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
  };
  return map[mimeType] || '';
};

const mimeFromExt = (filename: string) => {
  const ext = filename.split('.').pop()?.trim().toLowerCase();
  if (ext === 'mp4') {
    return 'video/mp4';
  }
  if (ext === 'mov') {
    return 'video/quicktime';
  }
  return '';
};

const normalizeVideoMimeType = (file: File) => {
  const normalizedType = file.type.trim().toLowerCase();
  if (
    KLING_VIDEO_UPLOAD_MIME_TYPES.includes(
      normalizedType as (typeof KLING_VIDEO_UPLOAD_MIME_TYPES)[number]
    )
  ) {
    return normalizedType;
  }

  return mimeFromExt(file.name);
};

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const rawDurationHint = formData.get('duration_seconds');
    const rawWidthHint = formData.get('width');
    const rawHeightHint = formData.get('height');
    const durationHint =
      typeof rawDurationHint === 'string' ? Number(rawDurationHint) : NaN;
    const widthHint =
      typeof rawWidthHint === 'string' ? Number(rawWidthHint) : NaN;
    const heightHint =
      typeof rawHeightHint === 'string' ? Number(rawHeightHint) : NaN;
    const normalizedWidthHint =
      Number.isFinite(widthHint) && widthHint > 0
        ? Math.round(widthHint)
        : undefined;
    const normalizedHeightHint =
      Number.isFinite(heightHint) && heightHint > 0
        ? Math.round(heightHint)
        : undefined;

    console.info(`${LOG_PREFIX} request`, {
      userId: user.id,
      fileCount: files.length,
      durationHint: Number.isFinite(durationHint) ? durationHint : undefined,
      widthHint: normalizedWidthHint,
      heightHint: normalizedHeightHint,
    });

    if (!files || files.length === 0) {
      return respErr('No files provided');
    }

    if (files.length > 1) {
      return respErr('Only one video can be uploaded at a time');
    }

    const storageService = await getStorageService();
    const uploadResults = [];

    for (const file of files) {
      const mimeType = normalizeVideoMimeType(file);
      console.info(`${LOG_PREFIX} file-start`, {
        userId: user.id,
        filename: file.name,
        originalMimeType: file.type || undefined,
        normalizedMimeType: mimeType || undefined,
        size: file.size,
      });

      if (
        !KLING_VIDEO_UPLOAD_MIME_TYPES.includes(
          mimeType as (typeof KLING_VIDEO_UPLOAD_MIME_TYPES)[number]
        )
      ) {
        return respErr('Only MP4 and MOV videos are supported');
      }

      if (file.size > KLING_VIDEO_UPLOAD_MAX_BYTES) {
        return respErr('Video file is too large. Max size is 50MB');
      }

      const arrayBuffer = await file.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);
      const ext = extFromMime(mimeType) || file.name.split('.').pop() || 'bin';
      const key = `${Date.now()}-${getUuid()}.${ext}`;

      const result = await storageService.uploadFile({
        body,
        key,
        contentType: mimeType,
        disposition: 'inline',
      });

      if (!result.success) {
        return respErr(result.error || 'Upload failed');
      }

      if (!result.url || !result.key) {
        return respErr('Upload failed');
      }

      console.info(`${LOG_PREFIX} storage-upload-success`, {
        userId: user.id,
        filename: file.name,
        key: result.key,
        url: result.url,
      });

      let durationSeconds: number | undefined;
      let parsedWidth: number | undefined;
      let parsedHeight: number | undefined;
      let usedDurationHint = false;
      try {
        const metadata = await parseMediaMetadata({
          body,
          mimeType,
        });
        parsedWidth = metadata.width;
        parsedHeight = metadata.height;

        if (
          typeof metadata.durationSeconds !== 'number' ||
          !Number.isFinite(metadata.durationSeconds) ||
          metadata.durationSeconds <= 0
        ) {
          throw new Error('failed to parse media duration');
        }

        durationSeconds = metadata.durationSeconds;
        console.info(`${LOG_PREFIX} duration-detected`, {
          userId: user.id,
          filename: file.name,
          source: 'metadata',
          durationSeconds,
          width: parsedWidth,
          height: parsedHeight,
        });
      } catch (error) {
        console.warn(`${LOG_PREFIX} duration-parse-failed`, {
          userId: user.id,
          filename: file.name,
          mimeType,
          size: file.size,
          durationHint:
            Number.isFinite(durationHint) && durationHint > 0
              ? durationHint
              : undefined,
          widthHint: normalizedWidthHint,
          heightHint: normalizedHeightHint,
          parsedWidth,
          parsedHeight,
          error: getErrorMessage(error),
        });

        if (Number.isFinite(durationHint) && durationHint > 0) {
          durationSeconds = durationHint;
          usedDurationHint = true;
        } else {
          durationSeconds = undefined;
        }
      }

      const resolvedWidth = parsedWidth ?? normalizedWidthHint;
      const resolvedHeight = parsedHeight ?? normalizedHeightHint;
      const usedDimensionHints =
        (resolvedWidth ?? 0) !== (parsedWidth ?? 0) ||
        (resolvedHeight ?? 0) !== (parsedHeight ?? 0);

      const metadataToken =
        typeof durationSeconds === 'number' && Number.isFinite(durationSeconds)
          ? signSeedanceReferenceToken({
              kind: 'video',
              url: result.url,
              durationSeconds,
              width: resolvedWidth,
              height: resolvedHeight,
            })
          : undefined;

      uploadResults.push({
        url: result.url,
        key: result.key,
        filename: file.name,
        deduped: false,
        durationSeconds,
        width: resolvedWidth,
        height: resolvedHeight,
        metadataToken,
      });

      console.info(`${LOG_PREFIX} file-complete`, {
        userId: user.id,
        filename: file.name,
        key: result.key,
        durationSeconds,
        width: resolvedWidth,
        height: resolvedHeight,
        usedDurationHint,
        usedDimensionHints,
        hasMetadataToken: Boolean(metadataToken),
      });
    }

    return respData({
      urls: uploadResults.map((item) => item.url),
      results: uploadResults,
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} request-failed`, {
      error: getErrorMessage(error),
    });
    return respErr(
      error instanceof Error ? error.message : 'upload video failed'
    );
  }
}
