import { APIError } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { oneTap } from 'better-auth/plugins';
import { and, eq, gt, inArray, lte, not } from 'drizzle-orm';
import { getLocale } from 'next-intl/server';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import * as schema from '@/config/db/schema';
import { VerifyEmail } from '@/shared/blocks/email/verify-email';
import {
  getCookieFromCtx,
  getHeaderValue,
  guessLocaleFromAcceptLanguage,
} from '@/shared/lib/cookie';
import { getUuid } from '@/shared/lib/hash';
import { getClientIp } from '@/shared/lib/ip';
import { getCurrentSiteCode } from '@/shared/lib/site';

// Best-effort dedupe to prevent sending verification emails too frequently.
// This is especially helpful in dev/hot reload, transient network conditions,
// and to add a server-side throttle beyond any client-side cooldown.
const recentVerificationEmailSentAt = new Map<string, number>();
const VERIFICATION_EMAIL_MIN_INTERVAL_MS = 60_000;
const DEFAULT_MAX_ACCOUNTS_PER_IP = 3;
const EMAIL_PASSWORD_SIGN_IN_PATH = '/sign-in/email';
const EMAIL_LOGIN_METHOD = 'email';
const SIGN_OUT_PATH = '/sign-out';
const REVOKE_SESSION_PATH = '/revoke-session';
const REVOKE_SESSIONS_PATH = '/revoke-sessions';
const REVOKE_OTHER_SESSIONS_PATH = '/revoke-other-sessions';
const CHANGE_PASSWORD_PATH = '/change-password';
const PENDING_IP_LOGIN_SLOT_TTL_MS = 5 * 60 * 1000;
const IP_LOGIN_SLOT_CLEANUP_TARGETS_KEY = '__ipLoginSlotCleanupTargets';

type IpLoginCleanupTarget = {
  ipAddress: string;
  userId: string;
};

function isLoopbackIp(ip: string) {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === 'localhost'
  );
}

function getMaxAccountsPerIp(configs: Record<string, string>) {
  const rawValue =
    configs.auth_max_accounts_per_ip ?? process.env.AUTH_MAX_ACCOUNTS_PER_IP;
  if (rawValue == null || String(rawValue).trim() === '') {
    return DEFAULT_MAX_ACCOUNTS_PER_IP;
  }

  const parsedValue = Number(rawValue);

  if (Number.isFinite(parsedValue) && parsedValue >= 0) {
    return Math.floor(parsedValue);
  }

  return DEFAULT_MAX_ACCOUNTS_PER_IP;
}

function shouldEnforceEmailPasswordIpLimit(ctx: any) {
  return ctx?.path === EMAIL_PASSWORD_SIGN_IN_PATH;
}

function isEmailLoginSession(sessionData: {
  loginMethod?: string | null;
  ipAddress?: string | null;
  userId?: string | null;
}) {
  return String(sessionData?.loginMethod || '').trim() === EMAIL_LOGIN_METHOD;
}

function isSessionCleanupPath(path: string) {
  return [
    SIGN_OUT_PATH,
    REVOKE_SESSION_PATH,
    REVOKE_SESSIONS_PATH,
    REVOKE_OTHER_SESSIONS_PATH,
    CHANGE_PASSWORD_PATH,
  ].includes(path);
}

function getIpFromAuthContext(ctx: any) {
  const headers: Headers | undefined = ctx?.request?.headers || ctx?.headers;
  if (!headers) {
    return '';
  }

  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const forwardedIp = forwardedFor.split(',')[0]?.trim();
    if (forwardedIp) {
      return forwardedIp;
    }
  }

  return (
    headers.get('cf-connecting-ip')?.trim() ||
    headers.get('x-real-ip')?.trim() ||
    ''
  );
}

function getPendingIpLoginSlotExpiry() {
  return new Date(Date.now() + PENDING_IP_LOGIN_SLOT_TTL_MS);
}

function toIpLoginCleanupTarget(sessionData: {
  ipAddress?: string | null;
  userId?: string | null;
  loginMethod?: string | null;
}): IpLoginCleanupTarget | null {
  const ipAddress = String(sessionData?.ipAddress || '').trim();
  const userId = String(sessionData?.userId || '').trim();

  if (
    !ipAddress ||
    !userId ||
    isLoopbackIp(ipAddress) ||
    !isEmailLoginSession(sessionData)
  ) {
    return null;
  }

  return {
    ipAddress,
    userId,
  };
}

function dedupeIpLoginCleanupTargets(targets: IpLoginCleanupTarget[]) {
  return Array.from(
    new Map(
      targets.map((target) => [`${target.ipAddress}:${target.userId}`, target])
    ).values()
  );
}

