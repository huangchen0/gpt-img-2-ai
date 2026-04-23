'use client';

import { Loader2 } from 'lucide-react';

import { Progress } from '@/shared/components/ui/progress';
import { cn } from '@/shared/lib/utils';

interface GeneratorResultOverlayProps {
  title: string;
  progressLabel: string;
  progress: number;
  status?: string | null;
  className?: string;
}

export function GeneratorResultOverlay({
  title,
  progressLabel,
  progress,
  status,
  className,
}: GeneratorResultOverlayProps) {
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] p-4 sm:p-6',
        className
      )}
    >
      <div className="bg-background/60 absolute inset-0 rounded-[inherit] backdrop-blur-md" />
      <div className="to-primary/8 absolute inset-0 rounded-[inherit] bg-linear-to-br from-white/35 via-transparent dark:from-white/10 dark:to-white/4" />
      <div className="border-border/70 bg-background/75 relative z-10 w-full max-w-sm rounded-2xl border p-5 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="border-border/70 bg-background/80 text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.16em] uppercase">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{title}</span>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
              {progressLabel}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums sm:text-4xl">
              {normalizedProgress}%
            </p>
          </div>
          {status ? (
            <p className="text-muted-foreground max-w-[10rem] text-right text-sm leading-5">
              {status}
            </p>
          ) : null}
        </div>

        <Progress
          value={normalizedProgress}
          className="bg-primary/15 mt-4 h-2.5"
        />
      </div>
    </div>
  );
}
