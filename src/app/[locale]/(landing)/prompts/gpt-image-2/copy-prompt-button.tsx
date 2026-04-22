'use client';

import { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

export function CopyPromptButton({
  prompt,
  className,
}: {
  prompt: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
      setFailed(true);
      window.setTimeout(() => setFailed(false), 1800);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={copyPrompt}
      className={cn('border-border bg-background', className)}
    >
      {failed ? (
        <X className="size-4" />
      ) : copied ? (
        <Check className="size-4" />
      ) : (
        <Copy className="size-4" />
      )}
      {failed ? 'Copy failed' : copied ? 'Copied' : 'Copy prompt'}
    </Button>
  );
}
