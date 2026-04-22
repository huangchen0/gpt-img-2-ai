'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { useAppContext } from '@/shared/contexts/app';

interface RewardsPanelCopy {
  copyInvite: string;
  copied: string;
  checkIn: string;
  checkedIn: string;
  checkingIn: string;
  checkInSuccess: string;
}

export function RewardsPanel({
  inviteUrl,
  checkedInToday,
  copy,
}: {
  inviteUrl: string;
  checkedInToday: boolean;
  copy: RewardsPanelCopy;
}) {
  const router = useRouter();
  const { fetchUserCredits } = useAppContext();
  const [isCheckedIn, setIsCheckedIn] = useState(checkedInToday);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(copy.copied);
    } catch {
      toast.error('Copy failed');
    }
  };

  const handleCheckIn = async () => {
    if (isCheckedIn || isCheckingIn) return;

    setIsCheckingIn(true);
    try {
      const resp = await fetch('/api/user/check-in', { method: 'POST' });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }

      const { code, message } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setIsCheckedIn(true);
      await fetchUserCredits();
      router.refresh();
      toast.success(copy.checkInSuccess);
    } catch (e: any) {
      toast.error(e?.message || 'Check-in failed');
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-muted/60 flex min-w-0 items-center justify-between gap-3 rounded-md border px-3 py-2">
        <span className="truncate text-sm">{inviteUrl}</span>
        <Button size="icon" variant="outline" onClick={handleCopy}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleCopy} variant="outline">
          <Copy className="h-4 w-4" />
          {copy.copyInvite}
        </Button>
        <Button onClick={handleCheckIn} disabled={isCheckedIn || isCheckingIn}>
          {isCheckingIn ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarCheck className="h-4 w-4" />
          )}
          {isCheckingIn
            ? copy.checkingIn
            : isCheckedIn
              ? copy.checkedIn
              : copy.checkIn}
        </Button>
      </div>
    </div>
  );
}
