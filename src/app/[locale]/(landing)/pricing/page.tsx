import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { FAQSchema } from '@/shared/components/seo';
import { getMetadata } from '@/shared/lib/seo';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';
import { DynamicPage, FAQ } from '@/shared/types/blocks/landing';

export const generateMetadata = getMetadata({
  metadataKey: 'pages.pricing.metadata',
  canonicalUrl: '/pricing',
});

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('landing');
  const tp = await getTranslations('pages.pricing');
  const landingFaq = t.raw('faq') as FAQ;
  const pricingFaq = tp.has('faq') ? (tp.raw('faq') as FAQ) : undefined;
  const mergedFaq: FAQ = {
    ...landingFaq,
    ...pricingFaq,
    items: [...(pricingFaq?.items || []), ...(landingFaq.items || [])],
  };

  // Get current subscription for pricing display
  let currentSubscription:
    | Awaited<ReturnType<typeof getCurrentSubscription>>
    | undefined;
  try {
    const user = await getUserInfo();
    if (user) {
      currentSubscription = await getCurrentSubscription(user.id);
    }
  } catch (error) {
    console.log('getting current subscription failed:', error);
  }

  // build page sections
  const page: DynamicPage = {
    sections: {
      pricing: {
        block: 'pricing',
        data: {
          pricing: {
            ...(tp.raw('pricing') as Record<string, unknown>),
            messages: tp.raw('messages') as Record<string, string>,
          },
          currentSubscription,
        },
      },
      faq: mergedFaq,
      cta: t.raw('cta'),
      // testimonials: t.raw('testimonials'),
    },
  };

  // load page component
  const Page = await getThemePage('dynamic-page');

  return (
    <>
      <Page locale={locale} page={page} />
      {mergedFaq.items && mergedFaq.items.length > 0 && (
        <FAQSchema
          faqs={mergedFaq.items
            .filter((item) => item.question && item.answer)
            .map((item) => ({
              question: item.question as string,
              answer: item.answer as string,
            }))}
        />
      )}
    </>
  );
}