async function getSafeSessionFromContext(ctx: any) {
  try {
    return await getSessionFromCtx(ctx);
  } catch {
    return null;
  }
}

async function reconcileIpLoginSlots(ipAddress: string) {
  const now = new Date();

  await db()
    .delete(schema.ipLoginSlot)
    .where(
      and(
        eq(schema.ipLoginSlot.ipAddress, ipAddress),
        lte(schema.ipLoginSlot.expiresAt, now)
      )
    );

  const activeSessions = await db()
    .selectDistinct({
      userId: schema.session.userId,
    })
    .from(schema.session)
    .where(
      and(
        eq(schema.session.ipAddress, ipAddress),
        eq(schema.session.loginMethod, EMAIL_LOGIN_METHOD),
        gt(schema.session.expiresAt, now)
      )
    );

  const activeUserIds = activeSessions
    .map((session: { userId: string }) => session.userId)
    .filter(Boolean);

  if (activeUserIds.length === 0) {
    await db()
      .delete(schema.ipLoginSlot)
      .where(eq(schema.ipLoginSlot.ipAddress, ipAddress));
    return;
  }

  await db()
    .delete(schema.ipLoginSlot)
    .where(
      and(
        eq(schema.ipLoginSlot.ipAddress, ipAddress),
        not(inArray(schema.ipLoginSlot.userId, activeUserIds))
      )
    );
}

async function claimIpLoginSlot({
  ipAddress,
  userId,
  maxAccountsPerIp,
}: {
  ipAddress: string;
  userId: string;
  maxAccountsPerIp: number;
}) {
  await reconcileIpLoginSlots(ipAddress);

  const provisionalExpiresAt = getPendingIpLoginSlotExpiry();
  const [existingSlot] = await db()
    .select({
      id: schema.ipLoginSlot.id,
    })
    .from(schema.ipLoginSlot)
    .where(
      and(
        eq(schema.ipLoginSlot.ipAddress, ipAddress),
        eq(schema.ipLoginSlot.userId, userId)
      )
    )
    .limit(1);

  if (existingSlot) {
    await db()
      .update(schema.ipLoginSlot)
      .set({
        expiresAt: provisionalExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.ipLoginSlot.id, existingSlot.id));
    return;
  }

  for (let slot = 1; slot <= maxAccountsPerIp; slot += 1) {
    const inserted = await db()
      .insert(schema.ipLoginSlot)
      .values({
        id: getUuid(),
        ipAddress,
        slot,
        userId,
        expiresAt: provisionalExpiresAt,
      })
      .onConflictDoNothing()
      .returning({
        id: schema.ipLoginSlot.id,
      });

    if (inserted.length > 0) {
      return;
    }
  }

  const [concurrentSlot] = await db()
    .select({
      id: schema.ipLoginSlot.id,
    })
    .from(schema.ipLoginSlot)
    .where(
      and(
        eq(schema.ipLoginSlot.ipAddress, ipAddress),
        eq(schema.ipLoginSlot.userId, userId)
      )
    )
    .limit(1);

  if (concurrentSlot) {
    await db()
      .update(schema.ipLoginSlot)
      .set({
        expiresAt: provisionalExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.ipLoginSlot.id, concurrentSlot.id));
    return;
  }

  throw new APIError('FORBIDDEN', {
    message: `This IP address has already reached the login limit of ${maxAccountsPerIp} accounts.`,
  });
}

async function syncIpLoginSlotExpiry(sessionData: {
  ipAddress?: string | null;
  userId?: string | null;
  expiresAt?: Date | null;
  loginMethod?: string | null;
}) {
  const ipAddress = String(sessionData?.ipAddress || '').trim();
  const userId = String(sessionData?.userId || '').trim();
  const expiresAt = sessionData?.expiresAt;

  if (
    !ipAddress ||
    !userId ||
    !expiresAt ||
    isLoopbackIp(ipAddress) ||
    !isEmailLoginSession(sessionData)
  ) {
    return;
  }

  await db()
    .update(schema.ipLoginSlot)
    .set({
      expiresAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.ipLoginSlot.ipAddress, ipAddress),
        eq(schema.ipLoginSlot.userId, userId)
      )
    );
}

