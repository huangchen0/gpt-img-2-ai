import { betterAuth, BetterAuthOptions } from 'better-auth';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import { config } from '@/config/db/schema';
import { getAllSettingNames } from '@/shared/services/settings';

import { getAuthOptions } from './config';

async function getRuntimeAuthConfigs() {
  let dbConfigs: Record<string, string> = {};

  if (envConfigs.database_url) {
    const rows = await db().select().from(config);
    dbConfigs = Object.fromEntries(
      rows.map((row: typeof config.$inferSelect) => [row.name, row.value ?? ''])
    );
  }

  const settingNames = await getAllSettingNames();
  for (const key of settingNames) {
    const upperKey = key.toUpperCase();
    if (process.env[upperKey]) {
      dbConfigs[key] = process.env[upperKey] ?? '';
    } else if (process.env[key]) {
      dbConfigs[key] = process.env[key] ?? '';
    }
  }

  return {
    ...envConfigs,
    ...dbConfigs,
  };
}

// get auth instance in server side
export async function getAuth() {
  const configs = await getRuntimeAuthConfigs();
  const authOptions = await getAuthOptions(configs);

  return betterAuth(authOptions as BetterAuthOptions);
}
