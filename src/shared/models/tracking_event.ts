import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { trackingEvent } from '@/config/db/schema';

export type TrackingEvent = typeof trackingEvent.$inferSelect;
export type NewTrackingEvent = typeof trackingEvent.$inferInsert;
export type UpdateTrackingEvent = Partial<Omit<NewTrackingEvent, 'id'>>;

export enum TrackingEventStatus {
  QUEUED = 'queued',
  SENT = 'sent',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export async function findTrackingEventByDedupeKey(dedupeKey: string) {
  const [result] = await db()
    .select()
    .from(trackingEvent)
    .where(eq(trackingEvent.dedupeKey, dedupeKey));

  return result;
}

export async function createTrackingEvent(newEvent: NewTrackingEvent) {
  const [result] = await db()
    .insert(trackingEvent)
    .values(newEvent)
    .returning();
  return result;
}

export async function createTrackingEventIfNotExists(
  newEvent: NewTrackingEvent
) {
  const existing = await findTrackingEventByDedupeKey(newEvent.dedupeKey);
  if (existing) {
    return {
      created: false,
      event: existing,
    };
  }

  try {
    const event = await createTrackingEvent(newEvent);
    return {
      created: true,
      event,
    };
  } catch (error) {
    const existingAfterConflict = await findTrackingEventByDedupeKey(
      newEvent.dedupeKey
    );
    if (existingAfterConflict) {
      return {
        created: false,
        event: existingAfterConflict,
      };
    }

    throw error;
  }
}

export async function updateTrackingEventById(
  id: string,
  updateEvent: UpdateTrackingEvent
) {
  const [result] = await db()
    .update(trackingEvent)
    .set(updateEvent)
    .where(eq(trackingEvent.id, id))
    .returning();

  return result;
}

export async function getTrackingEvents({
  eventName,
  userId,
  status,
  limit = 100,
}: {
  eventName?: string;
  userId?: string;
  status?: TrackingEventStatus;
  limit?: number;
}) {
  return db()
    .select()
    .from(trackingEvent)
    .where(
      and(
        eventName ? eq(trackingEvent.eventName, eventName) : undefined,
        userId ? eq(trackingEvent.userId, userId) : undefined,
        status ? eq(trackingEvent.status, status) : undefined
      )
    )
    .orderBy(desc(trackingEvent.createdAt))
    .limit(limit);
}