async function releaseIpLoginSlotIfUnused(target: IpLoginCleanupTarget) {
  if (!target?.ipAddress || !target?.userId) {
    return;
  }

  const [activeSession] = await db()
    .select({
      id: schema.session.id,
    })
    .from(schema.session)
    .where(
      and(
        eq(schema.session.ipAddress, target.ipAddress),
        eq(schema.session.userId, target.userId),
        eq(schema.session.loginMethod, EMAIL_LOGIN_METHOD),
        gt(schema.session.expiresAt, new Date())
      )
    )
    .limit(1);

  if (activeSession) {
    return;
  }

  await db()
    .delete(schema.ipLoginSlot)
    .where(
      and(
        eq(schema.ipLoginSlot.ipAddress, target.ipAddress),
        eq(schema.ipLoginSlot.userId, target.userId)
      )
    );
}

async function collectIpLoginCleanupTargets(ctx: any) {
  switch (ctx.path) {
    case SIGN_OUT_PATH: {
      const session = await getSafeSessionFromContext(ctx);
      return dedupeIpLoginCleanupTargets(
        [
          toIpLoginCleanupTarget({
            ipAddress: session?.session?.ipAddress,
            userId: session?.session?.userId,
            loginMethod: session?.session?.loginMethod,
          }),
        ].filter(Boolean) as IpLoginCleanupTarget[]
      );
    }
    case REVOKE_SESSION_PATH: {
      const token = String(ctx?.body?.token || '').trim();
      if (!token) {
        return [];
      }

      const session = await ctx.context.internalAdapter.findSession(token);
      return dedupeIpLoginCleanupTargets(
        [
          toIpLoginCleanupTarget({
            ipAddress: session?.session?.ipAddress,
            userId: session?.session?.userId,
            loginMethod: session?.session?.loginMethod,
          }),
        ].filter(Boolean) as IpLoginCleanupTarget[]
      );
    }
    case REVOKE_SESSIONS_PATH:
    case REVOKE_OTHER_SESSIONS_PATH:
    case CHANGE_PASSWORD_PATH: {
      const currentSession = await getSafeSessionFromContext(ctx);
      const userId = String(currentSession?.user?.id || '').trim();
      if (!userId) {
        return [];
      }

      const sessions = await ctx.context.internalAdapter.listSessions(userId);
      const activeSessions = sessions.filter(
        (session: any) => session.expiresAt > new Date()
      );

      const filteredSessions =
        ctx.path === REVOKE_OTHER_SESSIONS_PATH ||
        (ctx.path === CHANGE_PASSWORD_PATH &&
          ctx?.body?.revokeOtherSessions === true)
          ? activeSessions.filter(
              (session: any) => session.token !== currentSession?.session?.token
            )
          : activeSessions;

      return dedupeIpLoginCleanupTargets(
        filteredSessions
          .map((session: any) =>
            toIpLoginCleanupTarget({
              ipAddress: session.ipAddress,
              userId: session.userId,
              loginMethod: session.loginMethod,
            })
          )
          .filter(Boolean) as IpLoginCleanupTarget[]
      );
    }
    default:
      return [];
  }
}

