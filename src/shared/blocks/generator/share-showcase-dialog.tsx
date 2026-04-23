'use client';

import { Gift, Loader2 } from 'lucide-react';

import {
  ShareActionGrid,
  type ShareActionLabels,
} from '@/shared/blocks/common/share-action-grid';
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
  rewardHint?: string;
  resultTitle: string;
  resultDescription: string;
  resultRewardHint?: string;
  confirmLabel: string;
  cancelLabel: string;
  sharingLabel: string;
  actionLabels: ShareActionLabels;
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

export function ShareShowcaseDialog({
  open,
  isSharing,
  title,
  description,
  rewardHint,
  resultTitle,
  resultDescription,
  resultRewardHint,
  confirmLabel,
  cancelLabel,
  sharingLabel,
  actionLabels,
  appName,
  result,
  onOpenChange,
  onConfirm,
}: ShareShowcaseDialogProps) {
  const activeRewardHint = result ? resultRewardHint : rewardHint;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{result ? resultTitle : title}</DialogTitle>
          <DialogDescription>
            {result ? resultDescription : description}
          </DialogDescription>
        </DialogHeader>

        {activeRewardHint && (
          <div className="border-primary/20 bg-primary/5 text-muted-foreground flex items-start gap-2 rounded-md border p-3 text-sm leading-5">
            <Gift className="text-primary mt-0.5 h-4 w-4 shrink-0" />
            <p>{activeRewardHint}</p>
          </div>
        )}

        {result ? (
          <ShareActionGrid
            shareUrl={result.shareUrl}
            imageUrl={result.imageUrl}
            title={result.title}
            description={result.description}
            appName={appName}
            labels={actionLabels}
          />
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
