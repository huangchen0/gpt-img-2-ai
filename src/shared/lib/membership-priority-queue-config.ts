const DEFAULT_PRIORITY_QUEUE_WAIT_MINUTES = {
  image: [5, 10],
  video: [5, 10],
} as const;

type PriorityQueueMediaType = keyof typeof DEFAULT_PRIORITY_QUEUE_WAIT_MINUTES;

function parseQueueWaitMinutes(
  value: string | undefined,
  fallback: number
): number {
  const parsedValue = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

export function resolvePriorityQueueWaitRangeMs({
  configs,
  mediaType,
}: {
  configs?: Record<string, string>;
  mediaType: PriorityQueueMediaType;
}): [number, number] {
  const [defaultMinMinutes, defaultMaxMinutes] =
    DEFAULT_PRIORITY_QUEUE_WAIT_MINUTES[mediaType];
  const minSettingName = `${mediaType}_generation_queue_wait_min_minutes`;
  const maxSettingName = `${mediaType}_generation_queue_wait_max_minutes`;

  let minMinutes = parseQueueWaitMinutes(
    configs?.[minSettingName],
    defaultMinMinutes
  );
  let maxMinutes = parseQueueWaitMinutes(
    configs?.[maxSettingName],
    defaultMaxMinutes
  );

  if (minMinutes > maxMinutes) {
    [minMinutes, maxMinutes] = [maxMinutes, minMinutes];
  }

  return [minMinutes * 60 * 1000, maxMinutes * 60 * 1000];
}
