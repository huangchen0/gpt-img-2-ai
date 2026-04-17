import fs from 'fs';
import path from 'path';

import { db } from '@/core/db';
import { config as configSchema } from '@/config/db/schema';
import { R2Provider } from '@/extensions/storage/r2';

type CliOptions = {
  sourceUrl?: string;
  sourceFile?: string;
  key?: string;
  contentType?: string;
  disposition?: 'inline' | 'attachment';
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  uploadPath?: string;
  endpoint?: string;
  publicDomain?: string;
  accountId?: string;
};

function printUsage() {
  console.log(`
Usage:
  pnpm exec tsx scripts/upload-remote-asset-to-r2.ts --source-url <url> --key <key>
  pnpm exec tsx scripts/upload-remote-asset-to-r2.ts --source-file <path> --key <key>

Examples:
  pnpm exec tsx scripts/upload-remote-asset-to-r2.ts \\
    --source-url https://cdn.pollo.ai/prod/public/images/index/sales.png \\
    --key landing/banners/sales.png

  pnpm exec tsx scripts/upload-remote-asset-to-r2.ts \\
    --source-file ./tmp/sales.png \\
    --key landing/banners/sales.png

Optional R2 overrides:
  --access-key-id
  --secret-access-key
  --bucket
  --upload-path
  --endpoint
  --public-domain
  --account-id
  --content-type
  --disposition

If R2 overrides are omitted, the script falls back to:
  1. Environment variables
  2. Configs stored in the app database
`);
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const envDisposition = process.env.CONTENT_DISPOSITION;
  const options: CliOptions = {
    sourceUrl: process.env.SOURCE_URL || undefined,
    sourceFile: process.env.SOURCE_FILE || undefined,
    key: process.env.R2_OBJECT_KEY || undefined,
    contentType: process.env.CONTENT_TYPE || undefined,
    disposition: envDisposition === 'attachment' ? 'attachment' : 'inline',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || undefined,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || undefined,
    bucket: process.env.R2_BUCKET || undefined,
    uploadPath: process.env.R2_UPLOAD_PATH || undefined,
    endpoint: process.env.R2_ENDPOINT || undefined,
    publicDomain: process.env.R2_PUBLIC_DOMAIN || undefined,
    accountId: process.env.R2_ACCOUNT_ID || undefined,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = args[index + 1];

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    if (arg === '--source-url' && nextValue) {
      options.sourceUrl = nextValue;
      index += 1;
      continue;
    }

    if (arg === '--source-file' && nextValue) {
      options.sourceFile = nextValue;
      index += 1;
      continue;
    }

    if (arg === '--key' && nextValue) {
      options.key = nextValue;
      index += 1;
      continue;
    }

    if (arg === '--content-type' && nextValue) {
      options.contentType = nextValue;
      index += 1;
      continue;
    }

    if (arg === '--disposition' && nextValue) {
      options.disposition =
        nextValue === 'attachment' ? 'attachment' : 'inline';
      index += 1;
      continue;
    }

    if (arg === '--access-key-id' && nextValue) {
      options.accessKeyId = nextValue;
      index += 1;
      continue;
    }

    if (arg === '--secret-access-key' && nextValue) {
      options.secretAccessKey = nextValue;
      index += 1;
      continue;
    }

    if (arg === '--bucket' && nextValue) {
      options.bucket = nextValue;
      index += 1;
      continue;
    }

    if (arg === '--upload-path' && nextValue) {
      options.uploadPath = nextValue;
      index += 1;
      continue;
    }

    if (arg === '--endpoint' && nextValue) {
      options.endpoint = nextValue;
      index += 1;
      continue;
    }

    if (arg === '--public-domain' && nextValue) {
      options.publicDomain = nextValue;
      index += 1;
      continue;
    }

    if (arg === '--account-id' && nextValue) {
      options.accountId = nextValue;
      index += 1;
      continue;
    }
  }

  return options;
}

