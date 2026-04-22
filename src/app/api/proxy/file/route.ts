import { NextRequest, NextResponse } from 'next/server';

import { getCurrentSubscription } from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';

function isDownloadRestrictedMedia({
  url,
  contentType,
}: {
  url: string;
  contentType: string;
}) {
  const normalizedContentType = contentType.toLowerCase();

  if (
    normalizedContentType.startsWith('image/') ||
    normalizedContentType.startsWith('video/')
  ) {
    return true;
  }

  const pathname = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  })();

  return /\.(?:apng|avif|gif|jpe?g|png|svg|webp|bmp|tiff?|heic|heif|mp4|mov|m4v|webm|avi|mkv|mpeg|mpg)(?:$|\?)/i.test(
    pathname
  );
}

async function canDownloadRestrictedMedia() {
  const user = await getUserInfo();
  if (!user?.id) {
    return false;
  }

  const subscription = await getCurrentSubscription(user.id);
  return Boolean(subscription);
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  let canDownloadMedia: boolean | null = null;

  const ensureCanDownloadMedia = async () => {
    if (canDownloadMedia === null) {
      canDownloadMedia = await canDownloadRestrictedMedia();
    }

    return canDownloadMedia;
  };

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    if (
      isDownloadRestrictedMedia({ url, contentType: '' }) &&
      !(await ensureCanDownloadMedia())
    ) {
      return new NextResponse('Paid subscription required to download media', {
        status: 402,
      });
    }

    const response = await fetch(url);

    if (!response.ok) {
      return new NextResponse(`Failed to fetch file: ${response.statusText}`, {
        status: response.status,
      });
    }

    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';

    if (
      isDownloadRestrictedMedia({ url, contentType }) &&
      !(await ensureCanDownloadMedia())
    ) {
      return new NextResponse('Paid subscription required to download media', {
        status: 402,
      });
    }

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
