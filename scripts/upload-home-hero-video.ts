import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { config as configSchema } from '@/config/db/schema';
import { db } from '@/core/db';
import { R2Provider } from '@/extensions/storage/r2';

const DEFAULT_SLUG = 'home-hero-background-20260415';
const workspaceDir = path.join(process.cwd(), 'tmp', 'hero-background-upload');

type CliOptions = {
  sourceUrl?: string;
  sourceFile?: string;
  slug: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  uploadPath?: string;
  endpoint?: string;
  publicDomain?: string;
  accountId?: string;
};

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let sourceUrl = process.env.HOME_HERO_SOURCE_URL || '';
  let sourceFile = process.env.HOME_HERO_SOURCE_FILE || '';
  let slug = DEFAULT_SLUG;
  let accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
  let secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
  let bucket = process.env.R2_BUCKET || '';
  let uploadPath = process.env.R2_UPLOAD_PATH || '';
  let endpoint = process.env.R2_ENDPOINT || '';
  let publicDomain = process.env.R2_PUBLIC_DOMAIN || '';
  let accountId = process.env.R2_ACCOUNT_ID || '';

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--source-url' && args[index + 1]) {
      sourceUrl = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--source-file' && args[index + 1]) {
      sourceFile = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--slug' && args[index + 1]) {
      slug = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--access-key-id' && args[index + 1]) {
      accessKeyId = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--secret-access-key' && args[index + 1]) {
      secretAccessKey = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--bucket' && args[index + 1]) {
      bucket = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--upload-path' && args[index + 1]) {
      uploadPath = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--endpoint' && args[index + 1]) {
      endpoint = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--public-domain' && args[index + 1]) {
      publicDomain = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === '--account-id' && args[index + 1]) {
      accountId = args[index + 1];
      index += 1;
      continue;
    }
  }

  return {
    sourceUrl: sourceUrl || undefined,
    sourceFile: sourceFile || undefined,
    slug,
    accessKeyId: accessKeyId || undefined,
    secretAccessKey: secretAccessKey || undefined,
    bucket: bucket || undefined,
    uploadPath: uploadPath || undefined,
    endpoint: endpoint || undefined,
    publicDomain: publicDomain || undefined,
    accountId: accountId || undefined,
  };
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

async function downloadFile(url: string, filePath: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download source video: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
}

async function prepareSourceVideo(options: CliOptions, targetPath: string) {
  if (options.sourceFile) {
    const resolvedSourcePath = path.resolve(options.sourceFile);

    if (!fs.existsSync(resolvedSourcePath)) {
      throw new Error(`Source file does not exist: ${resolvedSourcePath}`);
    }

    if (resolvedSourcePath !== targetPath) {
      fs.copyFileSync(resolvedSourcePath, targetPath);
    }

    return;
  }

  if (!options.sourceUrl) {
    throw new Error(
      'Missing source video. Pass --source-file or --source-url, or set HOME_HERO_SOURCE_FILE/HOME_HERO_SOURCE_URL.'
    );
  }

  console.log(`Downloading hero video from ${options.sourceUrl}`);
  await downloadFile(options.sourceUrl, targetPath);
}

function runFfmpeg(args: string[]) {
  execFileSync('ffmpeg', args, {
    stdio: 'inherit',
  });
}

function optimizeMp4(sourcePath: string, targetPath: string) {
  runFfmpeg([
    '-y',
    '-i',
    sourcePath,
    '-c',
    'copy',
    '-movflags',
    '+faststart',
    targetPath,
  ]);
}

function convertToWebm(sourcePath: string, targetPath: string) {
  runFfmpeg([
    '-y',
    '-i',
    sourcePath,
    '-c:v',
    'libvpx-vp9',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '34',
    '-b:v',
    '0',
    '-row-mt',
    '1',
    '-deadline',
    'good',
    '-cpu-used',
    '4',
    '-an',
    targetPath,
  ]);
}

function createPoster(sourcePath: string, targetPath: string) {
  runFfmpeg([
    '-y',
    '-ss',
    '00:00:01.000',
    '-i',
    sourcePath,
    '-frames:v',
    '1',
    '-vf',
    'scale=1280:-1',
    '-q:v',
    '2',
    '-update',
    '1',
    targetPath,
  ]);
}

async function uploadFile(
  provider: R2Provider,
  filePath: string,
  key: string,
  contentType: string
) {
  const body = fs.readFileSync(filePath);

  const result = await provider.uploadFile({
    body,
    key,
    contentType,
    disposition: 'inline',
  });

  if (!result.success || !result.url) {
    throw new Error(`Failed to upload ${path.basename(filePath)}: ${result.error}`);
  }

  return result.url;
}

async function main() {
  const options = parseArgs();
  const dbR2Configs = await getR2ConfigsFromDB();

  const r2Configs = {
    ...dbR2Configs,
    accessKeyId: options.accessKeyId || dbR2Configs.accessKeyId,
    secretAccessKey: options.secretAccessKey || dbR2Configs.secretAccessKey,
    bucket: options.bucket || dbR2Configs.bucket,
    uploadPath: options.uploadPath ?? dbR2Configs.uploadPath,
    endpoint: options.endpoint || dbR2Configs.endpoint,
    publicDomain: options.publicDomain || dbR2Configs.publicDomain,
    accountId: options.accountId || dbR2Configs.accountId,
  };

  if (
    !r2Configs.accessKeyId ||
    !r2Configs.secretAccessKey ||
    !r2Configs.bucket ||
    (!r2Configs.endpoint && !r2Configs.accountId)
  ) {
    throw new Error('R2 storage is not fully configured for the requested target.');
  }

  fs.mkdirSync(workspaceDir, { recursive: true });

  const sourcePath = path.join(workspaceDir, `${options.slug}.source.mp4`);
  const mp4Path = path.join(workspaceDir, `${options.slug}.mp4`);
  const webmPath = path.join(workspaceDir, `${options.slug}.webm`);
  const posterPath = path.join(workspaceDir, `${options.slug}.jpg`);

  console.log(
    `Preparing hero source video from ${
      options.sourceFile
        ? path.resolve(options.sourceFile)
        : options.sourceUrl || '(missing source)'
    }`
  );
  await prepareSourceVideo(options, sourcePath);

  console.log('Optimizing MP4 for streaming');
  optimizeMp4(sourcePath, mp4Path);

  console.log('Converting hero video to WebM');
  convertToWebm(sourcePath, webmPath);

  console.log('Generating poster image');
  createPoster(sourcePath, posterPath);

  const provider = new R2Provider(r2Configs);
  const baseKey = `landing/hero/${options.slug}`;

  console.log(
    `Uploading assets to R2 bucket "${r2Configs.bucket}"` +
      (r2Configs.publicDomain
        ? ` via ${r2Configs.publicDomain}`
        : ' via the configured endpoint')
  );
  const [mp4Url, webmUrl, posterUrl] = await Promise.all([
    uploadFile(provider, mp4Path, `${baseKey}.mp4`, 'video/mp4'),
    uploadFile(provider, webmPath, `${baseKey}.webm`, 'video/webm'),
    uploadFile(provider, posterPath, `${baseKey}.jpg`, 'image/jpeg'),
  ]);

  console.log('\nHero background assets uploaded successfully.\n');
  console.log(
    JSON.stringify(
      {
        background_video: {
          mp4_src: mp4Url,
          webm_src: webmUrl,
          poster: posterUrl,
          alt: 'Hero background video',
        },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error('\nFailed to upload hero background video:', error);
  process.exit(1);
});
