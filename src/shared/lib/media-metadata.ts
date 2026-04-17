import { parseBuffer } from 'music-metadata';

export type ParsedMediaMetadata = {
  durationSeconds?: number;
  width?: number;
  height?: number;
};

function normalizePositiveInteger(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : undefined;
}

export async function parseMediaMetadata({
  body,
  mimeType,
}: {
  body: Uint8Array;
  mimeType: string;
}): Promise<ParsedMediaMetadata> {
  const metadata = await parseBuffer(Buffer.from(body), {
    mimeType,
    size: body.byteLength,
  });

  const videoTrack = metadata.format.trackInfo.find((track) => track.video);

  return {
    durationSeconds:
      typeof metadata.format.duration === 'number' &&
      Number.isFinite(metadata.format.duration) &&
      metadata.format.duration > 0
        ? metadata.format.duration
        : undefined,
    width: normalizePositiveInteger(
      videoTrack?.video?.pixelWidth ?? videoTrack?.video?.displayWidth
    ),
    height: normalizePositiveInteger(
      videoTrack?.video?.pixelHeight ?? videoTrack?.video?.displayHeight
    ),
  };
}

export async function parseMediaDurationSeconds({
  body,
  mimeType,
}: {
  body: Uint8Array;
  mimeType: string;
}) {
  const metadata = await parseMediaMetadata({
    body,
    mimeType,
  });

  if (
    typeof metadata.durationSeconds !== 'number' ||
    !Number.isFinite(metadata.durationSeconds) ||
    metadata.durationSeconds <= 0
  ) {
    throw new Error('failed to parse media duration');
  }

  return metadata.durationSeconds;
}
