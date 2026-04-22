'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useRouter } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { useAppContext } from '@/shared/contexts/app';

export interface CreditEarningAction {
  id: 'daily-checkin' | 'invite';
  iconType: 'checkin' | 'invite';
  title: string;
  description: string;
  buttonLabel: string;
  onSelect: () => void | Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

export interface CreditEarningCopy {
  checkInTitle: string;
  checkInDescription: string;
  checkInAction: string;
  checkedInAction: string;
  checkingInAction: string;
  checkInSuccess: string;
  checkInFailed: string;
  inviteTitle: string;
  inviteDescription: string;
  copyInviteAction: string;
  inviteCopied: string;
  openRewardsAction: string;
  copyFailed: string;
}

export function parsePositiveCreditConfig(
  value: string | undefined,
  fallback: number
) {
  const parsed = parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getGenerationCreditRewardAmounts(
  configs: Record<string, string>
) {
  return {
    checkinCredits: parsePositiveCreditConfig(configs.daily_checkin_credits, 3),
    referralCredits: parsePositiveCreditConfig(
      configs.referral_reward_credits,
      60
    ),
  };
}

export function useGenerationCreditEarnActions({
  copy,
  onCreditsChanged,
}: {
  copy: CreditEarningCopy;
  onCreditsChanged?: (remainingCredits: number) => void;
}) {
  const router = useRouter();
  const { user, fetchUserCredits } = useAppContext();
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  const inviteUrl = useMemo(() => {
    const referralCode = user?.referralCode?.trim();
    if (!referralCode) {
      return '';
    }

    const fallbackOrigin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const baseUrl = (envConfigs.app_url || fallbackOrigin).replace(/\/$/, '');

    return `${baseUrl}?ref=${encodeURIComponent(referralCode)}`;
  }, [user?.referralCode]);

  const handleCheckIn = useCallback(async () => {
    if (checkedIn || isCheckingIn) {
      return;
    }

    setIsCheckingIn(true);
    try {
      const resp = await fetch('/api/user/check-in', { method: 'POST' });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setCheckedIn(true);
      if (typeof data?.remainingCredits === 'number') {
        onCreditsChanged?.(data.remainingCredits);
      }
      await fetchUserCredits();
      toast.success(copy.checkInSuccess);
    } catch (error: any) {
      const message = error?.message || copy.checkInFailed;
      if (String(message).toLowerCase().includes('already checked in')) {
        setCheckedIn(true);
      }
      toast.error(message);
    } finally {
      setIsCheckingIn(false);
    }
  }, [
    checkedIn,
    copy.checkInFailed,
    copy.checkInSuccess,
    fetchUserCredits,
    isCheckingIn,
    onCreditsChanged,
  ]);

  const handleInvite = useCallback(async () => {
    if (!inviteUrl) {
      router.push('/settings/credits');
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(copy.inviteCopied);
    } catch {
      toast.error(copy.copyFailed);
    }
  }, [copy.copyFailed, copy.inviteCopied, inviteUrl, router]);

  return useMemo<CreditEarningAction[]>(
    () => [
      {
        id: 'daily-checkin',
        iconType: 'checkin',
        title: copy.checkInTitle,
        description: copy.checkInDescription,
        buttonLabel: isCheckingIn
          ? copy.checkingInAction
          : checkedIn
            ? copy.checkedInAction
            : copy.checkInAction,
        onSelect: handleCheckIn,
        isLoading: isCheckingIn,
        disabled: checkedIn || isCheckingIn,
      },
      {
        id: 'invite',
        iconType: 'invite',
        title: copy.inviteTitle,
        description: copy.inviteDescription,
        buttonLabel: inviteUrl ? copy.copyInviteAction : copy.openRewardsAction,
        onSelect: handleInvite,
      },
    ],
    [
      checkedIn,
      copy.checkInAction,
      copy.checkInDescription,
      copy.checkInTitle,
      copy.checkedInAction,
      copy.checkingInAction,
      copy.copyInviteAction,
      copy.inviteDescription,
      copy.inviteTitle,
      copy.openRewardsAction,
      handleCheckIn,
      handleInvite,
      inviteUrl,
      isCheckingIn,
    ]
  );
}
