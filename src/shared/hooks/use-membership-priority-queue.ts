'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { trackGtmQueueEvent } from '@/shared/lib/gtm';
import { getUuid } from '@/shared/lib/hash';

type LegacyPriorityQueueStorageVersion = 2 | 3 | 4 | 5 | 6;
type PriorityQueueStorageVersion = LegacyPriorityQueueStorageVersion | 7;

const PRIORITY_QUEUE_STORAGE_KEY = 'membership_priority_queue_v1';
const PRIORITY_QUEUE_STORAGE_VERSION: 7 = 7;
const PRIORITY_QUEUE_WAIT_RANGE_MS: [number, number] = [
  5 * 60 * 1000,
  10 * 60 * 1000,
];
const LEGACY_PRIORITY_QUEUE_WAIT_RANGES_MS: Record<
  LegacyPriorityQueueStorageVersion,
  [number, number]
> = {
  2: [(1 * 60 + 45) * 1000, (3 * 60 + 45) * 1000],
  3: [(2 * 60 + 14) * 1000, (4 * 60 + 14) * 1000],
  4: [(2 * 60 + 34) * 1000, (4 * 60 + 34) * 1000],
  5: [(2 * 60 + 54) * 1000, (4 * 60 + 54) * 1000],
  6: [4 * 60 * 1000, 8 * 60 * 1000],
};
const QUEUE_TICK_INTERVAL_MS = 1000;

export type MembershipPriorityQueueMediaType = 'image' | 'video';
export type MembershipPriorityQueueScope = string;
export type MembershipPriorityQueueStatus =
  | 'queued'
  | 'submitting'
  | 'submit_failed';

interface PersistedMembershipPriorityQueue {
  version: PriorityQueueStorageVersion;
  queueId: string;
  userId: string;
  mediaType: MembershipPriorityQueueMediaType;
  scope: MembershipPriorityQueueScope;
  startedAt: number;
  waitMs: number;
  snapshotDigest: string;
  payload: string;
  submitted: boolean;
  submitFailed: boolean;
}

export interface MembershipPriorityQueueState {
  queueId: string;
  mediaType: MembershipPriorityQueueMediaType;
  scope: MembershipPriorityQueueScope;
  status: MembershipPriorityQueueStatus;
  startedAt: number;
  waitMs: number;
  snapshotDigest: string;
  remainingMs: number;
}

export interface StartMembershipPriorityQueueOptions {
  forceQueue?: boolean;
}

export interface StartMembershipPriorityQueueResult {
  status:
    | 'submitted'
    | 'queued'
    | 'restored_current_queue'
    | 'existing_other_queue'
    | 'submission_failed';
  queue?: MembershipPriorityQueueState;
}

export interface UseMembershipPriorityQueueOptions {
  mediaType: MembershipPriorityQueueMediaType;
  scope?: MembershipPriorityQueueScope;
  userId: string | null;
  enabled: boolean;
  waitRangeMs: [number, number];
  snapshotDigest: string;
  serializedPayload: string;
  onSubmit: (serializedPayload: string) => Promise<boolean>;
  trackingConfigs?: Record<string, string>;
}

function hasWindow() {
  return typeof window !== 'undefined';
}

export function clearMembershipPriorityQueueStorage() {
  if (!hasWindow()) {
    return;
  }

  window.sessionStorage.removeItem(PRIORITY_QUEUE_STORAGE_KEY);
}

function remapPriorityQueueWaitMs(
  waitMs: number,
  fromRange: [number, number],
  toRange: [number, number]
) {
  const [fromMin, fromMax] = fromRange;
  const [toMin, toMax] = toRange;

  if (fromMax <= fromMin) {
    return toMin;
  }

  const progress = (waitMs - fromMin) / (fromMax - fromMin);
  const normalizedProgress = Math.min(1, Math.max(0, progress));

  return Math.round(toMin + (toMax - toMin) * normalizedProgress);
}

function migrateStoredQueue(
  queue: PersistedMembershipPriorityQueue | null
): PersistedMembershipPriorityQueue | null {
  if (!queue) {
    return null;
  }

  if (queue.version === PRIORITY_QUEUE_STORAGE_VERSION) {
    return queue;
  }

  const fromRange = LEGACY_PRIORITY_QUEUE_WAIT_RANGES_MS[queue.version];

  return {
    ...queue,
    version: PRIORITY_QUEUE_STORAGE_VERSION,
    waitMs: remapPriorityQueueWaitMs(
      queue.waitMs,
      fromRange,
      PRIORITY_QUEUE_WAIT_RANGE_MS
    ),
  };
}

