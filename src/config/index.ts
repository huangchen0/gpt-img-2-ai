import packageJson from '../../package.json';

// Load .env files for scripts (tsx/ts-node) - but NOT in Edge Runtime or browser
// This ensures scripts can read DATABASE_URL and other env vars
// Check for real Node.js environment by looking at global 'process' properties
if (
  typeof process !== 'undefined' &&
  typeof process.cwd === 'function' &&
  !process.env.NEXT_RUNTIME // Skip if in Next.js runtime (already loaded)
) {
  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: '.env.development' });
    dotenv.config({ path: '.env', override: false });
  } catch (e) {
    // Silently fail - dotenv might not be available in some environments
  }
}

export type ConfigMap = Record<string, string>;

export const envConfigs: ConfigMap = {
  app_url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://gpt-image-2-ai.org',
  app_name: process.env.NEXT_PUBLIC_APP_NAME ?? 'ChatGPT Image 2 Generator',
  site_code:
    process.env.NEXT_PUBLIC_SITE_CODE ?? process.env.SITE_CODE ?? 'happyhorse',
  app_description: process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? '',
  app_logo: process.env.NEXT_PUBLIC_APP_LOGO ?? '/logo.png',
  app_favicon: process.env.NEXT_PUBLIC_APP_FAVICON ?? '/favicon.ico',
  app_preview_image:
    process.env.NEXT_PUBLIC_APP_PREVIEW_IMAGE ?? '/preview.png',
  theme: process.env.NEXT_PUBLIC_THEME ?? 'default',
  appearance: process.env.NEXT_PUBLIC_APPEARANCE ?? 'system',
  locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'en',
  database_url: process.env.DATABASE_URL ?? '',
  database_auth_token: process.env.DATABASE_AUTH_TOKEN ?? '',
  database_provider: process.env.DATABASE_PROVIDER ?? 'postgresql',
  db_schema_file: process.env.DB_SCHEMA_FILE ?? './src/config/db/schema.ts',
  // PostgreSQL schema name (e.g. 'web'). Default: 'public'
  db_schema: process.env.DB_SCHEMA ?? 'public',
  // Drizzle migrations journal table name (avoid conflicts across projects)
  db_migrations_table:
    process.env.DB_MIGRATIONS_TABLE ?? '__drizzle_migrations',
  // Drizzle migrations journal schema (default in drizzle-kit is 'drizzle')
  // We keep 'public' as template default for stability on fresh Supabase DBs.
  db_migrations_schema: process.env.DB_MIGRATIONS_SCHEMA ?? 'drizzle',
  // Output folder for drizzle-kit generated migrations
  db_migrations_out:
    process.env.DB_MIGRATIONS_OUT ?? './src/config/db/migrations',
  db_singleton_enabled: process.env.DB_SINGLETON_ENABLED || 'false',
  db_max_connections: process.env.DB_MAX_CONNECTIONS || '1',
  auth_url: process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '',
  auth_secret: process.env.AUTH_SECRET ?? '', // openssl rand -base64 32
  tracking_enabled:
    process.env.NEXT_PUBLIC_TRACKING_ENABLED ??
    process.env.TRACKING_ENABLED ??
    'true',
  google_tag_manager_id:
    process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID ??
    process.env.GOOGLE_TAG_MANAGER_ID ??
    process.env.NEXT_PUBLIC_GTM_ID ??
    process.env.GTM_ID ??
    '',
  gtm_id:
    process.env.NEXT_PUBLIC_GTM_ID ??
    process.env.GTM_ID ??
    process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID ??
    process.env.GOOGLE_TAG_MANAGER_ID ??
    '',
  google_ads_tag_id:
    process.env.NEXT_PUBLIC_GOOGLE_ADS_TAG_ID ??
    process.env.GOOGLE_ADS_TAG_ID ??
    '',
  google_ads_sign_up_send_to:
    process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGN_UP_SEND_TO ??
    process.env.GOOGLE_ADS_SIGN_UP_SEND_TO ??
    '',
  ga4_api_secret: process.env.GA4_API_SECRET ?? '',
  version: packageJson.version,
  locale_detect_enabled:
    process.env.NEXT_PUBLIC_LOCALE_DETECT_ENABLED ?? 'false',
};
