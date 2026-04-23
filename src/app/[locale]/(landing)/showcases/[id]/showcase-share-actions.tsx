'use client';

import {
  ShareActionGrid,
  type ShareActionLabels,
} from '@/shared/blocks/common/share-action-grid';

interface ShowcaseShareActionsProps {
  shareUrl: string;
  imageUrl: string;
  title: string;
  description: string;
  prompt?: string | null;
  appName: string;
  labels: ShareActionLabels;
}

export function ShowcaseShareActions({
  shareUrl,
  imageUrl,
  title,
  description,
  prompt,
  appName,
  labels,
}: ShowcaseShareActionsProps) {
  return (
    <ShareActionGrid
      shareUrl={shareUrl}
      imageUrl={imageUrl}
      title={title}
      description={description}
      prompt={prompt}
      appName={appName}
      labels={labels}
      className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-1"
    />
  );
}
