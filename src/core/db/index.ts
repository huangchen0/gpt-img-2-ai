import { envConfigs } from '@/config';

import { closePostgresDb, getPostgresDb } from './postgres';

/**
 * Universal DB accessor.
 *
 * Drizzle returns different DB types for Postgres vs SQLite/libsql.
 * If we return a union here, TypeScript can't call methods like `db().insert(...)`
 * because the overloads are incompatible across dialects.
 *
 * So we intentionally return `any` to keep call sites stable.
 */
export function db(): any {
  if (envConfigs.database_provider !== 'postgresql') {
    throw new Error(
      `Unsupported database provider in this Cloudflare build: ${envConfigs.database_provider}`
    );
  }

  return getPostgresDb() as any;
}

export function dbPostgres(): ReturnType<typeof getPostgresDb> {
  if (envConfigs.database_provider !== 'postgresql') {
    throw new Error('Database provider is not PostgreSQL');
  }

  return getPostgresDb();
}

export function dbMysql(): never {
  throw new Error('MySQL is not bundled in this Cloudflare build');
}

export function dbSqlite(): never {
  throw new Error('SQLite is not bundled in this Cloudflare build');
}

export async function closeDb() {
  if (envConfigs.database_provider === 'postgresql') {
    await closePostgresDb();
    return;
  }
}
