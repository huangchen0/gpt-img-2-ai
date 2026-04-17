'use client';

import { Clock3, Crown, Loader2, RotateCcw, X } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { formatPriorityQueueRemainingTime } from '@/shared/hooks/use-membership-priority-queue';
import { cn } from '@/shared/lib/utils';

interface MembershipPriorityQueueCardProps {
  title: string;
  description: string;
  taskLabel: string;
  remainingLabel: string;
  remainingMs: number;
  upgradeLabel: string;
  cancelLabel: string;
  submittingLabel: string;
  onCancel: () => void;
  onUpgradeClick?: () => void;
  onRetry?: () => void;
  upgradeHref?: string;
  isSubmitting?: boolean;
  isSubmitFailed?: boolean;
  retryLabel?: string;
  submitFailedLabel?: string;
  className?: string;
}

export function MembershipPriorityQueueCard({
  title,
  description,
  taskLabel,
  remainingLabel,
  remainingMs,
  upgradeLabel,
  cancelLabel,
  submittingLabel,
  onCancel,
  onUpgradeClick,
  onRetry,
  upgradeHref,
  isSubmitting = false,
  isSubmitFailed = false,
  retryLabel,
  submitFailedLabel,
  className,
}: MembershipPriorityQueueCardProps) {
  const shouldShowRetry = isSubmitFailed && typeof onRetry === 'function';

  return (
    <div className={cn('space-y-4 rounded-lg border p-4', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Clock3 className="h-4 w-4" />
            <span>{title}</span>
          </div>
          <p className="text-muted-foreground text-xs leading-5">
            {description}
          </p>
        </div>
        <div className="bg-muted rounded-full px-3 py-1 text-xs font-medium">
          {taskLabel}
        </div>
      </div>

      <div className="bg-muted/40 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">{remainingLabel}</span>
          <span className="text-primary text-lg font-semibold tabular-nums">
            {isSubmitting
              ? formatPriorityQueueRemainingTime(0)
              : formatPriorityQueueRemainingTime(remainingMs)}
          </span>
        </div>
        {isSubmitting && (
          <p className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {submittingLabel}
          </p>
        )}
        {shouldShowRetry && submitFailedLabel ? (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
            {submitFailedLabel}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {shouldShowRetry ? (
          <Button
            type="button"
            className="flex-1"
            onClick={onRetry}
            disabled={isSubmitting}
          >
            <RotateCcw className="h-4 w-4" />
            {retryLabel || upgradeLabel}
          </Button>
        ) : (
          <>
            {upgradeHref ? (
              <Button asChild className="flex-1" onClick={onUpgradeClick}>
                <Link href={upgradeHref}>
                  <Crown className="h-4 w-4" />
                  {upgradeLabel}
                </Link>
              </Button>
            ) : (
              <Button className="flex-1" onClick={onUpgradeClick}>
                <Crown className="h-4 w-4" />
                {upgradeLabel}
              </Button>
            )}
          </>
        )}
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <X className="h-4 w-4" />
          {cancelLabel}
        </Button>
      </div>
    </div>
  );
}
