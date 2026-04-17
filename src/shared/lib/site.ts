import { envConfigs } from '@/config';

const MAX_SITE_CODE_LENGTH = 64;

function normalizeSiteCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SITE_CODE_LENGTH);
}

function deriveSiteCodeFromAppUrl(appUrl: string) {
  if (!appUrl) {
    return '';
  }

  try {
    const hostname = new URL(appUrl).hostname;
    return normalizeSiteCode(hostname);
  } catch {
    return normalizeSiteCode(appUrl);
  }
}

export function getCurrentSiteCode() {
  return (
    normalizeSiteCode(String(envConfigs.site_code || '')) ||
    deriveSiteCodeFromAppUrl(String(envConfigs.app_url || '')) ||
    'default'
  );
}