// Static auth options - NO database connection
// This ensures zero database calls during build time
const authOptions = {
  appName: envConfigs.app_name,
  baseURL: envConfigs.auth_url,
  secret: envConfigs.auth_secret,
  trustedOrigins: envConfigs.app_url ? [envConfigs.app_url] : [],
  user: {
    // Allow persisting custom columns on user table.
    // Without this, better-auth may ignore extra properties during create/update.
    additionalFields: {
      utmSource: {
        type: 'string',
        // Not user-editable input; we set it internally.
        input: false,
        required: false,
        defaultValue: '',
      },
      referrerDomain: {
        type: 'string',
        // Not user-editable input; we set it internally.
        input: false,
        required: false,
        defaultValue: '',
      },
      ip: {
        type: 'string',
        input: false,
        required: false,
        defaultValue: '',
      },
      locale: {
        type: 'string',
        input: false,
        required: false,
        defaultValue: '',
      },
      referralCode: {
        type: 'string',
        input: false,
        required: false,
        defaultValue: '',
      },
    },
  },
  session: {
    additionalFields: {
      loginMethod: {
        type: 'string',
        input: false,
        required: false,
        defaultValue: '',
      },
    },
  },
  advanced: {
    database: {
      generateId: () => getUuid(),
    },
    ipAddress: {
      ipAddressHeaders: ['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for'],
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  logger: {
    verboseLogging: false,
    // Disable all logs during build and production
    disabled: true,
  },
};

// get auth options with configs
export async function getAuthOptions(configs: Record<string, string>) {
  const emailVerificationEnabled =
    configs.email_verification_enabled === 'true' && !!configs.resend_api_key;

  return {
    ...authOptions,
    // Add database connection only when actually needed (runtime)
    database: envConfigs.database_url
      ? drizzleAdapter(db(), {
          provider: getDatabaseProvider(envConfigs.database_provider),
          schema: schema,
        })
      : null,
    databaseHooks: {
      user: {
        create: {
          before: async (user: any, ctx: any) => {
            try {
              const ip = await getClientIp();
              if (ip) {
                user.ip = ip;
              }

              // Prefer NEXT_LOCALE cookie (next-intl). Fallback to accept-language.
              const localeFromCookie = getCookieFromCtx(ctx, 'NEXT_LOCALE');

              const localeFromHeader = guessLocaleFromAcceptLanguage(
                getHeaderValue(ctx, 'accept-language')
              );

              const locale =
                (localeFromCookie || localeFromHeader || (await getLocale())) ??
                '';

              if (locale && typeof locale === 'string') {
                user.locale = locale.slice(0, 20);
              }

              // Only set on first creation; never overwrite later.
              if (!user?.utmSource) {
                const raw = getCookieFromCtx(ctx, 'utm_source');
                if (raw && typeof raw === 'string') {
                  // Keep it small & safe.
                  const decoded = decodeURIComponent(raw).trim();
                  const sanitized = decoded
                    .replace(/[^\w\-.:]/g, '') // allow a-zA-Z0-9_ - . :
                    .slice(0, 100);

                  if (sanitized) {
                    user.utmSource = sanitized;
                  }
                }
              }

              if (!user?.referrerDomain) {
                const rawReferrer = getCookieFromCtx(ctx, 'referrer_domain');
                if (rawReferrer && typeof rawReferrer === 'string') {
                  const decodedReferrer = decodeURIComponent(rawReferrer)
                    .trim()
                    .toLowerCase();
                  const sanitizedReferrer = decodedReferrer
                    .replace(/[^a-z0-9.-]/g, '')
                    .slice(0, 100);

                  if (sanitizedReferrer) {
                    user.referrerDomain = sanitizedReferrer;
                  }
                }
              }
            } catch {
              // best-effort only
            }
            return user;
          },
          after: async (user: any, ctx: any) => {
            try {
              if (!user.id) {
                throw new Error('user id is required');
              }

              const siteCode = getCurrentSiteCode();
              const { createReferralCode } = await import(
                '@/shared/models/referral'
              );
              await db()
                .update(schema.user)
                .set({
                  referralCode: createReferralCode(user.id, configs),
                  signupSite: siteCode,
                  firstSeenSite: siteCode,
                  lastSeenSite: siteCode,
                  lastActiveAt: new Date(),
                })
                .where(eq(schema.user.id, user.id));

              // grant credits for new user
              const { grantCreditsForNewUser } = await import(
                '@/shared/models/credit-grant'
              );
              await grantCreditsForNewUser(user, configs);

              const { grantReferralRewardForNewUser } = await import(
                '@/shared/models/referral'
              );
              await grantReferralRewardForNewUser({
                user,
                ctx,
                configs,
              });

              // grant role for new user
              const { grantRoleForNewUser } = await import(
                '@/shared/services/rbac-grant'
              );
              await grantRoleForNewUser(user);
            } catch (e) {
              console.log('grant credits or role for new user failed', e);
            }

            const { trackServerEvent } = await import(
              '@/shared/tracking/server'
            );
            await trackServerEvent(
              {
                eventName: 'sign_up',
                dedupeKey: `sign_up:${user.id}`,
                source: 'server',
                userId: user.id,
                properties: {
                  method: 'account_created',
                  email_verified: !!user.emailVerified,
                  locale: user.locale || '',
                },
                attribution: {
                  utm_source: user.utmSource || undefined,
                  referrer_domain: user.referrerDomain || undefined,
                },
              },
              configs
            );
          },
        },
      },
      session: {
        create: {
          before: async (sessionData: any, ctx: any) => {
            const shouldMarkEmailLoginMethod =
              shouldEnforceEmailPasswordIpLimit(ctx) ||
              (ctx?.path === CHANGE_PASSWORD_PATH &&
                isEmailLoginSession(ctx?.context?.session?.session));

            if (shouldMarkEmailLoginMethod) {
              sessionData.loginMethod = EMAIL_LOGIN_METHOD;
            }

            if (!shouldEnforceEmailPasswordIpLimit(ctx)) {
              return sessionData;
            }

            const maxAccountsPerIp = getMaxAccountsPerIp(configs);
            if (maxAccountsPerIp <= 0) {
              return sessionData;
            }

            const ipAddress = String(
              sessionData?.ipAddress || getIpFromAuthContext(ctx) || ''
            ).trim();
            const userId = String(sessionData?.userId || '').trim();
            if (!ipAddress || !userId || isLoopbackIp(ipAddress)) {
              return sessionData;
            }

            sessionData.ipAddress = ipAddress;
            await claimIpLoginSlot({
              ipAddress,
              userId,
              maxAccountsPerIp,
            });

            return sessionData;
          },
          after: async (sessionData: any) => {
            await syncIpLoginSlotExpiry(sessionData);
          },
        },
        update: {
          after: async (sessionData: any) => {
            await syncIpLoginSlotExpiry(sessionData);
          },
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (!isSessionCleanupPath(ctx.path)) {
          return;
        }

        if (
          ctx.path === CHANGE_PASSWORD_PATH &&
          ctx?.body?.revokeOtherSessions !== true
        ) {
          return;
        }

        (ctx.context as any)[IP_LOGIN_SLOT_CLEANUP_TARGETS_KEY] =
          await collectIpLoginCleanupTargets(ctx);
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (!isSessionCleanupPath(ctx.path)) {
          return;
        }

        if (
          ctx.path === CHANGE_PASSWORD_PATH &&
          ctx?.body?.revokeOtherSessions !== true
        ) {
          return;
        }

        const cleanupTargets = (((ctx.context as any) || {})[
          IP_LOGIN_SLOT_CLEANUP_TARGETS_KEY
        ] || []) as IpLoginCleanupTarget[];

        for (const cleanupTarget of cleanupTargets) {
          await releaseIpLoginSlotIfUnused(cleanupTarget);
        }
      }),
    },
    emailAndPassword: {
      enabled: configs.email_auth_enabled !== 'false',
      requireEmailVerification: emailVerificationEnabled,
      // Avoid creating a session immediately after sign up when verification is required.
      autoSignIn: emailVerificationEnabled ? false : true,
    },
    ...(emailVerificationEnabled
      ? {
          emailVerification: {
            // We explicitly send verification emails from the UI with a callbackURL
            // (redirecting to /verify-email). Disabling automatic sends avoids duplicates.
            sendOnSignUp: false,
            sendOnSignIn: false,
            // After user clicks the verification link, create session automatically.
            autoSignInAfterVerification: true,
            // 24 hours
            expiresIn: 60 * 60 * 24,
            sendVerificationEmail: async (
              { user, url }: { user: any; url: string; token: string },
              _request: Request
            ) => {
              try {
                const key = String(user?.email || '').toLowerCase();
                const now = Date.now();
                const last = recentVerificationEmailSentAt.get(key) || 0;
                if (key && now - last < VERIFICATION_EMAIL_MIN_INTERVAL_MS) {
                  return;
                }
                if (key) {
                  recentVerificationEmailSentAt.set(key, now);
                }

                const { getEmailService } = await import(
                  '@/shared/services/email'
                );
                const emailService = await getEmailService(configs as any);
                const logoUrl = envConfigs.app_logo?.startsWith('http')
                  ? envConfigs.app_logo
                  : `${envConfigs.app_url}${envConfigs.app_logo?.startsWith('/') ? '' : '/'}${envConfigs.app_logo || ''}`;
                // Avoid blocking auth response on email sending.
                await emailService.sendEmail({
                  to: user.email,
                  subject: `Verify your email - ${envConfigs.app_name}`,
                  react: VerifyEmail({
                    appName: envConfigs.app_name,
                    logoUrl,
                    url,
                  }),
                });
              } catch (e) {
                console.log('send verification email failed:', e);
              }
            },
          },
        }
      : {}),
    socialProviders: await getSocialProviders(configs),
    plugins:
      configs.google_client_id && configs.google_one_tap_enabled === 'true'
        ? [oneTap()]
        : [],
  };
}

// get social providers with configs
export async function getSocialProviders(configs: Record<string, string>) {
  const providers: any = {};

  // google auth
  if (configs.google_client_id && configs.google_client_secret) {
    providers.google = {
      clientId: configs.google_client_id,
      clientSecret: configs.google_client_secret,
    };
  }

  // github auth
  if (configs.github_client_id && configs.github_client_secret) {
    providers.github = {
      clientId: configs.github_client_id,
      clientSecret: configs.github_client_secret,
    };
  }

  return providers;
}

// convert database provider to better-auth database provider
export function getDatabaseProvider(
  provider: string
): 'sqlite' | 'pg' | 'mysql' {
  switch (provider) {
    case 'sqlite':
      return 'sqlite';
    case 'turso':
      return 'sqlite';
    case 'postgresql':
      return 'pg';
    case 'mysql':
      return 'mysql';
    default:
      throw new Error(
        `Unsupported database provider for auth: ${envConfigs.database_provider}`
      );
  }
}
