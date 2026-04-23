'use client';

import { Code2, Copy, FileText, Loader2, Send, Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface ShareShowcaseDialogProps {
  open: boolean;
  isSharing: boolean;
  title: string;
  description: string;
  resultTitle: string;
  resultDescription: string;
  confirmLabel: string;
  cancelLabel: string;
  sharingLabel: string;
  copyLinkLabel: string;
  copyMarkdownLabel: string;
  copyEmbedLabel: string;
  pinterestLabel: string;
  xLabel: string;
  copiedLabel: string;
  copyFailedLabel: string;
  appName: string;
  result?: {
    shareUrl: string;
    imageUrl: string;
    title: string;
    description: string;
  } | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
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
  copiedLabel: string,
  failedLabel: string
) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(copiedLabel);
  } catch {
    toast.error(failedLabel);
  }
}

export function ShareShowcaseDialog({
  open,
  isSharing,
  title,
  description,
  resultTitle,
  resultDescription,
  confirmLabel,
  cancelLabel,
  sharingLabel,
  copyLinkLabel,
  copyMarkdownLabel,
  copyEmbedLabel,
  pinterestLabel,
  xLabel,
  copiedLabel,
  copyFailedLabel,
  appName,
  result,
  onOpenChange,
  onConfirm,
}: ShareShowcaseDialogProps) {
  const shareText = result?.description || result?.title || '';
  const markdown = result
    ? `![${result.title}](${result.imageUrl})\n\nCreated with [${appName}](${result.shareUrl})`
    : '';
  const embedHtml = result
    ? `<a href="${result.shareUrl}" target="_blank" rel="noopener">\n  <img src="${result.imageUrl}" alt="${escapeHtml(result.title)}" />\n</a>\n<p>Created with <a href="${result.shareUrl}" target="_blank" rel="noopener">${escapeHtml(appName)}</a></p>`
    : '';
  const pinterestUrl = result
    ? `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(result.shareUrl)}&media=${encodeURIComponent(result.imageUrl)}&description=${encodeURIComponent(shareText)}`
    : '';
  const xUrl = result
    ? `https://twitter.com/intent/tweet?url=${encodeURIComponent(result.shareUrl)}&text=${encodeURIComponent(shareText)}`
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{result ? resultTitle : title}</DialogTitle>
          <DialogDescription>
            {result ? resultDescription : description}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() =>
                copyText(result.shareUrl, copiedLabel, copyFailedLabel)
              }
            >
              <Copy className="h-4 w-4" />
              {copyLinkLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => copyText(markdown, copiedLabel, copyFailedLabel)}
            >
              <FileText className="h-4 w-4" />
              {copyMarkdownLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => copyText(embedHtml, copiedLabel, copyFailedLabel)}
            >
              <Code2 className="h-4 w-4" />
              {copyEmbedLabel}
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <a href={pinterestUrl} target="_blank" rel="noopener noreferrer">
                <Share2 className="h-4 w-4" />
                {pinterestLabel}
              </a>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <a href={xUrl} target="_blank" rel="noopener noreferrer">
                <Send className="h-4 w-4" />
                {xLabel}
              </a>
            </Button>
          </div>
        ) : (
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSharing}>
                {cancelLabel}
              </Button>
            </DialogClose>
            <Button type="button" onClick={onConfirm} disabled={isSharing}>
              {isSharing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {sharingLabel}
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
