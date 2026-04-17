import { db } from '@/core/db';
import { showcase, user } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

const showcaseVideo = {
  id: 'seedance-v8-2',
  userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
  title: 'happy horse video 8',
  prompt: 'Dynamic video generation with realistic movements and professional cinematography using happy horse AI model.',
  image: 'https://cdn.gptimg2.art/uploads/showcases/1770729180070-2.webm',
  tags: 'seedance,ai-video,demo,webm',
  description: 'Advanced AI video synthesis with realistic motion',
};

async function addSingleShowcase() {
  try {
    console.log('Checking database connection...');

    // Check if user exists
    const userId = 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a';
    const users = await db().select().from(user).where(eq(user.id, userId));

    if (users.length === 0) {
      console.error(`\n✗ Error: User with ID ${userId} does not exist in the database.`);
      console.log('Please create a user first or use an existing user ID.\n');
      process.exit(1);
    }

    console.log(`✓ Database connected. User found: ${users[0].email || userId}`);
    console.log('\nAdding showcase video to database...\n');

    try {
      const result = await db().insert(showcase).values(showcaseVideo).returning();
      console.log(`✓ Added: ${showcaseVideo.title}`);
      console.log(`  URL: ${showcaseVideo.image}`);
      console.log('\n✓ Showcase video added successfully!');
      process.exit(0);
    } catch (error: any) {
      if (error.message?.includes('duplicate key') || error.code === '23505') {
        console.log(`⚠ This showcase already exists: ${showcaseVideo.title}`);
        console.log('No action needed.');
        process.exit(0);
      } else {
        console.error(`✗ Failed to add ${showcaseVideo.title}:`);
        console.error('Error:', error.message);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('Error adding showcase video:', error);
    process.exit(1);
  }
}

addSingleShowcase();
