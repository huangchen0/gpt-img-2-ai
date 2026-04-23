import { getTranslations } from 'next-intl/server';

import { AITaskStatus } from '@/extensions/ai';
import {
  AudioPlayer,
  Empty,
  ImageWatermarkOverlay,
  LazyImage,
} from '@/shared/blocks/common';
import { TableCard } from '@/shared/blocks/table';
import { isAnyGptImageModel } from '@/shared/lib/gpt-image';
import { AITask, getAITasks, getAITasksCount } from '@/shared/models/ai_task';
import { getPaidEntitlement } from '@/shared/models/paid-entitlement';
import { getUserInfo } from '@/shared/models/user';
import { Button, Tab } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

function parseTaskInfo(taskInfo: string | null) {
  if (!taskInfo) {
    return null;
  }

  try {
    return JSON.parse(taskInfo);
  } catch {
    return null;
  }
}

function extractUrlsFromResultJson(taskInfo: any): string[] {
  const resultUrls = Array.isArray(taskInfo?.resultUrls)
    ? taskInfo.resultUrls
    : Array.isArray(taskInfo?.data?.resultUrls)
      ? taskInfo.data.resultUrls
      : undefined;
  if (resultUrls) {
    return resultUrls.filter((url: any) => typeof url === 'string');
  }

  const resultJsonRaw =
    typeof taskInfo?.resultJson === 'string'
      ? taskInfo.resultJson
      : typeof taskInfo?.data?.resultJson === 'string'
        ? taskInfo.data.resultJson
        : null;
  if (typeof resultJsonRaw !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(resultJsonRaw);
    if (Array.isArray(parsed?.resultUrls)) {
      return parsed.resultUrls.filter((url: any) => typeof url === 'string');
    }
  } catch {
    return [];
  }

  return [];
}

function extractImageUrls(taskInfo: any): string[] {
  const imageUrls = Array.isArray(taskInfo?.images)
    ? taskInfo.images
        .map((image: any) => {
          if (!image) {
            return null;
          }
          if (typeof image === 'string') {
            return image;
          }
          return image.imageUrl || image.url || image.src || null;
        })
        .filter((url: any) => typeof url === 'string')
    : [];

  if (imageUrls.length > 0) {
    return imageUrls;
  }

  return extractUrlsFromResultJson(taskInfo);
}

function extractVideoUrls(taskInfo: any): string[] {
  const videoUrls = Array.isArray(taskInfo?.videos)
    ? taskInfo.videos
        .map((video: any) => {
          if (!video) {
            return null;
          }
          if (typeof video === 'string') {
            return video;
          }
          return (
            video.videoUrl || video.url || video.src || video.video || null
          );
        })
        .filter((url: any) => typeof url === 'string')
    : [];

  if (videoUrls.length > 0) {
    return videoUrls;
  }

  return extractUrlsFromResultJson(taskInfo);
}

