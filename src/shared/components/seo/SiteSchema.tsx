import Script from 'next/script';

import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';

interface SiteSchemaProps {
  description?: string;
  locale?: string;
}

function toAbsoluteUrl(url: string) {
  if (!url) {
    return envConfigs.app_url;
  }

  return url.startsWith('http') ? url : `${envConfigs.app_url}${url}`;
}

function getLocalizedHomeUrl(locale?: string) {
  if (!locale || locale === defaultLocale) {
    return envConfigs.app_url;
  }

  return `${envConfigs.app_url}/${locale}`;
}

export function SiteSchema({
  description = envConfigs.app_description,
  locale = defaultLocale,
}: SiteSchemaProps) {
  const appUrl = envConfigs.app_url;
  const organizationId = `${appUrl}/#organization`;
  const websiteId = `${appUrl}/#website`;
  const logoUrl = toAbsoluteUrl(envConfigs.app_logo || '/logo.png');
  const previewImageUrl = toAbsoluteUrl(
    envConfigs.app_preview_image || '/preview.png'
  );
  const homeUrl = getLocalizedHomeUrl(locale);

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: envConfigs.app_name,
        url: appUrl,
        logo: {
          '@type': 'ImageObject',
          url: logoUrl,
          width: 512,
          height: 512,
        },
        image: logoUrl,
        ...(description ? { description } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: envConfigs.app_name,
        url: homeUrl,
        inLanguage: locale,
        publisher: {
          '@id': organizationId,
        },
        image: previewImageUrl,
        ...(description ? { description } : {}),
      },
    ],
  };

  return (
    <Script
      id="site-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
