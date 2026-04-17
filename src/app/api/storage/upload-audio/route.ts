import { getUuid } from '@/shared/lib/hash';
import { parseMediaDurationSeconds } from '@/shared/lib/media-metadata';
import { signSeedanceReferenceToken } from '@/shared/lib/seedance-reference-server';
import {
  SEEDANCE_2_REFERENCE_AUDIO_UPLOAD_MAX_BYTES,
  SEEDANCE_2_REFERENCE_AUDIO_UPLOAD_MIME_TYPES,
} from '@/shared/lib/seedance-video';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { getStorageService } from '@/shared/services/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;
const LOG_PREFIX = '[storage.upload-audio]';

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const extFromMime = (mimeType: string) => {
  const map: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
  };
  return map[mimeType] || '';
};

const mimeFromExt = (filename: string) => {
  const ext = filename.split('.').pop()?.trim().toLowerCase();
  if (ext === 'mp3') {
    return 'audio/mpeg';
  }
  if (ext === 'wav') {
    return 'audio/wav';
  }
  return '';
};

const normalizeAudioMimeType = (file: File) => {
  const normalizedType = file.type.trim().toLowerCase();
  if (
    SEEDANCE_2_REFERENCE_AUDIO_UPLOAD_MIME_TYPES.includes(
      normalizedType as (typeof SEEDANCE_2_REFERENCE_AUDIO_UPLOAD_MIME_TYPES)[number]
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
    const durationHint =
      typeof rawDurationHint === 'string' ? Number(rawDurationHint) : NaN;

    console.info(`${LOG_PREFIX} request`, {
      userId: user.id,
      fileCount: files.length,
      durationHint: Number.isFinite(durationHint) ? durationHint : undefined,
    });

    if (!files || files.length === 0) {
      return respErr('No files provided');
    }

    const storageService = await getStorageService();
    const uploadResults = [];

    for (const file of files) {
      const mimeType = normalizeAudioMimeType(file);
      console.info(`${LOG_PREFIX} file-start`, {
        userId: user.id,
        filename: file.name,
        originalMimeType: file.type || undefined,
        normalizedMimeType: mimeType || undefined,
        size: file.size,
      });

      if (
        !SEEDANCE_2_REFERENCE_AUDIO_UPLOAD_MIME_TYPES.includes(
          mimeType as (typeof SEEDANCE_2_REFERENCE_AUDIO_UPLOAD_MIME_TYPES)[number]
        )
      ) {
        return respErr('Only MP3 and WAV audio files are supported');
      }

      if (file.size > SEEDANCE_2_REFERENCE_AUDIO_UPLOAD_MAX_BYTES) {
        return respErr('Audio file is too large. Max size is 15MB');
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

      let durationSeconds: number;
      let usedDurationHint = false;
      try {
        durationSeconds = await parseMediaDurationSeconds({
          body,
          mimeType,
        });
        console.info(`${LOG_PREFIX} duration-detected`, {
          userId: user.id,
          filename: file.name,
          source: 'metadata',
          durationSeconds,
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
          error: getErrorMessage(error),
        });

        if (Number.isFinite(durationHint) && durationHint > 0) {
          durationSeconds = durationHint;
          usedDurationHint = true;
        } else {
          return respErr(
            'Failed to parse audio duration. Please use an MP3 or WAV file.'
          );
        }
      }

      const metadataToken = signSeedanceReferenceToken({
        kind: 'audio',
        url: result.url,
        durationSeconds,
      });

      uploadResults.push({
        url: result.url,
        key: result.key,
        filename: file.name,
        deduped: false,
        durationSeconds,
        metadataToken,
      });

      console.info(`${LOG_PREFIX} file-complete`, {
        userId: user.id,
        filename: file.name,
        key: result.key,
        durationSeconds,
        usedDurationHint,
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
      error instanceof Error ? error.message : 'upload audio failed'
    );
  }
}
