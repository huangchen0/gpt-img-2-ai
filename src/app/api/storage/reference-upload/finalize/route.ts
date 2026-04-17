import { parseMediaMetadata } from '@/shared/lib/media-metadata';
import { respData, respErr } from '@/shared/lib/resp';
import {
  signSeedanceReferenceToken,
  verifySeedanceReferenceUploadToken,
} from '@/shared/lib/seedance-reference-server';
import { getUserInfo } from '@/shared/models/user';

export const runtime = 'nodejs';
export const maxDuration = 60;
const LOG_PREFIX = '[storage.reference-upload.finalize]';

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

type ReferenceUploadKind = 'video' | 'audio';

async function fetchUploadedObject(urls: string[]) {
  const candidates = Array.from(new Set(urls.filter(Boolean)));
  let lastStatus = 0;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    for (const url of candidates) {
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
      });

      if (response.ok) {
        return response;
      }

      lastStatus = response.status;
    }

    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  throw new Error(`uploaded file is not accessible yet (${lastStatus || 0})`);
}

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const {
      kind,
      uploadToken,
      durationSeconds: rawDurationHint,
      width: rawWidthHint,
      height: rawHeightHint,
    } = await request.json();
    const durationHint =
      typeof rawDurationHint === 'number' ? rawDurationHint : NaN;
    const widthHint = typeof rawWidthHint === 'number' ? rawWidthHint : NaN;
    const heightHint = typeof rawHeightHint === 'number' ? rawHeightHint : NaN;
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
      kind,
      hasUploadToken:
        typeof uploadToken === 'string' && uploadToken.trim().length > 0,
      durationHint: Number.isFinite(durationHint) ? durationHint : undefined,
      widthHint: normalizedWidthHint,
      heightHint: normalizedHeightHint,
    });
    if (kind !== 'video' && kind !== 'audio') {
      console.warn(`${LOG_PREFIX} invalid-kind`, {
        userId: user.id,
        kind,
      });
      return respErr('invalid reference upload kind');
    }

    if (typeof uploadToken !== 'string' || !uploadToken.trim()) {
      console.warn(`${LOG_PREFIX} invalid-upload-token`, {
        userId: user.id,
        kind,
      });
      return respErr('invalid upload token');
    }

    const verifiedUpload = verifySeedanceReferenceUploadToken({
      token: uploadToken.trim(),
      userId: user.id,
      kind: kind as ReferenceUploadKind,
    });
    if (!verifiedUpload) {
      console.warn(`${LOG_PREFIX} upload-token-verification-failed`, {
        userId: user.id,
        kind,
      });
      return respErr('invalid upload token');
    }

    console.info(`${LOG_PREFIX} token-verified`, {
      userId: user.id,
      kind,
      key: verifiedUpload.key,
      mimeType: verifiedUpload.mimeType,
      url: verifiedUpload.url,
    });

    const uploadedResponse = await fetchUploadedObject([
      verifiedUpload.probeUrl || '',
      verifiedUpload.url,
    ]);
    const body = new Uint8Array(await uploadedResponse.arrayBuffer());
    console.info(`${LOG_PREFIX} object-fetched`, {
      userId: user.id,
      kind,
      key: verifiedUpload.key,
      status: uploadedResponse.status,
      contentType: uploadedResponse.headers.get('content-type') || undefined,
      contentLength:
        uploadedResponse.headers.get('content-length') || undefined,
    });

    let durationSeconds: number;
    let parsedWidth: number | undefined;
    let parsedHeight: number | undefined;
    let usedDurationHint = false;
    try {
      const metadata = await parseMediaMetadata({
        body,
        mimeType: verifiedUpload.mimeType,
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
        kind,
        key: verifiedUpload.key,
        source: 'metadata',
        durationSeconds,
        width: parsedWidth,
        height: parsedHeight,
      });
    } catch (error) {
      console.warn(`${LOG_PREFIX} duration-parse-failed`, {
        userId: user.id,
        kind,
        key: verifiedUpload.key,
        url: verifiedUpload.url,
        mimeType: verifiedUpload.mimeType,
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
        return respErr(
          kind === 'video'
            ? 'Failed to parse video duration. Please use an MP4 or MOV file.'
            : 'Failed to parse audio duration. Please use an MP3 or WAV file.'
        );
      }
    }

    const resolvedWidth = parsedWidth ?? normalizedWidthHint;
    const resolvedHeight = parsedHeight ?? normalizedHeightHint;
    const usedDimensionHints =
      (resolvedWidth ?? 0) !== (parsedWidth ?? 0) ||
      (resolvedHeight ?? 0) !== (parsedHeight ?? 0);

    const metadataToken = signSeedanceReferenceToken({
      kind: kind as ReferenceUploadKind,
      url: verifiedUpload.url,
      durationSeconds,
      width: resolvedWidth,
      height: resolvedHeight,
    });

    console.info(`${LOG_PREFIX} success`, {
      userId: user.id,
      kind,
      key: verifiedUpload.key,
      durationSeconds,
      width: resolvedWidth,
      height: resolvedHeight,
      usedDurationHint,
      usedDimensionHints,
    });

    return respData({
      key: verifiedUpload.key,
      url: verifiedUpload.url,
      durationSeconds,
      width: resolvedWidth,
      height: resolvedHeight,
      metadataToken,
      mimeType: verifiedUpload.mimeType,
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} request-failed`, {
      error: getErrorMessage(error),
    });
    return respErr(
      error instanceof Error
        ? error.message
        : 'finalize reference upload failed'
    );
  }
}
