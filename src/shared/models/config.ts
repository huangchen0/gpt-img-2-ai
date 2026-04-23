import { revalidateTag, unstable_cache } from 'next/cache';

import { db } from '@/core/db';
import { envConfigs } from '@/config';
import { config } from '@/config/db/schema';
import {
  getAllSettingNames,
  publicSettingNames,
} from '@/shared/services/settings';

export type Config = typeof config.$inferSelect;
export type NewConfig = typeof config.$inferInsert;
export type UpdateConfig = Partial<Omit<NewConfig, 'name'>>;

export type Configs = Record<string, string>;

export const CACHE_TAG_CONFIGS = 'configs';
const DB_PREFERRED_SETTING_NAMES = new Set([
  'pricing_flash_sale_enabled',
  'pricing_flash_sale_duration_hours',
  'pricing_flash_sale_started_at',
]);

export async function saveConfigs(configs: Record<string, string>) {
  const result = await db().transaction(async (tx: any) => {
    const configEntries = Object.entries(configs);
    const results: any[] = [];

    for (const [name, configValue] of configEntries) {
      const [upsertResult] = await tx
        .insert(config)
        .values({ name, value: configValue })
        .onConflictDoUpdate({
          target: config.name,
          set: { value: configValue },
        })
        .returning();

      results.push(upsertResult);
    }

    return results;
  });

  revalidateTag(CACHE_TAG_CONFIGS);

  return result;
}

export async function addConfig(newConfig: NewConfig) {
  const [result] = await db().insert(config).values(newConfig).returning();
  revalidateTag(CACHE_TAG_CONFIGS);

  return result;
}

export const getConfigs = unstable_cache(
  async (): Promise<Configs> => {
    const configs: Record<string, string> = {};

    if (!envConfigs.database_url) {
      return configs;
    }

    const result = await db().select().from(config);
    if (!result) {
      return configs;
    }

    for (const config of result) {
      configs[config.name] = config.value ?? '';
    }

    return configs;
  },
  ['configs'],
  {
    revalidate: 3600,
    tags: [CACHE_TAG_CONFIGS],
  }
);

const getAllConfigsCached = unstable_cache(
  async (): Promise<Configs> => getAllConfigsUncached(),
  ['all-configs'],
  {
    revalidate: 3600,
    tags: [CACHE_TAG_CONFIGS],
  }
);

const getPublicConfigsCached = unstable_cache(
  async (): Promise<Configs> => {
    const allConfigs = await getAllConfigsCached();
    const publicConfigs: Record<string, string> = {};

    for (const key in allConfigs) {
      if (publicSettingNames.includes(key)) {
        publicConfigs[key] = String(allConfigs[key]);
      }
    }

    return publicConfigs;
  },
  ['public-configs'],
  {
    revalidate: 3600,
    tags: [CACHE_TAG_CONFIGS],
  }
);

export async function getAllConfigs(): Promise<Configs> {
  if (typeof window !== 'undefined') {
    return {
      ...envConfigs,
    };
  }

  return getAllConfigsCached();
}

export async function getAllConfigsUncached(): Promise<Configs> {
  let dbConfigs: Configs = {};

  if (envConfigs.database_url) {
    try {
      const result = await db().select().from(config);
      dbConfigs = Object.fromEntries(
        result.map((item) => [item.name, item.value ?? ''])
      );
    } catch (e) {
      console.log(`get configs from db failed:`, e);
      dbConfigs = {};
    }
  }

  const settingNames = await getAllSettingNames();
  settingNames.forEach((key) => {
    if (DB_PREFERRED_SETTING_NAMES.has(key) && key in dbConfigs) {
      return;
    }

    const upperKey = key.toUpperCase();
    if (process.env[upperKey]) {
      dbConfigs[key] = process.env[upperKey] ?? '';
    } else if (process.env[key]) {
      dbConfigs[key] = process.env[key] ?? '';
    }
  });

  return {
    ...envConfigs,
    ...dbConfigs,
  };
}

export async function getPublicConfigs(): Promise<Configs> {
  if (typeof window !== 'undefined') {
    const publicConfigs: Record<string, string> = {};

    for (const key in envConfigs) {
      if (publicSettingNames.includes(key)) {
        publicConfigs[key] = String(envConfigs[key]);
      }
    }

    return publicConfigs;
  }

  return getPublicConfigsCached();
}
