import { NextRequest, NextResponse } from 'next/server';

import { envConfigs } from '@/config';
import { defaultLocale, locales } from '@/config/locale';
import { AITaskStatus } from '@/extensions/ai/types';
import { getShowcasePublicPath } from '@/shared/lib/showcase-seo';
import { getIsoTimestr } from '@/shared/lib/time';
import { findAITaskById } from '@/shared/models/ai_task';
import {
  addShowcase,
  getShowcase,
  NewShowcase,
} from '@/shared/models/showcase';
import { ensureUserReferralCode, getUserInfo } from '@/shared/models/user';

const MAX_SHARE_TITLE_LENGTH = 90;
const MAX_SHARE_DESCRIPTION_PROMPT_LENGTH = 220;
const MIN_INDEXABLE_PROMPT_LENGTH = 20;

function parseJson(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractImageUrls(result: any): string[] {
  if (!result) {
    return [];
  }

  const output = result.images ?? result.output ?? result.data;
  if (!output) {
    return [];
  }

  if (typeof output === 'string') {
    return [output];
  }

  if (Array.isArray(output)) {
    return output
      .flatMap((item) => {
        if (!item) return [];
        if (typeof item === 'string') return [item];
        if (typeof item === 'object') {
          const candidate =
            item.imageUrl ?? item.url ?? item.uri ?? item.image ?? item.src;
          return typeof candidate === 'string' ? [candidate] : [];
        }
        return [];
      })
      .filter(Boolean);
  }

  if (typeof output === 'object') {
    const candidate =
      output.imageUrl ?? output.url ?? output.uri ?? output.image ?? output.src;
    if (typeof candidate === 'string') {
      return [candidate];
    }
  }

  return [];
}

function extractTaskImageUrls(
  taskInfo: string | null,
  taskResult: string | null
) {
  const urls = [parseJson(taskInfo), parseJson(taskResult)].flatMap((source) =>
    extractImageUrls(source)
  );

  return Array.from(new Set(urls));
}

function collapseWhitespace(value?: string | null) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function truncateText(value: string, maxLength: number) {
  const cleanValue = collapseWhitespace(value);

  if (cleanValue.length <= maxLength) {
    return cleanValue;
  }

  const truncatedAtWord = cleanValue
    .slice(0, maxLength)
    .replace(/\s+\S*$/g, '')
    .trim();

  return `${truncatedAtWord || cleanValue.slice(0, maxLength).trim()}...`;
}

function normalizeTag(value?: string | null) {
  return collapseWhitespace(value)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function buildShareShowcaseTitle(prompt: string) {
  if (prompt) {
    return truncateText(prompt, MAX_SHARE_TITLE_LENGTH);
  }

  return `AI generated image ${getIsoTimestr().slice(0, 10)}`;
}

function buildShareShowcaseDescription({
  prompt,
  model,
}: {
  prompt: string;
  model?: string | null;
}) {
  const modelText = collapseWhitespace(model);

  if (prompt) {
    return `AI image generated${
      modelText ? ` with ${modelText}` : ''
    } from this prompt: ${truncateText(
      prompt,
      MAX_SHARE_DESCRIPTION_PROMPT_LENGTH
    )}`;
  }

  return `A shared AI image generated${
    modelText ? ` with ${modelText}` : ''
  } on ${envConfigs.app_name}.`;
}

function buildShareShowcaseTags({
  prompt,
  model,
}: {
  prompt: string;
  model?: string | null;
}) {
  const tags = ['shared', 'ai-image', normalizeTag(model)];

  if (prompt.length < MIN_INDEXABLE_PROMPT_LENGTH) {
    tags.push('noindex');
  }

  return Array.from(new Set(tags.filter(Boolean))).join(',');
}

function normalizeBaseUrl(value?: string | null) {
  if (!value) {
    return '';
  }

  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

function normalizeLocale(value?: string | null) {
  const locale = value?.trim();

  if (locale && locales.includes(locale)) {
    return locale;
  }

  return null;
}

function getLocaleFromUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    const pathname = new URL(value).pathname;
    const firstSegment = pathname.split('/').filter(Boolean)[0];
    return normalizeLocale(firstSegment);
  } catch {
    return null;
  }
}

function getRequestLocale({
  request,
  requestedLocale,
}: {
  request: NextRequest;
  requestedLocale?: string | null;
}) {
  return (
    normalizeLocale(requestedLocale) ||
    getLocaleFromUrl(request.headers.get('referer')) ||
    defaultLocale
  );
}

function getRequestBaseUrl(request: NextRequest) {
  const forwardedHost = request.headers
    .get('x-forwarded-host')
    ?.split(',')[0]
    ?.trim();
  const forwardedProto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';

  if (forwardedHost) {
    return normalizeBaseUrl(`${forwardedProto}://${forwardedHost}`);
  }

  return normalizeBaseUrl(request.nextUrl.origin);
}

function buildShareUrl({
  request,
  showcase,
  referralCode,
  locale,
}: {
  request: NextRequest;
  showcase: { id: string; title: string; prompt: string | null };
  referralCode?: string | null;
  locale?: string;
}) {
  const configuredBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  const requestBaseUrl = getRequestBaseUrl(request);
  const baseUrl =
    process.env.NODE_ENV === 'production' && configuredBaseUrl
      ? configuredBaseUrl
      : requestBaseUrl || configuredBaseUrl || request.nextUrl.origin;
  const url = new URL(getShowcasePublicPath(showcase, locale), baseUrl);

  if (referralCode) {
    url.searchParams.set('ref', referralCode);
  }

  return url.toString();
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return NextResponse.json(
        { code: 401, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const locale = getRequestLocale({
      request,
      requestedLocale: typeof body?.locale === 'string' ? body.locale : null,
    });
    const taskId = typeof body?.taskId === 'string' ? body.taskId.trim() : '';
    const imageIndex = Number.isInteger(body?.imageIndex)
      ? body.imageIndex
      : parseInt(String(body?.imageIndex ?? ''), 10);

    if (!taskId || !Number.isFinite(imageIndex) || imageIndex < 0) {
      return NextResponse.json(
        { code: 400, message: 'Invalid share params' },
        { status: 400 }
      );
    }

    const task = await findAITaskById(taskId);
    if (!task || task.userId !== user.id) {
      return NextResponse.json(
        { code: 404, message: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.mediaType !== 'image' || task.status !== AITaskStatus.SUCCESS) {
      return NextResponse.json(
        { code: 400, message: 'Only successful image tasks can be shared' },
        { status: 400 }
      );
    }

    const imageUrls = extractTaskImageUrls(task.taskInfo, task.taskResult);
    const imageUrl = imageUrls[imageIndex];

    if (!imageUrl) {
      return NextResponse.json(
        { code: 400, message: 'Shared image not found' },
        { status: 400 }
      );
    }

    const showcaseId = `share-${task.id}-${imageIndex}`;
    const referralCode = await ensureUserReferralCode(user.id);
    const existingShowcase = await getShowcase(showcaseId);

    if (existingShowcase) {
      return NextResponse.json({
        code: 0,
        message: 'success',
        data: {
          showcase: existingShowcase,
          shareUrl: buildShareUrl({
            request,
            showcase: existingShowcase,
            referralCode,
            locale,
          }),
          alreadyShared: true,
        },
      });
    }

    const prompt = collapseWhitespace(task.prompt);
    const newShowcase: NewShowcase = {
      id: showcaseId,
      userId: user.id,
      title: buildShareShowcaseTitle(prompt),
      prompt: prompt || null,
      image: imageUrl,
      tags: buildShareShowcaseTags({
        prompt,
        model: task.model,
      }),
      description: buildShareShowcaseDescription({
        prompt,
        model: task.model,
      }),
    };

    const result = await addShowcase(newShowcase);
    if (!result) {
      const concurrentShowcase = await getShowcase(showcaseId);
      if (concurrentShowcase) {
        return NextResponse.json({
          code: 0,
          message: 'success',
          data: {
            showcase: concurrentShowcase,
            shareUrl: buildShareUrl({
              request,
              showcase: concurrentShowcase,
              referralCode,
              locale,
            }),
            alreadyShared: true,
          },
        });
      }

      return NextResponse.json(
        { code: 500, message: 'Failed to share showcase' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      code: 0,
      message: 'success',
      data: {
        showcase: result,
        shareUrl: buildShareUrl({
          request,
          showcase: result,
          referralCode,
          locale,
        }),
        alreadyShared: false,
      },
    });
  } catch (error: any) {
    console.error('Share showcase error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