function readStoredQueue() {
  if (!hasWindow()) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(PRIORITY_QUEUE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PersistedMembershipPriorityQueue | null;
    const migratedQueue = migrateStoredQueue(parsed);
    const scope =
      typeof migratedQueue?.scope === 'string' && migratedQueue.scope.trim()
        ? migratedQueue.scope
        : migratedQueue?.mediaType;
    if (
      !migratedQueue ||
      migratedQueue.version !== PRIORITY_QUEUE_STORAGE_VERSION ||
      !migratedQueue.queueId ||
      !migratedQueue.userId ||
      !migratedQueue.mediaType ||
      !scope ||
      typeof migratedQueue.startedAt !== 'number' ||
      typeof migratedQueue.waitMs !== 'number' ||
      typeof migratedQueue.snapshotDigest !== 'string' ||
      typeof migratedQueue.payload !== 'string' ||
      typeof migratedQueue.submitted !== 'boolean' ||
      typeof migratedQueue.submitFailed !== 'boolean'
    ) {
      clearMembershipPriorityQueueStorage();
      return null;
    }

    const normalizedQueue =
      migratedQueue.submitted && !migratedQueue.submitFailed
        ? {
            ...migratedQueue,
            submitted: false,
            submitFailed: true,
          }
        : migratedQueue;

    if (normalizedQueue !== parsed) {
      writeStoredQueue(normalizedQueue);
    }

    return {
      ...normalizedQueue,
      scope,
    };
  } catch {
    clearMembershipPriorityQueueStorage();
    return null;
  }
}

function writeStoredQueue(queue: PersistedMembershipPriorityQueue) {
  if (!hasWindow()) {
    return;
  }

  window.sessionStorage.setItem(
    PRIORITY_QUEUE_STORAGE_KEY,
    JSON.stringify(queue)
  );
}

function clearStoredQueue() {
  clearMembershipPriorityQueueStorage();
}

function getRemainingMs(queue: PersistedMembershipPriorityQueue) {
  return Math.max(0, queue.startedAt + queue.waitMs - Date.now());
}

function toQueueState(
  queue: PersistedMembershipPriorityQueue,
  status: MembershipPriorityQueueStatus
): MembershipPriorityQueueState {
  return {
    queueId: queue.queueId,
    mediaType: queue.mediaType,
    scope: queue.scope,
    status,
    startedAt: queue.startedAt,
    waitMs: queue.waitMs,
    snapshotDigest: queue.snapshotDigest,
    remainingMs: status === 'queued' ? getRemainingMs(queue) : 0,
  };
}

function randomIntBetween(min: number, max: number) {
  const normalizedMin = Math.ceil(Math.min(min, max));
  const normalizedMax = Math.floor(Math.max(min, max));

  return (
    Math.floor(Math.random() * (normalizedMax - normalizedMin + 1)) +
    normalizedMin
  );
}

function createQueueEntry({
  mediaType,
  scope,
  userId,
  waitRangeMs,
  snapshotDigest,
  serializedPayload,
}: {
  mediaType: MembershipPriorityQueueMediaType;
  scope: MembershipPriorityQueueScope;
  userId: string;
  waitRangeMs: [number, number];
  snapshotDigest: string;
  serializedPayload: string;
}) {
  return {
    version: PRIORITY_QUEUE_STORAGE_VERSION,
    queueId: getUuid(),
    userId,
    mediaType,
    scope,
    startedAt: Date.now(),
    waitMs: randomIntBetween(waitRangeMs[0], waitRangeMs[1]),
    snapshotDigest,
    payload: serializedPayload,
    submitted: false,
    submitFailed: false,
  } satisfies PersistedMembershipPriorityQueue;
}

