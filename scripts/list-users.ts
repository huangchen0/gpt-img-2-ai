import { db } from '@/core/db';
import { user } from '@/config/db/schema';

async function listUsers() {
  try {
    const users = await db().select().from(user).limit(10);
    console.log(`Found ${users.length} users:`);
    users.forEach((u: typeof user.$inferSelect) => {
      console.log(`  - ID: ${u.id}, Email: ${u.email || '(no email)'}, Name: ${u.name || '(no name)'}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error listing users:', error);
    process.exit(1);
  }
}

listUsers();
