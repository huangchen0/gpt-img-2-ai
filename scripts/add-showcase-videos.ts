import { db } from '@/core/db';
import { showcase, user } from '@/config/db/schema';
import { eq } from 'drizzle-orm';

const showcaseVideos = [
  // First batch (early high-heat demos)
  {
    id: 'v1-1min-war-scene-001',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: '1 Minute War Scene Cinematography',
    prompt: 'A cinematic war scene with intense action. Camera starts with a wide shot of soldiers advancing through smoke-filled trenches, then pans to a close-up of a determined soldier loading his rifle, followed by a dynamic tracking shot of artillery firing, ending with an overhead drone-like view of the battlefield chaos. Realistic lighting, high detail, 1080p.',
    image: '/showcases/videos/1min-war-scene.mp4',
    tags: 'war,cinematic,action,demo',
    description: 'Epic 1-minute war scene with multiple camera angles and dynamic action sequences',
  },
  {
    id: 'v1-man-of-steel-002',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'Man of Steel Recreation',
    prompt: 'Recreate the iconic Superman flight scene from Man of Steel: Superman soaring through clouds at high speed, camera circling around him, dramatic lighting and wind effects, realistic physics.',
    image: '/showcases/videos/man-of-steel.mp4',
    tags: 'superman,cinematic,recreation,movie',
    description: 'Recreation of the iconic Superman flight scene from Man of Steel',
  },
  {
    id: 'v1-piano-girl-003',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'Piano Girl Performance',
    prompt: 'Ultra-realistic girl playing piano with smooth hand movements and natural expressions. Long continuous shot with excellent character consistency.',
    image: '/showcases/videos/piano-girl.mp4',
    tags: 'piano,music,realistic,performance',
    description: 'Incredibly realistic piano performance with natural hand movements and expressions',
  },
  {
    id: 'v1-45s-long-shot-004',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: '45 Second Long Shot Demo',
    prompt: 'Smooth 45-second continuous shot demonstrating start-frame and end-frame control for extended video generation.',
    image: '/showcases/videos/45s-long-shot.mp4',
    tags: 'long-shot,cinematic,demo,technical',
    description: 'Demonstrates extended video generation with start/end frame control',
  },
  {
    id: 'v1-2min-fight-005',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: '2 Minute Fight Scene',
    prompt: 'Complete 2-minute fight choreography with full story arc and character consistency throughout.',
    image: '/showcases/videos/2min-fight.mp4',
    tags: 'fight,action,long-form,choreography',
    description: 'Full 2-minute fight choreography demonstrating long-form generation capability',
  },
  {
    id: 'v1-17s-cinematic-006',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: '17 Second Cinematic Shot',
    prompt: 'Quick cinematic demonstration with dynamic camera movements and professional lighting.',
    image: '/showcases/videos/17s-cinematic.mp4',
    tags: 'cinematic,quick,demo,lighting',
    description: 'Professional cinematic shot with dynamic camera work',
  },
  // Second batch (latest demos)
  {
    id: 'v2-nike-ad-007',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'Nike Style Advertisement',
    prompt: 'Complete Nike-style commercial with multiple scenes and lip-synced audio. Professional advertisement quality.',
    image: '/showcases/videos/nike-ad.mp4',
    tags: 'nike,commercial,advertisement,audio',
    description: 'Professional commercial-quality advertisement with audio sync',
  },
  {
    id: 'v2-character-consistency-008',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'Character Consistency Demo',
    prompt: 'Short demo showing exceptional character consistency and quality, demonstrating Bytedance AI capabilities.',
    image: '/showcases/videos/character-consistency.mp4',
    tags: 'consistency,demo,quality,bytedance',
    description: 'Demonstrates exceptional character consistency throughout the video',
  },
  {
    id: 'v2-f1-prediction-009',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'F1 Racing Metaphor',
    prompt: 'Multi-car racing scene used to visualize prediction market dynamics with smooth camera work.',
    image: '/showcases/videos/f1-prediction.mp4',
    tags: 'f1,racing,metaphor,visualization',
    description: 'Creative use of racing metaphor for prediction market visualization',
  },
  {
    id: 'v2-chat-prompt-010',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'Natural Language Generation',
    prompt: 'Daily scene generated from conversational prompt, demonstrating natural language understanding capabilities.',
    image: '/showcases/videos/chat-prompt.mp4',
    tags: 'natural-language,daily,demo,nlp',
    description: 'Generated from natural conversational prompts without complex formatting',
  },
  {
    id: 'v2-funny-scene-011',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'Funny Sample Scene',
    prompt: '15-second humorous demonstration showing creative capabilities and entertaining content generation.',
    image: '/showcases/videos/funny-scene.mp4',
    tags: 'funny,creative,short,entertainment',
    description: 'Humorous demonstration of creative content generation',
  },
  {
    id: 'v2-sora-comparison-012',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: 'Sora vs Happy HorseComparison',
    prompt: 'Side-by-side comparison demonstrating long video generation capabilities against OpenAI Sora.',
    image: '/showcases/videos/sora-comparison.mp4',
    tags: 'comparison,sora,benchmark,openai',
    description: 'Benchmark comparison with OpenAI Sora for long video generation',
  },
  {
    id: 'v2-6s-multishot-013',
    userId: 'dd2fdc4f-8c3d-4ae1-a020-84c789989b4a',
    title: '6 Second Multi-Shot',
    prompt: 'Fast-paced 6-second cinematic with multiple camera angles and smooth transitions between shots.',
    image: '/showcases/videos/6s-multishot.mp4',
    tags: 'multi-shot,fast,cinematic,transitions',
    description: 'Rapid multi-angle shot demonstrating smooth transitions',
  },
];

async function addShowcaseVideos() {
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
    console.log('\nAdding showcase videos to database...\n');

    let added = 0;
    let skipped = 0;
    let failed = 0;

    for (const video of showcaseVideos) {
      try {
        const result = await db().insert(showcase).values(video).returning();
        console.log(`✓ Added: ${video.title}`);
        added++;
      } catch (error: any) {
        // Log the full error for debugging
        console.error(`\n✗ Failed to add ${video.title}:`);
        console.error('Error details:', JSON.stringify(error, null, 2));

        if (error.message?.includes('duplicate key') || error.code === '23505') {
          console.log(`  (Reason: Already exists)\n`);
          skipped++;
        } else {
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
      console.log('✓ All showcase videos processed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error adding showcase videos:', error);
    process.exit(1);
  }
}

addShowcaseVideos();