async function getR2ConfigsFromDB() {
  const configs = await db().select().from(configSchema);
  const configMap: Record<string, string> = {};

  for (const config of configs) {
    configMap[config.name] = config.value ?? '';
  }

  return {
    accessKeyId: configMap['r2_access_key'] || '',
    secretAccessKey: configMap['r2_secret_key'] || '',
    bucket: configMap['r2_bucket_name'] || '',
    uploadPath: configMap['r2_upload_path'] || 'uploads',
    region: 'auto',
    endpoint: configMap['r2_endpoint'] || '',
    publicDomain: configMap['r2_domain'] || '',
    accountId: configMap['r2_account_id'] || '',
  };
}

function getFilenameFromSource(input: string) {
  try {
    const url = new URL(input);
    return path.basename(url.pathname) || 'asset';
  } catch {
    return path.basename(input) || 'asset';
  }
}

function inferContentType(filename: string) {
  const extension = path.extname(filename).toLowerCase();

  switch (extension) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    default:
      return 'application/octet-stream';
  }
}

async function resolveSource(
  options: CliOptions
): Promise<{ body: Buffer; filename: string; contentType?: string }> {
  if (options.sourceFile) {
    const resolvedPath = path.resolve(options.sourceFile);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Source file does not exist: ${resolvedPath}`);
    }

    return {
      body: fs.readFileSync(resolvedPath),
      filename: path.basename(resolvedPath),
      contentType: options.contentType || inferContentType(resolvedPath),
    };
  }

  if (!options.sourceUrl) {
    throw new Error(
      'Missing source asset. Pass --source-url or --source-file.'
    );
  }

  const response = await fetch(options.sourceUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download remote asset: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const headerContentType = response.headers
    .get('content-type')
    ?.split(';')[0]
    ?.trim();
  const filename = getFilenameFromSource(options.sourceUrl);

  return {
    body: Buffer.from(arrayBuffer),
    filename,
    contentType:
      options.contentType || headerContentType || inferContentType(filename),
  };
}

async function uploadRemoteAsset() {
  const options = parseArgs();

  if (!options.sourceUrl && !options.sourceFile) {
    printUsage();
    throw new Error('Missing source asset input.');
  }

  const source = await resolveSource(options);
  const dbR2Configs = await getR2ConfigsFromDB();

  const r2Configs = {
    accessKeyId: options.accessKeyId || dbR2Configs.accessKeyId,
    secretAccessKey: options.secretAccessKey || dbR2Configs.secretAccessKey,
    bucket: options.bucket || dbR2Configs.bucket,
    uploadPath: options.uploadPath || dbR2Configs.uploadPath,
    region: 'auto',
    endpoint: options.endpoint || dbR2Configs.endpoint,
    publicDomain: options.publicDomain || dbR2Configs.publicDomain,
    accountId: options.accountId || dbR2Configs.accountId,
  };

  if (
    !r2Configs.accessKeyId ||
    !r2Configs.secretAccessKey ||
    !r2Configs.bucket
  ) {
    throw new Error(
      'Incomplete R2 configuration. Provide credentials via args/env or configure them in the app settings table.'
    );
  }

  const key = (options.key || source.filename).replace(/^\/+/, '');
  const provider = new R2Provider(r2Configs);

  console.log(`Uploading ${source.filename} -> ${key}`);
  console.log(`Bucket: ${r2Configs.bucket}`);
  console.log(`Upload path: ${r2Configs.uploadPath || 'uploads'}`);
  console.log(`Content-Type: ${source.contentType}`);

  const result = await provider.uploadFile({
    body: source.body,
    key,
    contentType: source.contentType,
    disposition: options.disposition || 'inline',
  });

  if (!result.success || !result.url) {
    throw new Error(result.error || 'Upload failed');
  }

  console.log('');
  console.log(`Public URL: ${result.url}`);
}

uploadRemoteAsset().catch((error) => {
  console.error(
    error instanceof Error ? `Error: ${error.message}` : 'Unknown error'
  );
  process.exit(1);
});
