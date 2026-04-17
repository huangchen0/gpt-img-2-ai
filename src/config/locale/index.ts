import { envConfigs } from '..';

export const localeNames: Record<string, string> = {
  en: 'English',
  zh: '中文',
  ko: '한국어',
  ja: '日本語',
  ms: 'Bahasa Melayu',
  uk: 'Українська',
  es: 'Español',
};

export const locales = ['en', 'zh', 'ko', 'ja', 'ms', 'uk', 'es'];

export const defaultLocale = envConfigs.locale;

export const localePrefix = 'as-needed';

export const localeDetection = true;

export const localeMessagesRootPath = '@/config/locale/messages';

export const localeMessagesPaths = [
  'common',
  'landing',
  'settings/sidebar',
  'settings/profile',
  'settings/security',
  'settings/billing',
  'settings/payments',
  'settings/credits',
  'settings/apikeys',
  'admin/sidebar',
  'admin/users',
  'admin/roles',
  'admin/permissions',
  'admin/categories',
  'admin/posts',
  'admin/payments',
  'admin/subscriptions',
  'admin/credits',
  'admin/settings',
  'admin/apikeys',
  'admin/ai-tasks',
  'admin/chats',
  'ai/music',
  'ai/chat',
  'ai/image',
  'ai/video',
  'activity/sidebar',
  'activity/ai-tasks',
  'activity/chats',
  'pages/index',
  'pages/pricing',
  'pages/showcases',
  'pages/blog',
  'pages/updates',
  'pages/create',
  'pages/hairstyles',
  'pages/privacy',
  'pages/terms',
  'pages/about',
  'pages/models/kling-3',
  'pages/models/nano-banana',
  'admin/prompts',
  'admin/showcases',
];
