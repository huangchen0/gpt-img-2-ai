'use client';

import { useEffect, useRef, useState } from 'react';
import { Fragment } from 'react/jsx-runtime';
import { usePathname } from 'next/navigation';
import { Coins, LayoutDashboard, Loader2, LogOut, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { authClient, signOut, useSession } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useAppContext } from '@/shared/contexts/app';
import { clearMembershipPriorityQueueStorage } from '@/shared/hooks/use-membership-priority-queue';
import {
  clearPendingSocialAuth,
  getPendingSocialAuth,
  hasGoogleAdsSignUpSendTo,
  trackConfiguredGtmSignUp,
} from '@/shared/lib/gtm';
import { cn } from '@/shared/lib/utils';
import { User as UserType } from '@/shared/models/user';
import { NavItem, UserNav } from '@/shared/types/blocks/common';

import { SmartIcon } from '../common/smart-icon';
import { SignModal } from './sign-modal';

function extractSessionUser(data: any): UserType | null {
  const u = data?.user ?? data?.data?.user ?? null;
  return u && typeof u === 'object' ? (u as UserType) : null;
}

function parseUserCreatedAtMs(value: unknown): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return NaN;
    }

    return value < 1_000_000_000_000 ? value * 1000 : value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : NaN;
  }

  return NaN;
}

