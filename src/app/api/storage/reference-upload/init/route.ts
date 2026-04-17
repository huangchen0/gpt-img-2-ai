import { KLING_VIDEO_UPLOAD_MIME_TYPES } from '@/shared/lib/kling-video';
import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { signSeedanceReferenceUploadToken } from '@/shared/lib/seedance-reference-server';
import {
  SEEDANCE_2_REFERENCE_AUDIO_UPLOAD_MAX_BYTES,
  SEEDANCE_2_REFERENCE_AUDIO_UPLOAD_MIME_TYPES,
  SEEDANCE_2_REFERENCE_VIDEO_UPLOAD_MAX_BYTES,
} from '@/shared/lib/seedance-video';
import { getUserInfo } from '@/shared/models/user';
import { getStorageService } from '@/shared/services/storage';

export const runtime = 'nodejs';
const LOG_PREFIX = '[storage.reference-upload.init]';

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

type ReferenceUploadKind = 'video' | 'audio';

const VIDEO_MIME_BY_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

const AUDIO_MIME_BY_EXT: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
};

function normalizeMimeType({
  kind,
  filename,
  mimeType,
}: {
  kind: ReferenceUploadKind;
  filename: string;
  mimeType?: string;
}) {
  const normalizedType = mimeType?.trim().toLowerCase() ?? '';
  const ext = filename.split('.').pop()?.trim().toLowerCase() ?? '';
  const allowedMimeTypes =
    kind === 'video'
      ? KLING_VIDEO_UPLOAD_MIME_TYPES
      : SEEDANCE_2_REFERENCE_AUDIO_UPLOAD_MIME_TYPES;
  const mimeByExt = kind === 'video' ? VIDEO_MIME_BY_EXT : AUDIO_MIME_BY_EXT;
  const fallbackMimeType = mimeByExt[ext] || '';

  if ((allowedMimeTypes as readonly string[]).includes(normalizedType)) {
    return {
      mimeType: normalizedType,
      ext: ext || filename.split('.').pop() || 'bin',
    };
  }

  if (fallbackMimeType) {
    return {
      mimeType: fallbackMimeType,
      ext,
    };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const { kind, filename, mimeType, size } = await request.json();
    console.info(`${LOG_PREFIX} request`, {
      userId: user.id,
      kind,
      filename,
      mimeType,
      size,
    });

    if (kind !== 'video' && kind !== 'audio') {
      console.warn(`${LOG_PREFIX} invalid-kind`, {
        userId: user.id,
        kind,
      });
      return respErr('invalid reference upload kind');
    }

    if (typeof filename !== 'string' || !filename.trim()) {
      console.warn(`${LOG_PREFIX} invalid-filename`, {
        userId: user.id,
        kind,
        filename,
      });
      return respErr('invalid filename');
    }

    if (!Number.isFinite(size) || size <= 0) {
      console.warn(`${LOG_PREFIX} invalid-size`, {
        userId: user.id,
        kind,
        filename,
        size,
      });
      return respErr('invalid file size');
    }

    const maxBytes =
      kind === 'video'
        ? SEEDANCE_2_REFERENCE_VIDEO_UPLOAD_MAX_BYTES
        : SEEDANCE_2_REFERENCE_AUDIO_UPLOAD_MAX_BYTES;
    if (size > maxBytes) {
      console.warn(`${LOG_PREFIX} file-too-large`, {
        userId: user.id,
        kind,
        filename,
        size,
        maxBytes,
      });
      return respErr(
        kind === 'video'
          ? 'Video file is too large. Max size is 50MB'
          : 'Audio file is too large. Max size is 15MB'
      );
    }

    const normalized = normalizeMimeType({
      kind,
      filename: filename.trim(),
      mimeType: typeof mimeType === 'string' ? mimeType : undefined,
    });
    if (!normalized) {
      console.warn(`${LOG_PREFIX} unsupported-type`, {
        userId: user.id,
        kind,
        filename: filename.trim(),
        mimeType: typeof mimeType === 'string' ? mimeType : undefined,
      });
      return respErr(
        kind === 'video'
          ? 'Only MP4 and MOV videos are supported'
          : 'Only MP3 and WAV audio files are supported'
      );
    }

    const key = `${Date.now()}-${getUuid()}.${normalized.ext}`;
    const storageService = await getStorageService();
    const signedUpload = await storageService.createSignedUpload({
      key,
      contentType: normalized.mimeType,
      disposition: 'inline',
    });
    const uploadToken = signSeedanceReferenceUploadToken({
      userId: user.id,
      kind,
      key,
      url: signedUpload.url,
      probeUrl: signedUpload.probeUrl,
      mimeType: normalized.mimeType,
    });

    console.info(`${LOG_PREFIX} ready`, {
      userId: user.id,
      kind,
      filename: filename.trim(),
      key,
      mimeType: normalized.mimeType,
      uploadOrigin: new URL(signedUpload.uploadUrl).origin,
    });

    return respData({
      key,
      url: signedUpload.url,
      uploadUrl: signedUpload.uploadUrl,
      uploadHeaders: signedUpload.headers,
      expiresInSeconds: signedUpload.expiresInSeconds,
      uploadToken,
      mimeType: normalized.mimeType,
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} request-failed`, {
      error: getErrorMessage(error),
    });
    return respErr(
      error instanceof Error ? error.message : 'init reference upload failed'
    );
  }
}
