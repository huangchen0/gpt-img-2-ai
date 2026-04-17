import { createHmac, timingSafeEqual } from 'node:crypto';

import { envConfigs } from '@/config';

export type SeedanceReferenceKind = 'video' | 'audio';
export const SEEDANCE_REFERENCE_TOKEN_TTL_SECONDS = 24 * 60 * 60;
const SEEDANCE_REFERENCE_TOKEN_TTL_MS =
  SEEDANCE_REFERENCE_TOKEN_TTL_SECONDS * 1000;
const SEEDANCE_REFERENCE_TOKEN_CLOCK_SKEW_MS = 5 * 60 * 1000;

type SeedanceReferenceTokenPayload = {
  v: 1;
  kind: SeedanceReferenceKind;
  url: string;
  durationSeconds: number;
  width?: number;
  height?: number;
  iat: number;
};

type SeedanceReferenceUploadTokenPayload = {
  v: 1;
  purpose: 'upload';
  userId: string;
  kind: SeedanceReferenceKind;
  key: string;
  url: string;
  probeUrl?: string;
  mimeType: string;
  iat: number;
};

function getSeedanceReferenceSecret() {
  const secret = envConfigs.auth_secret || process.env.AUTH_SECRET || '';

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'seedance-reference-dev-secret';
  }

  throw new Error('missing seedance reference signing secret');
}

function signPayload(payloadBase64Url: string) {
  return createHmac('sha256', getSeedanceReferenceSecret())
    .update(payloadBase64Url)
    .digest('base64url');
}

function encodePayload(payload: SeedanceReferenceTokenPayload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function encodeUploadPayload(payload: SeedanceReferenceUploadTokenPayload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(tokenPart: string): SeedanceReferenceTokenPayload | null {
  try {
    const raw = Buffer.from(tokenPart, 'base64url').toString('utf8');
    const payload = JSON.parse(raw) as Partial<SeedanceReferenceTokenPayload>;

    if (
      payload?.v !== 1 ||
      (payload?.kind !== 'video' && payload?.kind !== 'audio') ||
      typeof payload?.url !== 'string' ||
      typeof payload?.durationSeconds !== 'number' ||
      !Number.isFinite(payload.durationSeconds) ||
      (payload?.width !== undefined &&
        (typeof payload.width !== 'number' ||
          !Number.isFinite(payload.width) ||
          payload.width <= 0)) ||
      (payload?.height !== undefined &&
        (typeof payload.height !== 'number' ||
          !Number.isFinite(payload.height) ||
          payload.height <= 0)) ||
      typeof payload?.iat !== 'number'
    ) {
      return null;
    }

    return payload as SeedanceReferenceTokenPayload;
  } catch {
    return null;
  }
}

function decodeUploadPayload(
  tokenPart: string
): SeedanceReferenceUploadTokenPayload | null {
  try {
    const raw = Buffer.from(tokenPart, 'base64url').toString('utf8');
    const payload = JSON.parse(raw) as Partial<SeedanceReferenceUploadTokenPayload>;

    if (
      payload?.v !== 1 ||
      payload?.purpose !== 'upload' ||
      (payload?.kind !== 'video' && payload?.kind !== 'audio') ||
      typeof payload?.userId !== 'string' ||
      typeof payload?.key !== 'string' ||
      typeof payload?.url !== 'string' ||
      (payload?.probeUrl !== undefined && typeof payload.probeUrl !== 'string') ||
      typeof payload?.mimeType !== 'string' ||
      typeof payload?.iat !== 'number'
    ) {
      return null;
    }

    return payload as SeedanceReferenceUploadTokenPayload;
  } catch {
    return null;
  }
}

function isFreshIat(iat: number) {
  const now = Date.now();

  if (iat > now + SEEDANCE_REFERENCE_TOKEN_CLOCK_SKEW_MS) {
    return false;
  }

  return now - iat <= SEEDANCE_REFERENCE_TOKEN_TTL_MS;
}

export function signSeedanceReferenceToken({
  kind,
  url,
  durationSeconds,
  width,
  height,
}: {
  kind: SeedanceReferenceKind;
  url: string;
  durationSeconds: number;
  width?: number;
  height?: number;
}) {
  const payload: SeedanceReferenceTokenPayload = {
    v: 1,
    kind,
    url,
    durationSeconds,
    iat: Date.now(),
  };

  if (typeof width === 'number' && Number.isFinite(width) && width > 0) {
    payload.width = Math.round(width);
  }

  if (typeof height === 'number' && Number.isFinite(height) && height > 0) {
    payload.height = Math.round(height);
  }

  const payloadBase64Url = encodePayload(payload);
  const signature = signPayload(payloadBase64Url);

  return `${payloadBase64Url}.${signature}`;
}

export function verifySeedanceReferenceToken({
  token,
  kind,
  url,
}: {
  token: string;
  kind: SeedanceReferenceKind;
  url: string;
}) {
  const [payloadBase64Url, signature] = token.split('.');
  if (!payloadBase64Url || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payloadBase64Url);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  const payload = decodePayload(payloadBase64Url);
  if (!payload) {
    return null;
  }

  if (
    payload.kind !== kind ||
    payload.url !== url ||
    !isFreshIat(payload.iat)
  ) {
    return null;
  }

  return payload;
}

export function signSeedanceReferenceUploadToken({
  userId,
  kind,
  key,
  url,
  probeUrl,
  mimeType,
}: {
  userId: string;
  kind: SeedanceReferenceKind;
  key: string;
  url: string;
  probeUrl?: string;
  mimeType: string;
}) {
  const payload: SeedanceReferenceUploadTokenPayload = {
    v: 1,
    purpose: 'upload',
    userId,
    kind,
    key,
    url,
    probeUrl,
    mimeType,
    iat: Date.now(),
  };

  const payloadBase64Url = encodeUploadPayload(payload);
  const signature = signPayload(payloadBase64Url);

  return `${payloadBase64Url}.${signature}`;
}

export function verifySeedanceReferenceUploadToken({
  token,
  userId,
  kind,
}: {
  token: string;
  userId: string;
  kind: SeedanceReferenceKind;
}) {
  const [payloadBase64Url, signature] = token.split('.');
  if (!payloadBase64Url || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payloadBase64Url);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  const payload = decodeUploadPayload(payloadBase64Url);
  if (!payload) {
    return null;
  }

  if (
    payload.userId !== userId ||
    payload.kind !== kind ||
    !isFreshIat(payload.iat)
  ) {
    return null;
  }

  return payload;
}
