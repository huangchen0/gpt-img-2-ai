import { db } from '@/core/db';
import { showcase, user } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

const showcaseVideos = [
  {
    id: 'seedance-v7-1',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'happy horse video 7',
    prompt: 'Professional AI-generated video showcasing advanced motion synthesis and character consistency with happy horse technology.',
    image: 'https://cdn.gpt-image-2-ai.org/uploads/showcases/1770729176341-1.webm',
    tags: 'seedance,ai-video,demo,webm',
    description: 'High-quality AI video generation demonstration',
  },
  {
    id: 'seedance-v8-2',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'happy horse video 8',
    prompt: 'Dynamic video generation with realistic movements and professional cinematography using happy horse AI model.',
    image: 'https://cdn.gpt-image-2-ai.org/uploads/showcases/1770729180070-2.webm',
    tags: 'seedance,ai-video,demo,webm',
    description: 'Advanced AI video synthesis with realistic motion',
  },
  {
    id: 'seedance-v9-3',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'happy horse video 9',
    prompt: 'Creative AI video generation showcasing happy horse capabilities in producing high-quality, coherent video content.',
    image: 'https://cdn.gpt-image-2-ai.org/uploads/showcases/1770729182754-3.webm',
    tags: 'seedance,ai-video,demo,webm',
    description: 'Creative video generation with AI technology',
  },
  {
    id: 'seedance-v10-4',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'happy horse video 10',
    prompt: 'Impressive AI-generated video demonstrating smooth motion transitions and excellent character consistency.',
    image: 'https://cdn.gpt-image-2-ai.org/uploads/showcases/1770729185005-4.webm',
    tags: 'seedance,ai-video,demo,webm',
    description: 'Smooth motion transitions in AI-generated video',
  },
  {
    id: 'seedance-v11-5',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'happy horse video 11',
    prompt: 'High-quality video synthesis with happy horse, featuring natural movements and professional visual quality.',
    image: 'https://cdn.gpt-image-2-ai.org/uploads/showcases/1770729186894-5.webm',
    tags: 'seedance,ai-video,demo,webm',
    description: 'Natural movements in professional AI video',
  },
  {
    id: 'seedance-v12-6',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'happy horse video 12',
    prompt: 'Advanced AI video generation showcasing happy horse technology with impressive visual fidelity and motion quality.',
    image: 'https://cdn.gpt-image-2-ai.org/uploads/showcases/1770729188831-6.webm',
    tags: 'seedance,ai-video,demo,webm',
    description: 'Impressive visual fidelity in AI-generated video',
  },
  {
    id: 'seedance-v13-7',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'happy horse video 13',
    prompt: 'Cutting-edge AI video generation with happy horse, demonstrating state-of-the-art motion synthesis and visual quality.',
    image: 'https://cdn.gpt-image-2-ai.org/uploads/showcases/1770729190975-7.webm',
    tags: 'seedance,ai-video,demo,webm',
    description: 'State-of-the-art AI motion synthesis demonstration',
  },
];

async function addNewShowcases() {
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
    console.log('\nAdding new showcase videos to database...\n');

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
      console.log('✓ All new showcase videos processed successfully!');
      console.log('\nYou can now view these videos on the showcase page.');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error adding showcase videos:', error);
    process.exit(1);
  }
}

addNewShowcases();
