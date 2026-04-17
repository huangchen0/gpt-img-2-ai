import { redirect } from 'next/navigation';

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams();

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (typeof value === 'string') {
      params.set(key, value);
      return;
    }

    value?.forEach((item) => params.append(key, item));
  });

  const targetPath =
    params.get('type') === 'video' ||
    params.get('model') === 'seedance' ||
    params.get('model') === 'kling'
      ? '/ai-video'
      : '/ai-image';

  redirect(`${targetPath}${params.toString() ? `?${params.toString()}` : ''}`);
}
