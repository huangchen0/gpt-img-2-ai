export function getIsoTimestr(): string {
  return new Date().toISOString();
}

export type DateValue = Date | string | number | null | undefined;

export function parseDateValue(value: DateValue): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number') {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      return null;
    }

    if (/^\d+$/.test(normalizedValue)) {
      const parsedDate = new Date(Number(normalizedValue));
      return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    const candidate =
      normalizedValue.includes(' ') && !normalizedValue.includes('T')
        ? normalizedValue.replace(' ', 'T')
        : normalizedValue;
    const parsedDate = new Date(candidate);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  return null;
}

export function toISOStringSafe(value: DateValue): string | null {
  return parseDateValue(value)?.toISOString() ?? null;
}

export const getTimestamp = () => {
  let time = Date.parse(new Date().toUTCString());

  return time / 1000;
};

export const getMillisecond = () => {
  let time = new Date().getTime();

  return time;
};

export const getOneYearLaterTimestr = () => {
  const currentDate = new Date();
  const oneYearLater = new Date(currentDate);
  oneYearLater.setFullYear(currentDate.getFullYear() + 1);

  return oneYearLater.toISOString();
};
