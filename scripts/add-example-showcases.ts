import { db } from '@/core/db';
import { showcase, user } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

const showcaseVideos = [
  {
    id: 'example1-dance-video',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'Dance Performance Example 1',
    prompt: 'Dynamic dance performance with smooth movements and professional choreography. High-quality video generation showcasing fluid motion and realistic character movement.',
    image: 'https://cdn.gpt-image-2-ai.org/uploads/showcases/1770726073685-example1.webm',
    tags: 'dance,performance,example,webm',
    description: 'Professional dance showcase demonstrating AI video generation capabilities',
  },
  {
    id: 'example2-dance-video',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'Dance Performance Example 2',
    prompt: 'Creative dance sequence with artistic movements and expressive choreography. Showcases advanced motion tracking and character consistency.',
    image: 'https://cdn.gpt-image-2-ai.org/uploads/showcases/1770726076546-example2.webm',
    tags: 'dance,creative,example,webm',
    description: 'Artistic dance showcase with advanced AI motion generation',
  },
  {
    id: 'example3-dance-video',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'Dance Performance Example 3',
    prompt: 'Energetic dance performance with dynamic camera angles and impressive choreography. Demonstrates high-quality video synthesis.',
    image: 'https://cdn.gpt-image-2-ai.org/uploads/showcases/1770726078403-example3.webm',
    tags: 'dance,energetic,example,webm',
    description: 'High-energy dance showcase with dynamic cinematography',
  },
  {
    id: 'example4-dance-video',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'Dance Performance Example 4',
    prompt: 'Elegant dance sequence with graceful movements and beautiful composition. Shows sophisticated character animation and motion quality.',
    image: 'https://cdn.gpt-image-2-ai.org/uploads/showcases/1770726080321-example4.webm',
    tags: 'dance,elegant,example,webm',
    description: 'Elegant dance showcase with graceful AI-generated movements',
  },
  {
    id: 'example5-dance-video',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'Dance Performance Example 5',
    prompt: 'Contemporary dance performance with modern choreography and artistic expression. Highlights advanced AI video generation technology.',
    image: 'https://cdn.gpt-image-2-ai.org/uploads/showcases/1770726081640-example5.webm',
    tags: 'dance,contemporary,example,webm',
    description: 'Contemporary dance showcase featuring modern AI choreography',
  },
  {
    id: 'example6-dance-video',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'Dance Performance Example 6',
    prompt: 'Short dance demo with impressive technique and style. Compact demonstration of AI video generation quality.',
    image: 'https://cdn.gpt-image-2-ai.org/uploads/showcases/1770726083657-example6.webm',
    tags: 'dance,demo,example,webm',
    description: 'Compact dance showcase demonstrating AI generation quality',
  },
];

async function addExampleShowcases() {
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
    console.log('\nAdding example showcase videos to database...\n');

    let added = 0;
    let skipped = 0;
    let failed = 0;

    for (const video of showcaseVideos) {
      try {
        const result = await db().insert(showcase).values(video).returning();
        console.log(`✓ Added: ${video.title}`);
        console.log(`  URL: ${video.image}`);
        added++;
      } catch (error: any) {
        if (error.message?.includes('duplicate key') || error.code === '23505') {
          console.log(`⚠ Skipped: ${video.title} (Already exists)`);
          skipped++;
        } else {
          console.error(`✗ Failed to add ${video.title}:`);
          console.error('Error:', error.message);
          failed++;
        }
      }
    }

    console.log('\n========================================');
    console.log(`Total: ${showcaseVideos.length} videos`);
    console.log(`✓ Added: ${added}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`✗ Failed: ${failed}`);
    console.log('========================================\n');

    if (failed > 0) {
      console.log('⚠ Some videos failed to add. Check the errors above.');
      process.exit(1);
    } else {
      console.log('✓ All example showcase videos processed successfully!');
      console.log('\nYou can now view these videos on the showcase page.');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error adding showcase videos:', error);
    process.exit(1);
  }
}

addExampleShowcases();