export function formatPriorityQueueRemainingTime(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function useMembershipPriorityQueue({
  mediaType,
  scope = mediaType,
  userId,
  enabled,
  waitRangeMs,
  snapshotDigest,
  serializedPayload,
  onSubmit,
  trackingConfigs,
}: UseMembershipPriorityQueueOptions) {
  const [queueState, setQueueState] =
    useState<MembershipPriorityQueueState | null>(null);
  const queueRef = useRef<PersistedMembershipPriorityQueue | null>(null);
  const submitRef = useRef(onSubmit);
  const trackingConfigsRef = useRef(trackingConfigs);
  const mountedRef = useRef(false);

  useEffect(() => {
    submitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    trackingConfigsRef.current = trackingConfigs;
  }, [trackingConfigs]);

  const applyQueueState = useCallback(
    (
      queue: PersistedMembershipPriorityQueue | null,
      status?: MembershipPriorityQueueStatus
    ) => {
      queueRef.current = queue;

      if (!mountedRef.current) {
        return;
      }

      if (!queue || !status) {
        setQueueState(null);
        return;
      }

      setQueueState(toQueueState(queue, status));
    },
    []
  );

  const clearQueue = useCallback(() => {
    clearStoredQueue();
    applyQueueState(null);
  }, [applyQueueState]);

  const markQueueAsFailed = useCallback(
    (queue: PersistedMembershipPriorityQueue) => {
      const failedQueue: PersistedMembershipPriorityQueue = {
        ...queue,
        submitted: false,
        submitFailed: true,
      };

      writeStoredQueue(failedQueue);
      applyQueueState(failedQueue, 'submit_failed');
    },
    [applyQueueState]
  );

  const submitQueuedRequest = useCallback(
    async (queue?: PersistedMembershipPriorityQueue | null) => {
      const currentQueue = queue ?? queueRef.current;
      if (!currentQueue || currentQueue.submitted) {
        return false;
      }

      trackGtmQueueEvent({
        eventName: 'queue_completed',
        queueId: currentQueue.queueId,
        mediaType: currentQueue.mediaType,
        waitMs: currentQueue.waitMs,
        remainingMs: 0,
        snapshotDigest: currentQueue.snapshotDigest,
        configs: trackingConfigsRef.current,
      });

      const submittedQueue: PersistedMembershipPriorityQueue = {
        ...currentQueue,
        submitted: true,
        submitFailed: false,
      };
      writeStoredQueue(submittedQueue);
      applyQueueState(submittedQueue, 'submitting');

      trackGtmQueueEvent({
        eventName: 'queue_submit_started',
        queueId: submittedQueue.queueId,
        mediaType: submittedQueue.mediaType,
        waitMs: submittedQueue.waitMs,
        remainingMs: 0,
        snapshotDigest: submittedQueue.snapshotDigest,
        configs: trackingConfigsRef.current,
      });

      try {
        const didSubmit = await submitRef.current(submittedQueue.payload);
        if (didSubmit) {
          clearQueue();
          return true;
        }
      } catch (error) {
        console.error('Failed to submit queued request:', error);
      }

      markQueueAsFailed(currentQueue);
      return false;
    },
    [applyQueueState, clearQueue, markQueueAsFailed]
  );

  const retryQueue = useCallback(async () => {
    const currentQueue = queueRef.current;
    if (!currentQueue) {
      return false;
    }

    const retryableQueue: PersistedMembershipPriorityQueue = {
      ...currentQueue,
      submitted: false,
      submitFailed: false,
    };

    writeStoredQueue(retryableQueue);
    return submitQueuedRequest(retryableQueue);
  }, [submitQueuedRequest]);

  const startQueue = useCallback(
    async (
      options?: StartMembershipPriorityQueueOptions
    ): Promise<StartMembershipPriorityQueueResult> => {
      if (!userId) {
        return {
          status: 'submission_failed',
        };
      }

      const shouldQueue = options?.forceQueue ?? enabled;
      let existingQueue = readStoredQueue();

      if (existingQueue && existingQueue.userId !== userId) {
        clearStoredQueue();
        existingQueue = null;
      }

      if (existingQueue) {
        if (existingQueue.scope !== scope) {
          return {
            status: 'existing_other_queue',
            queue: toQueueState(
              existingQueue,
              existingQueue.submitFailed ? 'submit_failed' : 'queued'
            ),
          };
        }

        if (existingQueue.snapshotDigest === snapshotDigest) {
          if (existingQueue.submitFailed) {
            applyQueueState(existingQueue, 'submit_failed');
            return {
              status: 'restored_current_queue',
              queue: toQueueState(existingQueue, 'submit_failed'),
            };
          }

          applyQueueState(existingQueue, 'queued');

          if (getRemainingMs(existingQueue) <= 0) {
            const didSubmit = await submitQueuedRequest(existingQueue);
            const currentQueue = queueRef.current;

            return {
              status: didSubmit ? 'restored_current_queue' : 'submission_failed',
              queue: currentQueue
                ? toQueueState(
                    currentQueue,
                    didSubmit ? 'queued' : 'submit_failed'
                  )
                : undefined,
            };
          }

          return {
            status: 'restored_current_queue',
            queue: toQueueState(existingQueue, 'queued'),
          };
        }
      }

      if (!shouldQueue) {
        try {
          const didSubmit = await submitRef.current(serializedPayload);
          return {
            status: didSubmit ? 'submitted' : 'submission_failed',
          };
        } catch (error) {
          console.error('Failed to submit queued request:', error);
          return {
            status: 'submission_failed',
          };
        }
      }

      const queue = createQueueEntry({
        mediaType,
        scope,
        userId,
        waitRangeMs,
        snapshotDigest,
        serializedPayload,
      });

      writeStoredQueue(queue);
      applyQueueState(queue, 'queued');

      trackGtmQueueEvent({
        eventName: 'queue_shown',
        queueId: queue.queueId,
        mediaType: queue.mediaType,
        waitMs: queue.waitMs,
        remainingMs: queue.waitMs,
        snapshotDigest: queue.snapshotDigest,
        configs: trackingConfigsRef.current,
      });

      return {
        status: 'queued',
        queue: toQueueState(queue, 'queued'),
      };
    },
    [
      applyQueueState,
      enabled,
      mediaType,
      scope,
      serializedPayload,
      snapshotDigest,
      submitQueuedRequest,
      userId,
      waitRangeMs,
    ]
  );

  const cancelQueue = useCallback(() => {
    const currentQueue = queueRef.current;
    if (!currentQueue) {
      return;
    }

    trackGtmQueueEvent({
      eventName: 'queue_cancelled',
      queueId: currentQueue.queueId,
      mediaType: currentQueue.mediaType,
      waitMs: currentQueue.waitMs,
      remainingMs: getRemainingMs(currentQueue),
      snapshotDigest: currentQueue.snapshotDigest,
      configs: trackingConfigsRef.current,
    });

    clearQueue();
  }, [clearQueue]);

  const trackUpgradeClick = useCallback(() => {
    const currentQueue = queueRef.current;
    if (!currentQueue) {
      return;
    }

    trackGtmQueueEvent({
      eventName: 'queue_upgrade_clicked',
      queueId: currentQueue.queueId,
      mediaType: currentQueue.mediaType,
      waitMs: currentQueue.waitMs,
      remainingMs: getRemainingMs(currentQueue),
      snapshotDigest: currentQueue.snapshotDigest,
      configs: trackingConfigsRef.current,
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!userId) {
      clearQueue();
      return () => {
        mountedRef.current = false;
      };
    }

    const restoredQueue = readStoredQueue();
    if (!restoredQueue) {
      return () => {
        mountedRef.current = false;
      };
    }

    if (restoredQueue.userId !== userId) {
      clearStoredQueue();
      applyQueueState(null);
      return () => {
        mountedRef.current = false;
      };
    }

    if (restoredQueue.scope === scope) {
      if (restoredQueue.submitFailed) {
        applyQueueState(restoredQueue, 'submit_failed');
        return () => {
          mountedRef.current = false;
        };
      }

      const remainingMs = getRemainingMs(restoredQueue);

      if (remainingMs <= 0) {
        void submitQueuedRequest(restoredQueue);
        return () => {
          mountedRef.current = false;
        };
      }

      applyQueueState(restoredQueue, 'queued');
      trackGtmQueueEvent({
        eventName: 'queue_restored_after_refresh',
        queueId: restoredQueue.queueId,
        mediaType: restoredQueue.mediaType,
        waitMs: restoredQueue.waitMs,
        remainingMs,
        snapshotDigest: restoredQueue.snapshotDigest,
        configs: trackingConfigsRef.current,
      });
    }

    return () => {
      mountedRef.current = false;
    };
  }, [applyQueueState, clearQueue, scope, submitQueuedRequest, userId]);

  useEffect(() => {
    if (enabled || queueState?.status !== 'queued') {
      return;
    }

    void submitQueuedRequest(queueRef.current);
  }, [enabled, queueState?.status, submitQueuedRequest]);

  useEffect(() => {
    if (queueState?.status !== 'queued') {
      return;
    }

    const tick = () => {
      const currentQueue = queueRef.current;
      if (!currentQueue) {
        return;
      }

      const remainingMs = getRemainingMs(currentQueue);
      if (remainingMs <= 0) {
        void submitQueuedRequest(currentQueue);
        return;
      }

      setQueueState((prev) =>
        prev
          ? {
              ...prev,
              remainingMs,
            }
          : prev
      );
    };

    tick();
    const timer = window.setInterval(tick, QUEUE_TICK_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [queueState?.status, submitQueuedRequest]);

  return {
    queueState,
    isQueueActive: queueState !== null,
    isQueueSubmitting: queueState?.status === 'submitting',
    startQueue,
    cancelQueue,
    retryQueue,
    trackUpgradeClick,
  };
}