export default async function AiTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: number; pageSize?: number; type?: string }>;
}) {
  const { page: pageNum, pageSize, type } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 20;

  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const [t, aiTasks, total, paidEntitlement] = await Promise.all([
    getTranslations('activity.ai-tasks'),
    getAITasks({
      userId: user.id,
      mediaType: type,
      page,
      limit,
    }),
    getAITasksCount({
      userId: user.id,
      mediaType: type,
    }),
    getPaidEntitlement(user.id),
  ]);

  const table: Table = {
    title: t('list.title'),
    columns: [
      { name: 'prompt', title: t('fields.prompt'), type: 'copy' },
      { name: 'mediaType', title: t('fields.media_type'), type: 'label' },
      // { name: 'options', title: t('fields.options'), type: 'copy' },
      { name: 'status', title: t('fields.status'), type: 'label' },
      { name: 'costCredits', title: t('fields.cost_credits'), type: 'label' },
      {
        name: 'result',
        title: t('fields.result'),
        callback: (item: AITask) => {
          const shouldWatermarkImages =
            !paidEntitlement.hasPaidEntitlement &&
            item.mediaType === 'image' &&
            isAnyGptImageModel(item.model);

          const renderImages = (imageUrls: string[]) => (
            <div className="flex flex-col gap-2">
              {imageUrls.map((imageUrl, index) =>
                shouldWatermarkImages ? (
                  <div
                    key={index}
                    className="relative h-32 w-fit overflow-hidden rounded-md border"
                  >
                    <LazyImage
                      src={imageUrl}
                      alt="Generated image"
                      className="h-full w-auto"
                    />
                    <ImageWatermarkOverlay />
                  </div>
                ) : (
                  <LazyImage
                    key={index}
                    src={imageUrl}
                    alt="Generated image"
                    className="h-32 w-auto"
                  />
                )
              )}
            </div>
          );

          const renderVideos = (videoUrls: string[]) => (
            <div className="flex flex-col gap-2">
              {videoUrls.map((videoUrl, index) => (
                <video
                  key={index}
                  src={videoUrl}
                  controls
                  preload="metadata"
                  className="h-32 w-auto rounded-md border"
                />
              ))}
            </div>
          );

          const taskInfo = parseTaskInfo(item.taskInfo);
          if (!taskInfo) {
            return '-';
          }

          if (taskInfo.errorMessage) {
            return (
              <div className="text-red-500">
                Failed: {taskInfo.errorMessage}
              </div>
            );
          }

          if (taskInfo.songs && taskInfo.songs.length > 0) {
            const songs: any[] = taskInfo.songs.filter(
              (song: any) => song.audioUrl
            );
            if (songs.length > 0) {
              return (
                <div className="flex flex-col gap-2">
                  {songs.map((song: any, index: number) => (
                    <AudioPlayer
                      key={song.id || index}
                      src={song.audioUrl}
                      title={song.title}
                      className="w-80"
                    />
                  ))}
                </div>
              );
            }
          }

          const imageUrls = extractImageUrls(taskInfo);
          const videoUrls = extractVideoUrls(taskInfo);

          if (item.mediaType === 'video') {
            if (videoUrls.length > 0) {
              return renderVideos(videoUrls);
            }
            if (imageUrls.length > 0) {
              return renderImages(imageUrls);
            }
            return '-';
          }

          if (item.mediaType === 'image') {
            if (imageUrls.length > 0) {
              return renderImages(imageUrls);
            }
            if (videoUrls.length > 0) {
              return renderVideos(videoUrls);
            }
            return '-';
          }

          if (imageUrls.length > 0) {
            return renderImages(imageUrls);
          }

          if (videoUrls.length > 0) {
            return renderVideos(videoUrls);
          }

          return '-';
        },
      },
      { name: 'createdAt', title: t('fields.created_at'), type: 'time' },
      {
        name: 'action',
        title: t('fields.action'),
        type: 'dropdown',
        callback: (item: AITask) => {
          const items: Button[] = [];

          if (
            item.status === AITaskStatus.PENDING ||
            item.status === AITaskStatus.PROCESSING
          ) {
            items.push({
              title: t('list.buttons.refresh'),
              url: `/activity/ai-tasks/${item.id}/refresh`,
              icon: 'RiRefreshLine',
            });
          }

          return items;
        },
      },
    ],
    data: aiTasks,
    emptyMessage: t('list.empty_message'),
    pagination: {
      total,
      page,
      limit,
    },
  };

  const tabs: Tab[] = [
    {
      name: 'all',
      title: t('list.tabs.all'),
      url: '/activity/ai-tasks',
      is_active: !type || type === 'all',
    },
    {
      name: 'music',
      title: t('list.tabs.music'),
      url: '/activity/ai-tasks?type=music',
      is_active: type === 'music',
    },
    {
      name: 'image',
      title: t('list.tabs.image'),
      url: '/activity/ai-tasks?type=image',
      is_active: type === 'image',
    },
    {
      name: 'video',
      title: t('list.tabs.video'),
      url: '/activity/ai-tasks?type=video',
      is_active: type === 'video',
    },
    {
      name: 'audio',
      title: t('list.tabs.audio'),
      url: '/activity/ai-tasks?type=audio',
      is_active: type === 'audio',
    },
    {
      name: 'text',
      title: t('list.tabs.text'),
      url: '/activity/ai-tasks?type=text',
      is_active: type === 'text',
    },
  ];

  return (
    <div className="space-y-8">
      <TableCard title={t('list.title')} tabs={tabs} table={table} />
    </div>
  );
}
