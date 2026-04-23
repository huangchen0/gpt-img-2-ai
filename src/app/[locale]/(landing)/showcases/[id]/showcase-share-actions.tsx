'use client';

import { Code2, Copy, FileText, Send, Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';

interface ShowcaseShareActionsCopy {
  copyLink: string;
  copyMarkdown: string;
  copyEmbed: string;
  shareToPinterest: string;
  shareToX: string;
  copied: string;
  copyFailed: string;
}

interface ShowcaseShareActionsProps {
  shareUrl: string;
  imageUrl: string;
  title: string;
  description: string;
  appName: string;
  copy: ShowcaseShareActionsCopy;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

export function ShowcaseShareActions({
  shareUrl,
  imageUrl,
  title,
  description,
  appName,
  copy,
}: ShowcaseShareActionsProps) {
  const imageAlt = title || description || 'AI generated image';
  const markdown = `![${imageAlt}](${imageUrl})\n\nCreated with [${appName}](${shareUrl})`;
  const embedHtml = `<a href="${shareUrl}" target="_blank" rel="noopener">\n  <img src="${imageUrl}" alt="${escapeHtml(imageAlt)}" />\n</a>\n<p>Created with <a href="${shareUrl}" target="_blank" rel="noopener">${escapeHtml(appName)}</a></p>`;
  const encodedShareUrl = encodeURIComponent(shareUrl);
  const encodedImageUrl = encodeURIComponent(imageUrl);
  const encodedDescription = encodeURIComponent(description || title);
  const pinterestUrl = `https://www.pinterest.com/pin/create/button/?url=${encodedShareUrl}&media=${encodedImageUrl}&description=${encodedDescription}`;
  const xUrl = `https://twitter.com/intent/tweet?url=${encodedShareUrl}&text=${encodedDescription}`;

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
      <Button
        type="button"
        variant="outline"
        className="justify-start"
        onClick={() => copyText(shareUrl, copy.copied, copy.copyFailed)}
      >
        <Copy className="h-4 w-4" />
        {copy.copyLink}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="justify-start"
        onClick={() => copyText(markdown, copy.copied, copy.copyFailed)}
      >
        <FileText className="h-4 w-4" />
        {copy.copyMarkdown}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="justify-start"
        onClick={() => copyText(embedHtml, copy.copied, copy.copyFailed)}
      >
        <Code2 className="h-4 w-4" />
        {copy.copyEmbed}
      </Button>
      <Button asChild variant="outline" className="justify-start">
        <a href={pinterestUrl} target="_blank" rel="noopener noreferrer">
          <Share2 className="h-4 w-4" />
          {copy.shareToPinterest}
        </a>
      </Button>
      <Button asChild variant="outline" className="justify-start">
        <a href={xUrl} target="_blank" rel="noopener noreferrer">
          <Send className="h-4 w-4" />
          {copy.shareToX}
        </a>
      </Button>
    </div>
  );
}
