import fs from 'fs';
import path from 'path';
import { db } from '@/core/db';
import { showcase, config as configSchema } from '@/config/db/schema';
import { eq, like } from 'drizzle-orm';
import { R2Provider } from '@/extensions/storage/r2';

const videosDir = path.join(process.cwd(), 'public/showcases/videos');

async function getR2ConfigsFromDB() {
  try {
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
  } catch (error) {
    console.error('Error getting R2 configs from database:', error);
    throw error;
  }
}

async function uploadWebMVideosToR2() {
  try {
    console.log('Initializing R2 storage service...\n');

    // Get R2 configs from database
    const r2Configs = await getR2ConfigsFromDB();

    // Validate required configs
    if (!r2Configs.accessKeyId || !r2Configs.secretAccessKey || !r2Configs.bucket) {
      console.error('✗ Error: R2 storage is not properly configured.');
      console.log('\nMissing required configurations:');
      if (!r2Configs.accessKeyId) console.log('  - R2 Access Key');
      if (!r2Configs.secretAccessKey) console.log('  - R2 Secret Key');
      if (!r2Configs.bucket) console.log('  - R2 Bucket Name');
      console.log('\nPlease configure R2 storage in the admin settings:');
      console.log('  1. Go to /admin/settings');
      console.log('  2. Configure R2 settings');
      process.exit(1);
    }

    // Create R2 provider
    const provider = new R2Provider(r2Configs);

    console.log(`✓ R2 Provider initialized`);
    console.log(`  Bucket: ${r2Configs.bucket}`);
    console.log(`  Public Domain: ${r2Configs.publicDomain || '(using default R2 endpoint)'}`);
    console.log('');

    // Get all WebM video files
    const videoFiles = fs.readdirSync(videosDir).filter((file) => file.endsWith('.webm'));

    if (videoFiles.length === 0) {
      console.error('✗ No WebM video files found in public/showcases/videos/');
      process.exit(1);
    }

    console.log(`Found ${videoFiles.length} WebM video files to upload\n`);
    console.log('========================================\n');

    let uploaded = 0;
    let failed = 0;

    for (const filename of videoFiles) {
      const filePath = path.join(videosDir, filename);
      const fileBuffer = fs.readFileSync(filePath);
      const fileSize = (fileBuffer.length / 1024 / 1024).toFixed(2);

      // Generate R2 key (path in bucket)
      const timestamp = Date.now();
      const key = `showcases/${timestamp}-${filename}`;

      console.log(`Uploading: ${filename} (${fileSize} MB)`);

      try {
        const result = await provider.uploadFile({
          body: fileBuffer,
          key: key,
          contentType: 'video/webm',
          disposition: 'inline',
        });

        if (result.success && result.url) {
          console.log(`  ✓ Uploaded to: ${result.url}`);

          // Find matching showcase record by filename (replace .webm with .mp4)
          const mp4Filename = filename.replace('.webm', '.mp4');
          const showcases = await db()
            .select()
            .from(showcase)
            .where(like(showcase.image, `%${mp4Filename}`));

          if (showcases.length > 0) {
            // Update showcase record with WebM R2 URL
            for (const s of showcases) {
              await db()
                .update(showcase)
                .set({ image: result.url })
                .where(eq(showcase.id, s.id));
              console.log(`  ✓ Updated showcase: ${s.title}`);
            }
          } else {
            console.log(`  ⚠ No matching showcase found for ${filename} (looking for ${mp4Filename})`);
          }

          uploaded++;
        } else {
          console.error(`  ✗ Upload failed: ${result.error}`);
          failed++;
        }
      } catch (error: any) {
        console.error(`  ✗ Error: ${error.message}`);
        failed++;
      }

      console.log('');
    }

    console.log('========================================');
    console.log(`Total: ${videoFiles.length} videos`);
    console.log(`✓ Uploaded: ${uploaded}`);
    console.log(`✗ Failed: ${failed}`);
    console.log('========================================\n');

    if (failed > 0) {
      console.log('⚠ Some videos failed to upload. Check the errors above.');
      process.exit(1);
    } else {
      console.log('✓ All WebM videos uploaded successfully!');
      console.log('\nShowcase videos are now served from R2 CDN in WebM format.');
      console.log('You can safely delete the local videos in public/showcases/videos/ if needed.');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error uploading videos:', error);
    process.exit(1);
  }
}

uploadWebMVideosToR2();
