import { db } from '@/core/db';
import { showcase, user } from '@/config/db/schema';
import { asc } from 'drizzle-orm';

const showcaseItems = [
  {
    id: 'photogpt-case-portrait',
    title: 'Portrait Style Gallery',
    image: 'https://cdn.nano-banana-2-ai.com/uploads/showcases/photogpt-case-portrait.webp',
    tags: 'portrait,photography,showcase,photogpt-import',
    description:
      'Portrait showcase gallery featuring expressive faces, soft lighting, and clean composition.',
  },
  {
    id: 'photogpt-case-headshot',
    title: 'Professional Headshot Gallery',
    image: 'https://cdn.nano-banana-2-ai.com/uploads/showcases/photogpt-case-headshot.webp',
    tags: 'headshot,portrait,business,showcase,photogpt-import',
    description:
      'Headshot showcase grid with studio-style portraits, realistic skin tones, and professional styling.',
  },
  {
    id: 'photogpt-case-lifestyle',
    title: 'Lifestyle Photo Gallery',
    image: 'https://cdn.nano-banana-2-ai.com/uploads/showcases/photogpt-case-lifestyle.webp',
    tags: 'lifestyle,photo,showcase,photogpt-import',
    description:
      'Lifestyle showcase collection focused on everyday moments, mood, movement, and natural environments.',
  },
  {
    id: 'photogpt-case-product',
    title: 'Product Photo Gallery',
    image: 'https://cdn.nano-banana-2-ai.com/uploads/showcases/photogpt-case-product.webp',
    tags: 'product,ecommerce,marketing,showcase,photogpt-import',
    description:
      'Product showcase panel with polished item photography for catalog, ad, and storefront use.',
  },
  {
    id: 'photogpt-case-e-commerce',
    title: 'E-commerce Visual Gallery',
    image: 'https://cdn.nano-banana-2-ai.com/uploads/showcases/photogpt-case-e-commerce.webp',
    tags: 'ecommerce,product,retail,showcase,photogpt-import',
    description:
      'E-commerce showcase grid designed for listing visuals, product storytelling, and conversion-focused creatives.',
  },
];

async function importPhotogptShowcases() {
  const users = await db()
    .select({
      id: user.id,
      email: user.email,
    })
    .from(user)
    .orderBy(asc(user.createdAt))
    .limit(1);

  if (users.length === 0) {
    throw new Error('No users found in database. Create a user before importing showcases.');
  }

  const owner = users[0];
  console.log(`Using showcase owner: ${owner.email} (${owner.id})`);

  for (const item of showcaseItems) {
    await db()
      .insert(showcase)
      .values({
        ...item,
        userId: owner.id,
        prompt: null,
      })
      .onConflictDoNothing();

    console.log(`Processed showcase: ${item.id}`);
  }

  console.log(`Imported ${showcaseItems.length} showcase entries.`);
}

importPhotogptShowcases().catch((error) => {
  console.error('Failed to import PhotoGPT showcases:', error);
  process.exit(1);
});
