'use client';

import { useState } from 'react';
import { Check, Share2, X } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

export function SharePromptButton({
  title,
  text,
  className,
}: {
  title: string;
  text: string;
  className?: string;
}) {
  const [shared, setShared] = useState(false);
  const [failed, setFailed] = useState(false);

  async function sharePrompt() {
    try {
      const url = window.location.href;

      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
      }

      setFailed(false);
      setShared(true);
      window.setTimeout(() => setShared(false), 1400);
    } catch {
      setShared(false);
      setFailed(true);
      window.setTimeout(() => setFailed(false), 1800);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={sharePrompt}
      className={cn('border-border bg-background', className)}
    >
      {failed ? (
        <X className="size-4" />
      ) : shared ? (
        <Check className="size-4" />
      ) : (
        <Share2 className="size-4" />
      )}
      {failed ? 'Share failed' : shared ? 'Shared' : 'Share'}
    </Button>
  );
}
