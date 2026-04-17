import { db } from '@/core/db';
import { showcase } from '@/config/db/schema';
import { like } from 'drizzle-orm';

async function verifyShowcaseURLs() {
  try {
    console.log('Checking showcase video URLs...\n');

    // Get all showcases with video files
    const showcases = await db()
      .select()
      .from(showcase)
      .where(like(showcase.image, '%showcases%'));

    console.log(`Found ${showcases.length} showcase entries:\n`);

    let r2Count = 0;
    let localCount = 0;

    showcases.forEach((s: typeof showcase.$inferSelect) => {
      const isR2 = s.image.includes('cdn.gpt-image-2-ai.org') || s.image.includes('.r2.cloudflarestorage.com');
      if (isR2) {
        r2Count++;
        console.log(`✓ [R2] ${s.title}`);
        console.log(`  URL: ${s.image}\n`);
      } else {
        localCount++;
        console.log(`  [Local] ${s.title}`);
        console.log(`  URL: ${s.image}\n`);
      }
    });

    console.log('========================================');
    console.log(`Total: ${showcases.length} videos`);
    console.log(`✓ Hosted on R2 CDN: ${r2Count}`);
    console.log(`  Still local: ${localCount}`);
    console.log('========================================\n');

    if (r2Count > 0) {
      console.log('✓ Videos are successfully hosted on R2 CDN!');
      console.log(`  CDN URL: https://cdn.gpt-image-2-ai.org`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error verifying URLs:', error);
    process.exit(1);
  }
}

verifyShowcaseURLs();
