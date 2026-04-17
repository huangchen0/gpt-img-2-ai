import { db } from '@/core/db';
import { showcase } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

const videoId = 'v2-6s-multishot-013';

async function deleteShowcaseVideo() {
  try {
    console.log(`Deleting showcase video: ${videoId}\n`);

    // First check if it exists
    const existing = await db()
      .select()
      .from(showcase)
      .where(eq(showcase.id, videoId));

    if (existing.length === 0) {
      console.log('✗ Video not found in database');
      process.exit(1);
    }

    console.log(`Found video: ${existing[0].title}`);
    console.log(`URL: ${existing[0].image}\n`);

    // Delete from database
    await db()
      .delete(showcase)
      .where(eq(showcase.id, videoId));

    console.log('✓ Successfully deleted from showcase');
    console.log('\nNote: The video file still exists on R2 storage.');
    console.log('If you want to delete it from R2, you can do so from the Cloudflare dashboard.');

    process.exit(0);
  } catch (error) {
    console.error('Error deleting video:', error);
    process.exit(1);
  }
}

deleteShowcaseVideo();
