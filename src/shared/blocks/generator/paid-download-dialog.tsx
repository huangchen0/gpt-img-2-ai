'use client';

import { useCallback, useMemo, useState } from 'react';
import { CreditCard, Download } from 'lucide-react';
import { useLocale } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useAppContext } from '@/shared/contexts/app';

type PaidDownloadAssetType = 'image' | 'video';

const COPY = {
  zh: {
    title: '升级后即可下载',
    description:
      '下载高清图片和视频是付费用户权益。升级后即可把生成结果下载到本地设备。',
    imageLabel: '图片下载',
    videoLabel: '视频下载',
    downloadDescription: '开通付费方案后即可下载生成结果到本地设备。',
    upgrade: '去付费升级',
    close: '稍后再说',
  },
  en: {
    title: 'Upgrade to download',
    description:
      'High quality image and video downloads are available for paid users. Upgrade to download generated results to your device.',
    imageLabel: 'Image download',
    videoLabel: 'Video download',
    downloadDescription:
      'Upgrade to a paid plan to save generated results to your device.',
    upgrade: 'Upgrade',
    close: 'Maybe later',
  },
} as const;

function getCopy(locale: string) {
  return locale.startsWith('zh') ? COPY.zh : COPY.en;
}

export function usePaidDownloadGate() {
  const { user, currentSubscription, fetchCurrentSubscription } =
    useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assetType, setAssetType] = useState<PaidDownloadAssetType>('image');

  const canDownload = useCallback(
    async (nextAssetType: PaidDownloadAssetType) => {
      setAssetType(nextAssetType);

      if (currentSubscription) {
        return true;
      }

      if (user?.id) {
        const result = await fetchCurrentSubscription({ force: true });
        if (result.subscription) {
          return true;
        }
      }

      setIsDialogOpen(true);
      return false;
    },
    [currentSubscription, fetchCurrentSubscription, user?.id]
  );

  const dialogProps = useMemo(
    () => ({
      open: isDialogOpen,
      onOpenChange: setIsDialogOpen,
      assetType,
    }),
    [assetType, isDialogOpen]
  );

  return {
    canDownload,
    paidDownloadDialogProps: dialogProps,
  };
}

export function PaidDownloadDialog({
  open,
  onOpenChange,
  assetType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetType: PaidDownloadAssetType;
}) {
  const copy = getCopy(useLocale());
  const assetLabel = assetType === 'video' ? copy.videoLabel : copy.imageLabel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <div className="bg-primary/10 text-primary mb-2 flex h-10 w-10 items-center justify-center rounded-full">
            <Download className="h-5 w-5" />
          </div>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="bg-muted/40 flex items-start gap-3 rounded-lg border p-4">
            <CreditCard className="text-primary mt-0.5 h-4 w-4" />
            <div>
              <p className="text-sm font-medium">{assetLabel}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {copy.downloadDescription}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {copy.close}
          </Button>
          <Button type="button" asChild>
            <Link href="/pricing">
              <CreditCard className="h-4 w-4" />
              {copy.upgrade}
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
