import { execFileSync } from 'child_process';
import fs from 'fs';
import path, { extname, parse } from 'path';

import { config as configSchema } from '@/config/db/schema';
import { db } from '@/core/db';
import { R2Provider } from '@/extensions/storage/r2';

const sourceDir = path.join(process.cwd(), 'public', 'video');
const convertedDir = path.join(process.cwd(), 'tmp', 'home-showcase-webm');
const manifestPath = path.join(sourceDir, 'r2-manifest.json');
const generatedManifestPath = path.join(
  process.cwd(),
  'src',
  'generated',
  'home-video-manifest.ts'
);
const supportedExtensions = new Set(['.mp4', '.mov', '.webm', '.ogg']);

type ManifestItem = {
  sourceFileName: string;
  uploadedFileName: string;
  url: string;
  uploadedAt: string;
};

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

function buildUploadedFileName(fileName: string, index: number) {
  const baseName = parse(fileName).name;
  const compactDateMatch = baseName.match(/(\d{8})(\d{6})$/);
  if (compactDateMatch) {
    return `home-video-${compactDateMatch[1]}${compactDateMatch[2]}.webm`;
  }

  const dashedDateMatch = baseName.match(
    /(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})/
  );
  if (dashedDateMatch) {
    const [, year, month, day, hour, minute, second] = dashedDateMatch;
    return `home-video-${year}${month}${day}${hour}${minute}${second}.webm`;
  }

  const normalized = baseName
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  if (normalized) {
    return `${normalized}.webm`;
  }

  return `home-video-${String(index + 1).padStart(2, '0')}.webm`;
}

function getUniqueUploadedFileName(
  candidate: string,
  usedNames: Set<string>,
  index: number
) {
  if (!usedNames.has(candidate)) {
    usedNames.add(candidate);
    return candidate;
  }

  const { name, ext } = path.parse(candidate);
  let suffix = index + 1;
  let nextCandidate = `${name}-${suffix}${ext}`;

  while (usedNames.has(nextCandidate)) {
    suffix += 1;
    nextCandidate = `${name}-${suffix}${ext}`;
  }

  usedNames.add(nextCandidate);
  return nextCandidate;
}

function convertVideoToWebm(sourcePath: string, targetPath: string) {
  execFileSync(
    'ffmpeg',
    [
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
    ],
    {
      stdio: 'inherit',
    }
  );
}

async function main() {
  console.log('Preparing local home showcase videos...\n');

  const r2Configs = await getR2ConfigsFromDB();
  if (
    !r2Configs.accessKeyId ||
    !r2Configs.secretAccessKey ||
    !r2Configs.bucket ||
    !r2Configs.endpoint
  ) {
    throw new Error('R2 storage is not fully configured in the database.');
  }

  const provider = new R2Provider(r2Configs);

  fs.mkdirSync(convertedDir, { recursive: true });

  const sourceFiles = fs
    .readdirSync(sourceDir)
    .filter((fileName) => {
      const extension = extname(fileName).toLowerCase();
      return supportedExtensions.has(extension);
    })
    .sort((left, right) => right.localeCompare(left, 'zh-Hans-CN'));

  if (sourceFiles.length === 0) {
    throw new Error('No source videos were found in public/video.');
  }

  console.log(`Found ${sourceFiles.length} source videos.\n`);

  const manifest: ManifestItem[] = [];
  const usedUploadedNames = new Set<string>();

  for (const [index, sourceFileName] of sourceFiles.entries()) {
    const sourcePath = path.join(sourceDir, sourceFileName);
    const uploadedFileName = getUniqueUploadedFileName(
      buildUploadedFileName(sourceFileName, index),
      usedUploadedNames,
      index
    );
    const convertedPath = path.join(convertedDir, uploadedFileName);
    const key = `showcases/home/${uploadedFileName}`;

    console.log(`Converting ${sourceFileName} -> ${uploadedFileName}`);
    convertVideoToWebm(sourcePath, convertedPath);

    const fileBuffer = fs.readFileSync(convertedPath);
    const fileSizeMB = (fileBuffer.length / 1024 / 1024).toFixed(2);

    console.log(`Uploading ${uploadedFileName} (${fileSizeMB} MB)`);
    const result = await provider.uploadFile({
      body: fileBuffer,
      key,
      contentType: 'video/webm',
      disposition: 'inline',
    });

    if (!result.success || !result.url) {
      throw new Error(
        `Failed to upload ${uploadedFileName}: ${result.error || 'Unknown error'}`
      );
    }

    manifest.push({
      sourceFileName,
      uploadedFileName,
      url: result.url,
      uploadedAt: new Date().toISOString(),
    });

    console.log(`Uploaded to ${result.url}\n`);
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    generatedManifestPath,
    `${buildGeneratedManifestSource(manifest)}\n`,
    'utf8'
  );

  console.log(`Manifest written to ${manifestPath}`);
  console.log(`Generated manifest written to ${generatedManifestPath}`);
  console.log('All home showcase videos were converted and uploaded successfully.');
}

function buildGeneratedManifestSource(manifest: ManifestItem[]) {
  return [
    'export type HomeVideoManifestItem = {',
    '  sourceFileName: string;',
    '  uploadedFileName: string;',
    '  url: string;',
    '  uploadedAt: string;',
    '};',
    '',
    'export const homeVideoManifest: HomeVideoManifestItem[] = ' +
      `${JSON.stringify(manifest, null, 2)};`,
  ].join('\n');
}

main().catch((error) => {
  console.error('\nFailed to convert and upload home showcase videos:', error);
  process.exit(1);
});