export function SignUser({
  isScrolled,
  userNav,
}: {
  isScrolled?: boolean;
  userNav?: UserNav;
}) {
  const t = useTranslations('common.sign');
  const router = useRouter();
  const pathname = usePathname();
  const entryCtaTitle = t('entry_cta_title');
  const entryModalTitle = t('entry_modal_title');
  const entryModalDescription = t('entry_modal_description');

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // get app context values
  const {
    configs,
    fetchConfigs,
    hasFetchedConfigs,
    setIsShowSignModal,
    isCheckSign,
    setIsCheckSign,
    user,
    setUser,
    fetchUserInfo,
    showOneTap,
  } = useAppContext();

  // get session
  const { data: session, isPending } = useSession();
  const sessionUser = extractSessionUser(session);
  const displayUser = (user as UserType | null) ?? sessionUser;

  // In dev (React StrictMode) effects can run twice; ensure we don't spam getSession().
  const didFallbackSyncRef = useRef(false);

  // one tap initialized
  const oneTapInitialized = useRef(false);

  useEffect(() => {
    if (!hasFetchedConfigs) {
      void fetchConfigs();
    }
  }, [fetchConfigs, hasFetchedConfigs]);

  // set is check sign
  useEffect(() => {
    setIsCheckSign(isPending);
  }, [isPending]);

  // show one tap if not initialized
  useEffect(() => {
    if (
      configs &&
      configs.google_client_id &&
      configs.google_one_tap_enabled === 'true' &&
      !session &&
      !isPending &&
      !oneTapInitialized.current
    ) {
      oneTapInitialized.current = true;
      showOneTap(configs);
    }
  }, [configs, session, isPending]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!sessionUser?.id) return;

    const pendingSocialAuth = getPendingSocialAuth();
    if (!pendingSocialAuth?.provider) return;

    if (!hasFetchedConfigs && !hasGoogleAdsSignUpSendTo(configs)) {
      return;
    }

    const createdAtCandidate =
      (sessionUser as any).createdAt ?? (user as any)?.createdAt;
    const createdAtMs = parseUserCreatedAtMs(createdAtCandidate);
    const pendingDecisionDeadline = pendingSocialAuth.expiresAt + 2 * 60 * 1000;

    if (!Number.isFinite(createdAtMs)) {
      if (Date.now() > pendingDecisionDeadline) {
        clearPendingSocialAuth();
      }
      return;
    }

    const isWithinPendingWindow =
      createdAtMs >= pendingSocialAuth.startedAt - 2 * 60 * 1000 &&
      createdAtMs <= pendingSocialAuth.expiresAt + 2 * 60 * 1000;

    if (!isWithinPendingWindow) {
      clearPendingSocialAuth();
      return;
    }

    const trackedKey = `gtm_social_sign_up_tracked_${sessionUser.id}`;
    if (window.localStorage.getItem(trackedKey) === '1') {
      clearPendingSocialAuth();
      return;
    }

    trackConfiguredGtmSignUp({
      method: pendingSocialAuth.provider,
      configs,
    });
    window.localStorage.setItem(trackedKey, '1');
    clearPendingSocialAuth();
  }, [
    sessionUser?.id,
    (sessionUser as any)?.createdAt,
    (user as any)?.createdAt,
    hasFetchedConfigs,
    configs,
  ]);

  // set user
  useEffect(() => {
    const currentUserId = user?.id;
    const sessionUserId = (sessionUser as any)?.id;

    if (sessionUser && sessionUserId !== currentUserId) {
      setUser(sessionUser as UserType);
      fetchUserInfo();
    } else if (!sessionUser && currentUserId) {
      setUser(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser?.id, (sessionUser as any)?.email, user?.id]);

  // Fallback: if the session cookie is present but useSession lags, do a single refresh.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (didFallbackSyncRef.current) return;
    // Only run when useSession is done but still no user.
    if (isPending) return;
    if (sessionUser || user) return;

    didFallbackSyncRef.current = true;
    void (async () => {
      try {
        const res: any = await authClient.getSession();
        const fresh = extractSessionUser(res?.data ?? res);
        if (fresh?.id) {
          setUser(fresh);
          fetchUserInfo();
        }
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, sessionUser, user?.id]);

  return (
    <>
      {isCheckSign || !mounted ? (
        <div>
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : displayUser ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full p-0"
            >
              <Avatar>
                <AvatarImage
                  src={displayUser.image || ''}
                  alt={displayUser.name || ''}
                />
                <AvatarFallback>{displayUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {userNav?.show_name && (
              <>
                <DropdownMenuItem asChild>
                  <Link
                    className="w-full cursor-pointer"
                    href="/settings/profile"
                  >
                    <User />
                    {displayUser.name}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {userNav?.show_credits && (
              <>
                <DropdownMenuItem asChild>
                  <Link
                    className="w-full cursor-pointer"
                    href="/settings/credits"
                  >
                    <Coins />
                    {t('credits_title', {
                      credits: displayUser.credits?.remainingCredits || 0,
                    })}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {userNav?.items?.map((item: NavItem, idx: number) => (
              <Fragment key={idx}>
                <DropdownMenuItem asChild>
                  <Link
                    className="w-full cursor-pointer"
                    href={item.url || ''}
                    target={item.target || '_self'}
                  >
                    {item.icon && (
                      <SmartIcon
                        name={item.icon as string}
                        className="h-4 w-4"
                      />
                    )}
                    {item.title}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </Fragment>
            ))}

            {displayUser.isAdmin && (
              <>
                <DropdownMenuItem asChild>
                  <Link className="w-full cursor-pointer" href="/admin">
                    <LayoutDashboard />
                    {t('admin_title')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {userNav?.show_sign_out && (
              <DropdownMenuItem
                className="w-full cursor-pointer"
                onClick={() =>
                  signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        clearMembershipPriorityQueueStorage();
                        router.push('/');
                      },
                    },
                  })
                }
              >
                <LogOut />
                <span>{t('sign_out_title')}</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            className={cn(
              'inline-flex h-11 w-full items-center justify-center rounded-full border border-black/6 px-6 text-sm font-semibold tracking-[0.01em] shadow-[0_12px_30px_rgba(15,23,42,0.12)] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-black/15 focus-visible:outline-none sm:h-12 sm:w-auto sm:px-7',
              '!bg-white !text-slate-950 hover:-translate-y-0.5 hover:!bg-white/95 hover:shadow-[0_16px_36px_rgba(15,23,42,0.16)]',
              isScrolled && 'lg:hidden'
            )}
            onClick={() => setIsShowSignModal(true)}
          >
            <span>{entryCtaTitle}</span>
          </button>
          <SignModal
            callbackUrl={pathname || '/'}
            title={entryModalTitle}
            description={entryModalDescription}
          />
        </div>
      )}
    </>
  );
}
