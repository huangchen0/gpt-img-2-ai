import { headers } from 'next/headers';
import { and, count, desc, eq, inArray } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { account, user } from '@/config/db/schema';
import { md5 } from '@/shared/lib/hash';
import { getCurrentSiteCode } from '@/shared/lib/site';

import type { Permission, Role } from '../services/rbac';
import { getRemainingCredits } from './credit';

export interface UserCredits {
  remainingCredits: number;
  expiresAt: Date | null;
}

export type User = typeof user.$inferSelect & {
  isAdmin?: boolean;
  credits?: UserCredits;
  roles?: Role[];
  permissions?: Permission[];
};
export type NewUser = typeof user.$inferInsert;
export type UpdateUser = Partial<Omit<NewUser, 'id' | 'createdAt' | 'email'>>;

export interface ActivationDecision {
  activated: boolean;
  reason:
    | 'tracked'
    | 'already_activated'
    | 'outside_activation_window'
    | 'invalid_created_at'
    | 'user_not_found'
    | 'schema_unavailable';
}

export async function updateUser(userId: string, updatedUser: UpdateUser) {
  const [result] = await db()
    .update(user)
    .set(updatedUser)
    .where(eq(user.id, userId))
    .returning();

  return result;
}

export async function touchUserSiteContext(
  userId: string,
  {
    site,
    occurredAt = new Date(),
  }: {
    site?: string;
    occurredAt?: Date;
  } = {}
) {
  if (!userId) {
    return null;
  }

  const [result] = await db()
    .update(user)
    .set({
      lastSeenSite: site || getCurrentSiteCode(),
      lastActiveAt: occurredAt,
    })
    .where(eq(user.id, userId))
    .returning();

  return result;
}

export async function markUserActivated(_userId: string) {
  return null;
}

export async function markUserActivatedIfEligible(
  _userId: string,
  _options: { activationWindowMs?: number } = {}
): Promise<ActivationDecision> {
  return { activated: false, reason: 'schema_unavailable' };
}

export async function findUserById(userId: string) {
  const [result] = await db().select().from(user).where(eq(user.id, userId));

  return result;
}

export function createUserReferralCode(userId: string, prefix = 'r') {
  const safePrefix = prefix.replace(/[^\w-]/g, '').slice(0, 8) || 'r';
  return `${safePrefix}${md5(userId).slice(0, 15)}`;
}

export async function ensureUserReferralCode(userId: string) {
  const [existingUser] = await db()
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!existingUser) {
    return null;
  }

  if (existingUser.referralCode) {
    return existingUser.referralCode;
  }

  const { getAllConfigs } = await import('./config');
  const configs = await getAllConfigs();
  const referralCode = createUserReferralCode(
    userId,
    configs.referral_code_prefix || 'r'
  );
  await db().update(user).set({ referralCode }).where(eq(user.id, userId));

  return referralCode;
}

export async function findUserByReferralCode(referralCode: string) {
  const [result] = await db()
    .select()
    .from(user)
    .where(eq(user.referralCode, referralCode))
    .limit(1);

  return result;
}

export async function getUsers({
  page = 1,
  limit = 30,
  email,
}: {
  email?: string;
  page?: number;
  limit?: number;
} = {}): Promise<User[]> {
  const result = await db()
    .select()
    .from(user)
    .where(email ? eq(user.email, email) : undefined)
    .orderBy(desc(user.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return result;
}

export async function getUsersCount({ email }: { email?: string }) {
  const [result] = await db()
    .select({ count: count() })
    .from(user)
    .where(email ? eq(user.email, email) : undefined);
  return result?.count || 0;
}

export async function getUserByUserIds(userIds: string[]) {
  const result = await db()
    .select()
    .from(user)
    .where(inArray(user.id, userIds));

  return result;
}

export async function getUserInfo() {
  const signUser = await getSignUser();

  return signUser;
}

export async function getUserCredits(userId: string) {
  const remainingCredits = await getRemainingCredits(userId);

  return { remainingCredits };
}

export async function getSignUser() {
  const auth = await getAuth();

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    return session?.user;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

export async function isEmailVerified(email: string): Promise<boolean> {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;

  const [row] = await db()
    .select({ emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.email, normalized))
    .limit(1);

  return !!row?.emailVerified;
}

export async function appendUserToResult(result: any) {
  if (!result || !result.length) {
    return result;
  }

  const userIds = result.map((item: any) => item.userId);
  const users = await getUserByUserIds(userIds);
  result = result.map((item: any) => {
    const user = users.find((user: any) => user.id === item.userId);
    return { ...item, user };
  });

  return result;
}

export async function hasUserPassword(userId: string): Promise<boolean> {
  const [credentialAccount] = await db()
    .select({ password: account.password })
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, 'credential'))
    )
    .limit(1);

  return !!credentialAccount?.password;
}
