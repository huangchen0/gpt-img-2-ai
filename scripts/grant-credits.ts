/**
 * Script to grant credits to a user by email
 * Usage: pnpm tsx scripts/grant-credits.ts <email> <credits> [validDays] [description]
 */

import { grantCreditsForUser } from '@/shared/models/credit';
import { getUsers } from '@/shared/models/user';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: pnpm tsx scripts/grant-credits.ts <email> <credits> [validDays] [description]');
    console.error('Example: pnpm tsx scripts/grant-credits.ts user@example.com 1000 30 "Promotion credits"');
    process.exit(1);
  }

  const email = args[0];
  const credits = parseInt(args[1]);
  const validDays = args[2] ? parseInt(args[2]) : 0;
  const description = args[3] || 'Manual credit grant';

  if (!email || !credits || credits <= 0) {
    console.error('Error: Email and credits (> 0) are required');
    process.exit(1);
  }

  console.log(`Looking for user with email: ${email}...`);

  // Find user by email
  const users = await getUsers({ email, limit: 1 });

  if (!users || users.length === 0) {
    console.error(`Error: User with email ${email} not found`);
    process.exit(1);
  }

  const user = users[0];
  console.log(`Found user: ${user.name} (${user.email})`);
  console.log(`Granting ${credits} credits...`);

  // Grant credits
  const result = await grantCreditsForUser({
    user,
    credits,
    validDays: validDays > 0 ? validDays : undefined,
    description,
  });

  console.log('✅ Credits granted successfully!');
  console.log(`Transaction No: ${result?.transactionNo}`);
  console.log(`Credits: ${credits}`);
  console.log(`Valid Days: ${validDays || 'Never expires'}`);
  console.log(`Description: ${description}`);

  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
