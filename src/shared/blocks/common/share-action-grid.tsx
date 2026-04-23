'use client';

import type { ComponentType } from 'react';
import { Clipboard, Code2, Copy, Ellipsis, FileText } from 'lucide-react';
import { RiWechatFill, RiWeiboFill } from 'react-icons/ri';
import {
  SiInstagram,
  SiPinterest,
  SiReddit,
  SiTiktok,
  SiX,
  SiXiaohongshu,
} from 'react-icons/si';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import {
  buildShareArtifacts,
  buildSharePlatformUrls,
  isShareAbort,
  type ShareContent,
} from '@/shared/lib/share-utils';
import { cn } from '@/shared/lib/utils';

export interface ShareActionLabels {
  copyPrompt?: string;
  copyCaption: string;
  copyLink: string;
  copyMarkdown: string;
  copyEmbed: string;
  more: string;
  wechat: string;
  weibo: string;
  xiaohongshu: string;
  douyin: string;
  instagram: string;
  tiktok: string;
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
}

interface ExternalShareAction {
  id: string;
  label: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
}

interface AssistedShareAction {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  fallbackValue: string;
}

const actionButtonClassName =
  'h-auto min-h-10 justify-start gap-2 py-2 text-left whitespace-normal';

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
  const captionWithUrl = shareText ? `${shareText}\n${shareUrl}` : shareUrl;

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

  const assistedShareActions: AssistedShareAction[] = [
    {
      id: 'more',
      label: labels.more,
      icon: Ellipsis,
      fallbackValue: captionWithUrl,
    },
    {
      id: 'wechat',
      label: labels.wechat,
      icon: RiWechatFill,
      fallbackValue: shareUrl,
    },
    {
      id: 'xiaohongshu',
      label: labels.xiaohongshu,
      icon: SiXiaohongshu,
      fallbackValue: captionWithUrl,
    },
    {
      id: 'douyin',
      label: labels.douyin,
      icon: SiTiktok,
      fallbackValue: captionWithUrl,
    },
    {
      id: 'instagram',
      label: labels.instagram,
      icon: SiInstagram,
      fallbackValue: captionWithUrl,
    },
    {
      id: 'tiktok',
      label: labels.tiktok,
      icon: SiTiktok,
      fallbackValue: captionWithUrl,
    },
  ];

  const handleAssistedShare = async (fallbackValue: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText || title,
          url: shareUrl,
        });
        return;
      } catch (error) {
        if (isShareAbort(error)) {
          return;
        }
      }
    }

    await copyText(fallbackValue, labels.copied, labels.copyFailed);
  };

  return (
    <div className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2', className)}>
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

      {assistedShareActions.map((action) => {
        const Icon = action.icon;

        return (
          <Button
            key={action.id}
            type="button"
            variant="outline"
            className={actionButtonClassName}
            onClick={() => handleAssistedShare(action.fallbackValue)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{action.label}</span>
          </Button>
        );
      })}

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
