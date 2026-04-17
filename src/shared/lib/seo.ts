import { getTranslations, setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale, locales } from '@/config/locale';

// get metadata for page component
export function getMetadata(
  options: {
    title?: string;
    description?: string;
    keywords?: string;
    metadataKey?: string;
    canonicalUrl?: string; // relative path or full url
    imageUrl?: string;
    appName?: string;
    noIndex?: boolean;
  } = {}
) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    setRequestLocale(locale);

    // passed metadata
    const passedMetadata = {
      title: options.title,
      description: options.description,
      keywords: options.keywords,
    };

    // default metadata
    const defaultMetadata = await getTranslatedMetadata(
      defaultMetadataKey,
      locale
    );

    // translated metadata
    let translatedMetadata: any = {};
    if (options.metadataKey) {
      translatedMetadata = await getTranslatedMetadata(
        options.metadataKey,
        locale
      );
    }

    // canonical url
    const canonicalUrl = await getCanonicalUrl(
      options.canonicalUrl || '',
      locale || ''
    );
    const alternateLanguages = getAlternateLanguageUrls(
      options.canonicalUrl || ''
    );

    const title =
      passedMetadata.title || translatedMetadata.title || defaultMetadata.title;
    const description =
      passedMetadata.description ||
      translatedMetadata.description ||
      defaultMetadata.description;

    // image url
    let imageUrl = options.imageUrl || envConfigs.app_preview_image;
    if (imageUrl.startsWith('http')) {
      imageUrl = imageUrl;
    } else {
      imageUrl = `${envConfigs.app_url}${imageUrl}`;
    }

    // app name
    let appName = options.appName;
    if (!appName) {
      appName = envConfigs.app_name || '';
    }

    return {
      title:
        passedMetadata.title ||
        translatedMetadata.title ||
        defaultMetadata.title,
      description:
        passedMetadata.description ||
        translatedMetadata.description ||
        defaultMetadata.description,
      keywords:
        passedMetadata.keywords ||
        translatedMetadata.keywords ||
        defaultMetadata.keywords,
      alternates: {
        canonical: canonicalUrl,
        languages: alternateLanguages,
      },

      openGraph: {
        type: 'website',
        locale: locale,
        url: canonicalUrl,
        title,
        description,
        siteName: appName,
        images: [imageUrl.toString()],
      },

      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl.toString()],
        site: envConfigs.app_url,
      },

      robots: {
        index: options.noIndex ? false : true,
        follow: options.noIndex ? false : true,
      },
    };
  };
}

export function getAlternateLanguageUrls(path: string): Record<string, string> {
  return getAlternateLanguageUrlsByLocales(path, locales);
}

export function getAlternateLanguageUrlsByLocales(
  path: string,
  availableLocales: string[]
): Record<string, string> {
  const appUrl = envConfigs.app_url;
  const normalizedPath = normalizePath(path);
  const languages: Record<string, string> = {};
  const uniqueLocales = Array.from(new Set(availableLocales)).filter(Boolean);

  for (const locale of uniqueLocales) {
    languages[locale] =
      locale === defaultLocale
        ? `${appUrl}${normalizedPath}`
        : `${appUrl}/${locale}${normalizedPath === '/' ? '' : normalizedPath}`;
  }

  const xDefaultLocale = uniqueLocales.includes(defaultLocale)
    ? defaultLocale
    : uniqueLocales[0];

  if (xDefaultLocale) {
    languages['x-default'] =
      xDefaultLocale === defaultLocale
        ? `${appUrl}${normalizedPath}`
        : `${appUrl}/${xDefaultLocale}${normalizedPath === '/' ? '' : normalizedPath}`;
  }

  return languages;
}

function normalizePath(path: string): string {
  if (!path) return '/';

  if (path.startsWith('http')) {
    try {
      const url = new URL(path);
      return url.pathname || '/';
    } catch {
      return '/';
    }
  }

  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  return path || '/';
}

const defaultMetadataKey = 'common.metadata';

async function getTranslatedMetadata(metadataKey: string, locale: string) {
  setRequestLocale(locale);
  const t = await getTranslations(metadataKey);

  return {
    title: t.has('title') ? t('title') : '',
    description: t.has('description') ? t('description') : '',
    keywords: t.has('keywords') ? t('keywords') : '',
  };
}

async function getCanonicalUrl(canonicalUrl: string, locale: string) {
  if (!canonicalUrl) {
    canonicalUrl = '/';
  }

  if (canonicalUrl.startsWith('http')) {
    // full url
    canonicalUrl = canonicalUrl;
  } else {
    // relative path
    if (!canonicalUrl.startsWith('/')) {
      canonicalUrl = `/${canonicalUrl}`;
    }

    canonicalUrl = `${envConfigs.app_url}${
      !locale || locale === defaultLocale ? '' : `/${locale}`
    }${canonicalUrl}`;

    if (locale !== defaultLocale && canonicalUrl.endsWith('/')) {
      canonicalUrl = canonicalUrl.slice(0, -1);
    }
  }

  return canonicalUrl;
}
