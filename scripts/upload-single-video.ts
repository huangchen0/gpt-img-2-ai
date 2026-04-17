import fs from 'fs';
import path from 'path';
import { db } from '@/core/db';
import { showcase, config as configSchema } from '@/config/db/schema';
import { eq } from 'drizzle-orm';
import { R2Provider } from '@/extensions/storage/r2';

const filename = '6s-multishot.mp4';
const videosDir = path.join(process.cwd(), 'public/showcases/videos');
const filePath = path.join(videosDir, filename);

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

async function uploadSingleVideo() {
  try {
    console.log(`Uploading ${filename} to R2...\n`);

    const r2Configs = await getR2ConfigsFromDB();
    const provider = new R2Provider(r2Configs);

    const fileBuffer = fs.readFileSync(filePath);
    const fileSize = (fileBuffer.length / 1024 / 1024).toFixed(2);

    const timestamp = Date.now();
    const key = `showcases/${timestamp}-${filename}`;

    console.log(`File size: ${fileSize} MB`);

    const result = await provider.uploadFile({
      body: fileBuffer,
      key: key,
      contentType: 'video/mp4',
      disposition: 'inline',
    });

    if (result.success && result.url) {
      console.log(`✓ Uploaded to: ${result.url}\n`);

      // Update showcase record
      const showcases = await db()
        .select()
        .from(showcase)
        .where(eq(showcase.image, `/showcases/videos/${filename}`));

      if (showcases.length > 0) {
        for (const s of showcases) {
          await db()
            .update(showcase)
            .set({ image: result.url })
            .where(eq(showcase.id, s.id));
          console.log(`✓ Updated showcase: ${s.title}`);
        }
      }

      console.log('\n✓ Done!');
    } else {
      console.error(`✗ Upload failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

uploadSingleVideo();
