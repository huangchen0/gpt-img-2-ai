import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import { siteActivityDaily } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';
import { getCurrentSiteCode } from '@/shared/lib/site';

import { touchUserSiteContext } from './user';

export type SiteActivityDaily = typeof siteActivityDaily.$inferSelect;
export type NewSiteActivityDaily = typeof siteActivityDaily.$inferInsert;

function sanitizeVisitorId(value: string) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, '')
    .slice(0, 191);
}

function sanitizePath(value?: string | null) {
  const path = String(value || '').trim();
  if (!path) {
    return '/';
  }

  return path.startsWith('/') ? path.slice(0, 255) : `/${path.slice(0, 254)}`;
}

export function getActivityDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function recordSiteActivity({
  visitorId,
  userId,
  site,
  path,
  occurredAt = new Date(),
}: {
  visitorId: string;
  userId?: string | null;
  site?: string;
  path?: string | null;
  occurredAt?: Date;
}) {
  const normalizedVisitorId = sanitizeVisitorId(visitorId);
  if (!normalizedVisitorId) {
    throw new Error('visitor id is required');
  }

  const currentSite = site || getCurrentSiteCode();
  const activityDate = getActivityDateKey(occurredAt);
  const activityPath = sanitizePath(path);

  const [activity] = await db()
    .insert(siteActivityDaily)
    .values({
      id: getUuid(),
      site: currentSite,
      activityDate,
      visitorId: normalizedVisitorId,
      userId: userId || null,
      firstPath: activityPath,
      lastPath: activityPath,
      hitCount: 1,
      firstSeenAt: occurredAt,
      lastSeenAt: occurredAt,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    })
    .onConflictDoUpdate({
      target: [
        siteActivityDaily.site,
        siteActivityDaily.activityDate,
        siteActivityDaily.visitorId,
      ],
      set: {
        userId: userId
          ? (sql`coalesce(${siteActivityDaily.userId}, ${userId})` as any)
          : siteActivityDaily.userId,
        lastPath: activityPath,
        hitCount: sql`${siteActivityDaily.hitCount} + 1`,
        lastSeenAt: occurredAt,
        updatedAt: occurredAt,
      },
    })
    .returning();

  if (userId) {
    await touchUserSiteContext(userId, {
      site: currentSite,
      occurredAt,
    });
  }

  return {
    activity,
    created: activity?.hitCount === 1,
  };
}

export async function getSiteDailyActiveCounts({
  site,
  startDate,
  endDate,
}: {
  site?: string;
  startDate?: string;
  endDate?: string;
} = {}) {
  return db()
    .select({
      site: siteActivityDaily.site,
      activityDate: siteActivityDaily.activityDate,
      activeVisitors: sql<number>`cast(count(*) as integer)`,
      activeUsers: sql<number>`cast(count(distinct ${siteActivityDaily.userId}) as integer)`,
    })
    .from(siteActivityDaily)
    .where(
      and(
        site ? eq(siteActivityDaily.site, site) : undefined,
        startDate ? gte(siteActivityDaily.activityDate, startDate) : undefined,
        endDate ? lte(siteActivityDaily.activityDate, endDate) : undefined
      )
    )
    .groupBy(siteActivityDaily.site, siteActivityDaily.activityDate)
    .orderBy(desc(siteActivityDaily.activityDate), siteActivityDaily.site);
}
