import { redirect } from 'next/navigation';

export default async function AiVideoGeneratorPage({
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

  redirect(`/ai-video${params.toString() ? `?${params.toString()}` : ''}`);
}
