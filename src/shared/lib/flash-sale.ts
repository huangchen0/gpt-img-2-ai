const HOUR_IN_MS = 60 * 60 * 1000;

export const FLASH_SALE_DURATION_DEFAULT_HOURS = 24;
export const FLASH_SALE_DURATION_MIN_HOURS = 1;
export const FLASH_SALE_DURATION_MAX_HOURS = 168;

export function isFlashSaleEnabled(value: unknown): boolean {
  return String(value ?? '').toLowerCase() === 'true';
}

export function parseFlashSaleStartedAtMs(value: unknown): number | null {
  if (!value) {
    return null;
  }

  const timestamp =
    value instanceof Date
      ? value.getTime()
      : typeof value === 'number'
        ? value
        : new Date(String(value)).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function parseFlashSaleDurationHours(value: unknown): number | null {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (
    !Number.isFinite(parsed) ||
    !Number.isInteger(parsed) ||
    parsed < FLASH_SALE_DURATION_MIN_HOURS ||
    parsed > FLASH_SALE_DURATION_MAX_HOURS
  ) {
    return null;
  }

  return parsed;
}

export function validateFlashSaleDurationHours(value: unknown): number {
  const parsed = parseFlashSaleDurationHours(value);
  if (parsed === null) {
    throw new Error(
      `pricing_flash_sale_duration_hours must be an integer between ${FLASH_SALE_DURATION_MIN_HOURS} and ${FLASH_SALE_DURATION_MAX_HOURS}`
    );
  }

  return parsed;
}

export function shouldResetFlashSaleStartedAt({
  prevEnabled,
  nextEnabled,
  startedAt,
}: {
  prevEnabled: boolean;
  nextEnabled: boolean;
  startedAt: unknown;
}): boolean {
  if (!nextEnabled) {
    return false;
  }

  if (!prevEnabled) {
    return true;
  }

  return parseFlashSaleStartedAtMs(startedAt) === null;
}

export function getFlashSaleWindow({
  enabled,
  durationHours,
  startedAt,
  nowMs,
}: {
  enabled: unknown;
  durationHours: unknown;
  startedAt: unknown;
  nowMs: number;
}) {
  const isEnabled = isFlashSaleEnabled(enabled);
  const parsedDurationHours = parseFlashSaleDurationHours(durationHours);
  const startedAtMs = parseFlashSaleStartedAtMs(startedAt);

  if (!isEnabled || parsedDurationHours === null || startedAtMs === null) {
    return {
      isConfigured: false,
      isActive: false,
      startedAtMs: null,
      endsAtMs: null,
      remainingMs: null,
    };
  }

  const endsAtMs = startedAtMs + parsedDurationHours * HOUR_IN_MS;
  const remainingMs = endsAtMs - nowMs;

  return {
    isConfigured: true,
    isActive: remainingMs > 0,
    startedAtMs,
    endsAtMs,
    remainingMs,
  };
}

export function parsePriceLikeNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value)
    .trim()
    .replace(/[^0-9.,-]/g, '')
    .replace(/,/g, '');

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getSavingsPercent({
  price,
  originalPrice,
}: {
  price: unknown;
  originalPrice: unknown;
}): number | null {
  const current = parsePriceLikeNumber(price);
  const original = parsePriceLikeNumber(originalPrice);

  if (
    current === null ||
    original === null ||
    original <= 0 ||
    current <= 0 ||
    original <= current
  ) {
    return null;
  }

  const percent = Math.round(((original - current) / original) * 100);
  return percent > 0 ? percent : null;
}
