import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, unlinkSync } from 'fs';
import { db } from '@/core/db';
import { showcase, config as configSchema } from '@/config/db/schema';
import { R2Provider } from '@/extensions/storage/r2';
import path from 'path';

const execAsync = promisify(exec);

const twitterUrls = [
  'https://x.com/aidenguoai/status/2020800658761277744',
  'https://x.com/dynamicwangs/status/2020054894741451123',
  'https://x.com/qhgy/status/2020342285595193386',
  'https://x.com/yng24156562/status/2020765484485054654',
  'https://x.com/DarrenTheLi/status/2020323133417484655',
  'https://x.com/XH_Lee23/status/2020682500516036824',
  'https://x.com/Lucy_love_AI/status/2021037206585192749',
  'https://x.com/AngryTomtweets/status/2020784886932738470',
  'https://x.com/EHuanglu/status/2020914244330324177',
  'https://x.com/takuto_pitaliy/status/2021021631450804',
];

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
    uploadPath: configMap['r2_upload_path'] || 'showcases',
    region: 'auto',
    endpoint: configMap['r2_endpoint'] || '',
    publicDomain: configMap['r2_domain'] || '',
    accountId: configMap['r2_account_id'] || '',
  };
}

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  console.log(`📥 Downloading from: ${url}`);
  try {
    const command = `yt-dlp -f "best[ext=mp4]" -o "${outputPath}" "${url}"`;
    await execAsync(command);
    console.log(`✅ Downloaded: ${outputPath}`);
  } catch (error: any) {
    console.error(`❌ Failed to download ${url}:`, error.message);
    throw error;
  }
}

async function uploadToR2(filePath: string, fileName: string, provider: R2Provider): Promise<string> {
  console.log(`☁️  Uploading to R2: ${fileName}`);

  try {
    const fileBuffer = readFileSync(filePath);
    const fileSize = (fileBuffer.length / 1024 / 1024).toFixed(2);
    console.log(`File size: ${fileSize} MB`);

    const timestamp = Date.now();
    const key = `${timestamp}-${fileName}`;

    const result = await provider.uploadFile({
      body: fileBuffer,
      key: key,
      contentType: 'video/mp4',
      disposition: 'inline',
    });

    if (result.success && result.url) {
      console.log(`✅ Uploaded to R2: ${result.url}`);
      return result.url;
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  } catch (error: any) {
    console.error(`❌ Failed to upload ${fileName}:`, error.message);
    throw error;
  }
}

async function addToShowcase(videoUrl: string, title: string, index: number, tweetId: string): Promise<void> {
  console.log(`💾 Adding to showcase: ${title}`);

  try {
    // Generate unique ID for showcase
    const showcaseId = `twitter_${tweetId}_${Date.now()}`;

    await db().insert(showcase).values({
      id: showcaseId,
      title: title,
      prompt: `happy horse Video Showcase ${index + 1}`,
      image: videoUrl,
      userId: 'system',
      tags: 'seedance,ai-video,twitter',
    });

    console.log(`✅ Added to showcase: ${title}`);
  } catch (error: any) {
    console.error(`❌ Failed to add to showcase:`, error.message);
    throw error;
  }
}

async function processVideo(url: string, index: number, provider: R2Provider): Promise<void> {
  const tweetId = url.split('/status/')[1];
  const tempFileName = `twitter_${tweetId}.mp4`;
  const tempFilePath = path.join('/tmp', tempFileName);

  try {
    console.log(`\n🎬 [${index + 1}/${twitterUrls.length}] Processing: ${url}`);

    // 1. 下载视频
    await downloadVideo(url, tempFilePath);

    // 2. 上传到R2
    const r2Url = await uploadToR2(tempFilePath, tempFileName, provider);

    // 3. 添加到showcase
    const title = `happy horse Showcase - Tweet ${tweetId}`;
    await addToShowcase(r2Url, title, index, tweetId);

    // 4. 清理临时文件
    unlinkSync(tempFilePath);
    console.log(`✅ Completed: ${url}\n`);

  } catch (error: any) {
    console.error(`❌ Error processing ${url}:`, error.message);
    // 尝试清理临时文件
    try {
      unlinkSync(tempFilePath);
    } catch {}
  }
}

async function main() {
  console.log('🎬 Starting Twitter video download and upload process...\n');
  console.log(`Total videos to process: ${twitterUrls.length}\n`);

  // 从数据库读取R2配置
  console.log('📖 Loading R2 configuration from database...');
  const r2Configs = await getR2ConfigsFromDB();

  // 检查必要的配置
  if (!r2Configs.accessKeyId || !r2Configs.secretAccessKey) {
    console.error('❌ Missing R2 credentials in database config table');
    console.error('Please configure R2 settings in admin dashboard (/admin/settings)');
    process.exit(1);
  }

  console.log(`✅ R2 Config loaded: ${r2Configs.bucket} at ${r2Configs.publicDomain}\n`);

  // 创建R2 Provider
  const provider = new R2Provider(r2Configs);

  // 按顺序处理每个视频（避免并发过多）
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < twitterUrls.length; i++) {
    try {
      await processVideo(twitterUrls[i], i, provider);
      successCount++;
    } catch (error) {
      failCount++;
    }

    // 添加短暂延迟避免rate limiting
    if (i < twitterUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Success: ${successCount}/${twitterUrls.length}`);
  console.log(`❌ Failed: ${failCount}/${twitterUrls.length}`);
  console.log('='.repeat(50));

  if (failCount > 0) {
    console.log('\n⚠️  Some videos failed to process. Check the logs above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All videos processed successfully!');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
