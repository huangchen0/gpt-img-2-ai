import { redirect } from 'next/navigation';

export default async function LegacyNanoBananaPage({
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

  redirect(
    `/models/gpt-image-2${params.toString() ? `?${params.toString()}` : ''}`
  );
}
