'use client';

import type { ComponentType } from 'react';
import { Clipboard, Code2, Copy, FileText } from 'lucide-react';
import { RiWeiboFill } from 'react-icons/ri';
import { SiPinterest, SiReddit, SiX } from 'react-icons/si';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import {
  buildShareArtifacts,
  buildSharePlatformUrls,
  type ShareContent,
} from '@/shared/lib/share-utils';
import { cn } from '@/shared/lib/utils';

export interface ShareActionLabels {
  copyPrompt?: string;
  copyCaption: string;
  copyLink: string;
  copyMarkdown: string;
  copyEmbed: string;
  weibo: string;
  reddit: string;
  pinterest: string;
  x: string;
  copied: string;
  copyFailed: string;
}

interface ShareActionGridProps extends ShareContent {
  labels: ShareActionLabels;
  prompt?: string | null;
  className?: string;
  layout?: 'list' | 'compact';
}

interface ExternalShareAction {
  id: string;
  label: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
}

async function copyText(
  value: string,
  successMessage: string,
  errorMessage: string
) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch {
    toast.error(errorMessage);
  }
}

export function ShareActionGrid({
  shareUrl,
  imageUrl,
  title,
  description,
  appName,
  labels,
  prompt,
  className,
  layout = 'list',
}: ShareActionGridProps) {
  const promptText = prompt?.trim();
  const { shareText, markdown, embedHtml } = buildShareArtifacts({
    shareUrl,
    imageUrl,
    title,
    description,
    appName,
  });
  const shareLinks = buildSharePlatformUrls({
    shareUrl,
    imageUrl,
    title,
    description,
  });

  const externalShareActions: ExternalShareAction[] = [
    {
      id: 'weibo',
      label: labels.weibo,
      url: shareLinks.weibo,
      icon: RiWeiboFill,
    },
    {
      id: 'reddit',
      label: labels.reddit,
      url: shareLinks.reddit,
      icon: SiReddit,
    },
    {
      id: 'pinterest',
      label: labels.pinterest,
      url: shareLinks.pinterest,
      icon: SiPinterest,
    },
    {
      id: 'x',
      label: labels.x,
      url: shareLinks.x,
      icon: SiX,
    },
  ];

  const actionButtonClassName =
    layout === 'compact'
      ? 'h-auto min-h-12 justify-start gap-2 px-3 py-2.5 text-left whitespace-normal text-sm leading-5'
      : 'h-auto min-h-10 justify-start gap-2 py-2 text-left whitespace-normal';

  const gridClassName =
    layout === 'compact'
      ? 'grid grid-cols-2 gap-2 sm:grid-cols-3'
      : 'grid grid-cols-1 gap-2 sm:grid-cols-2';

  return (
    <div className={cn(gridClassName, className)}>
      {promptText && labels.copyPrompt && (
        <Button
          type="button"
          variant="outline"
          className={actionButtonClassName}
          onClick={() => copyText(promptText, labels.copied, labels.copyFailed)}
        >
          <Clipboard className="h-4 w-4 shrink-0" />
          <span>{labels.copyPrompt}</span>
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        className={actionButtonClassName}
        onClick={() =>
          copyText(shareText || title, labels.copied, labels.copyFailed)
        }
      >
        <Clipboard className="h-4 w-4 shrink-0" />
        <span>{labels.copyCaption}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        className={actionButtonClassName}
        onClick={() => copyText(shareUrl, labels.copied, labels.copyFailed)}
      >
        <Copy className="h-4 w-4 shrink-0" />
        <span>{labels.copyLink}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        className={actionButtonClassName}
        onClick={() => copyText(markdown, labels.copied, labels.copyFailed)}
      >
        <FileText className="h-4 w-4 shrink-0" />
        <span>{labels.copyMarkdown}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        className={actionButtonClassName}
        onClick={() => copyText(embedHtml, labels.copied, labels.copyFailed)}
      >
        <Code2 className="h-4 w-4 shrink-0" />
        <span>{labels.copyEmbed}</span>
      </Button>

      {externalShareActions.map((action) => {
        const Icon = action.icon;

        return (
          <Button
            key={action.id}
            asChild
            variant="outline"
            className={actionButtonClassName}
          >
            <a href={action.url} target="_blank" rel="noopener noreferrer">
              <Icon className="h-4 w-4 shrink-0" />
              <span>{action.label}</span>
            </a>
          </Button>
        );
      })}
    </div>
  );
}
