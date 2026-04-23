'use client';

import { useCallback, useMemo, useState } from 'react';
import { CreditCard, Download, Share2 } from 'lucide-react';
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

type PaidActionAssetType = 'image' | 'video';
type PaidActionType = 'download' | 'share';

const COPY = {
  zh: {
    downloadTitle: '升级后即可下载',
    downloadDescription:
      '下载高清图片和视频是付费用户权益。升级后即可把生成结果下载到本地设备。',
    shareTitle: '升级后即可分享',
    shareDescription:
      '公开分享生成图片是付费用户权益。升级后即可发布并分享你的生成结果。',
    imageDownloadLabel: '图片下载',
    videoDownloadLabel: '视频下载',
    imageShareLabel: '图片分享',
    videoShareLabel: '视频分享',
    downloadCardDescription: '开通付费方案后即可下载生成结果到本地设备。',
    shareCardDescription: '开通付费方案后即可分享生成结果链接。',
    upgrade: '去付费升级',
    close: '稍后再说',
  },
  en: {
    downloadTitle: 'Upgrade to download',
    downloadDescription:
      'High quality image and video downloads are available for paid users. Upgrade to download generated results to your device.',
    shareTitle: 'Upgrade to share',
    shareDescription:
      'Public sharing for generated images is available for paid users. Upgrade to publish and share your generated results.',
    imageDownloadLabel: 'Image download',
    videoDownloadLabel: 'Video download',
    imageShareLabel: 'Image sharing',
    videoShareLabel: 'Video sharing',
    downloadCardDescription:
      'Upgrade to a paid plan to save generated results to your device.',
    shareCardDescription:
      'Upgrade to a paid plan to share generated result links.',
    upgrade: 'Upgrade',
    close: 'Maybe later',
  },
} as const;

function getCopy(locale: string) {
  return locale.startsWith('zh') ? COPY.zh : COPY.en;
}

export function usePaidDownloadGate() {
  const { user, hasPaidEntitlement, fetchCurrentSubscription } =
    useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [assetType, setAssetType] = useState<PaidActionAssetType>('image');
  const [actionType, setActionType] = useState<PaidActionType>('download');

  const canAccessPaidAction = useCallback(
    async (
      nextActionType: PaidActionType,
      nextAssetType: PaidActionAssetType = 'image'
    ) => {
      setAssetType(nextAssetType);
      setActionType(nextActionType);

      if (hasPaidEntitlement) {
        return true;
      }

      if (user?.id) {
        const result = await fetchCurrentSubscription({ force: true });
        if (result.hasPaidEntitlement) {
          return true;
        }
      }

      setIsDialogOpen(true);
      return false;
    },
    [fetchCurrentSubscription, hasPaidEntitlement, user?.id]
  );

  const canDownload = useCallback(
    async (nextAssetType: PaidActionAssetType) =>
      canAccessPaidAction('download', nextAssetType),
    [canAccessPaidAction]
  );

  const dialogProps = useMemo(
    () => ({
      open: isDialogOpen,
      onOpenChange: setIsDialogOpen,
      assetType,
      actionType,
    }),
    [actionType, assetType, isDialogOpen]
  );

  return {
    canDownload,
    canAccessPaidAction,
    paidDownloadDialogProps: dialogProps,
  };
}

export function PaidDownloadDialog({
  open,
  onOpenChange,
  assetType,
  actionType = 'download',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetType: PaidActionAssetType;
  actionType?: PaidActionType;
}) {
  const copy = getCopy(useLocale());
  const isShareAction = actionType === 'share';
  const assetLabel = isShareAction
    ? assetType === 'video'
      ? copy.videoShareLabel
      : copy.imageShareLabel
    : assetType === 'video'
      ? copy.videoDownloadLabel
      : copy.imageDownloadLabel;
  const title = isShareAction ? copy.shareTitle : copy.downloadTitle;
  const description = isShareAction
    ? copy.shareDescription
    : copy.downloadDescription;
  const cardDescription = isShareAction
    ? copy.shareCardDescription
    : copy.downloadCardDescription;
  const Icon = isShareAction ? Share2 : Download;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <div className="bg-primary/10 text-primary mb-2 flex h-10 w-10 items-center justify-center rounded-full">
            <Icon className="h-5 w-5" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="bg-muted/40 flex items-start gap-3 rounded-lg border p-4">
            <CreditCard className="text-primary mt-0.5 h-4 w-4" />
            <div>
              <p className="text-sm font-medium">{assetLabel}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {cardDescription}
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
