/**
 * Script to grant a manual membership subscription to a user by email.
 * Usage: pnpm tsx scripts/grant-membership.ts <email> [days] [planName] [amountCents]
 */

import { createSubscription, getCurrentSubscription, SubscriptionStatus } from '@/shared/models/subscription';
import { getUsers } from '@/shared/models/user';
import { getSnowId, getUuid } from '@/shared/lib/hash';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error(
      'Usage: pnpm tsx scripts/grant-membership.ts <email> [days] [planName] [amountCents]'
    );
    console.error(
      'Example: pnpm tsx scripts/grant-membership.ts user@example.com 30 "Starter" 2490'
    );
    process.exit(1);
  }

  const email = String(args[0] || '')
    .trim()
    .toLowerCase();
  const days = args[1] ? parseInt(args[1], 10) : 30;
  const planName = args[2] || 'Starter';
  const amount = args[3] ? parseInt(args[3], 10) : 2490;

  if (!email) {
    console.error('Error: email is required');
    process.exit(1);
  }

  if (!Number.isFinite(days) || days <= 0) {
    console.error('Error: days must be a positive integer');
    process.exit(1);
  }

  if (!Number.isFinite(amount) || amount < 0) {
    console.error('Error: amountCents must be a non-negative integer');
    process.exit(1);
  }

  console.log(`Looking for user with email: ${email}...`);
  const users = await getUsers({ email, limit: 1 });

  if (!users.length) {
    console.error(`Error: user with email ${email} not found`);
    process.exit(1);
  }

  const user = users[0];
  const currentSubscription = await getCurrentSubscription(user.id);
  if (currentSubscription) {
    console.error(
      `Error: user already has an active membership (${currentSubscription.subscriptionNo}, status=${currentSubscription.status})`
    );
    process.exit(1);
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const subscriptionNo = getSnowId();
  const manualSubscriptionId = `manual_${subscriptionNo}`;
  const productId = `manual-${planName.toLowerCase().replace(/\s+/g, '-')}-membership`;

  const result = await createSubscription({
    id: getUuid(),
    subscriptionNo,
    userId: user.id,
    userEmail: user.email,
    status: SubscriptionStatus.ACTIVE,
    paymentProvider: 'manual',
    subscriptionId: manualSubscriptionId,
    subscriptionResult: JSON.stringify({
      source: 'manual-grant-script',
      grantedAt: now.toISOString(),
      grantedDays: days,
      planName,
    }),
    productId,
    description: `Manual membership grant (${planName})`,
    amount,
    currency: 'usd',
    interval: 'month',
    intervalCount: 1,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    planName,
    productName: `${planName} Manual Membership`,
    creditsAmount: null,
    creditsValidDays: null,
    paymentProductId: null,
    paymentUserId: null,
    billingUrl: '',
    canceledAt: null,
    canceledEndAt: null,
    canceledReason: '',
    canceledReasonType: '',
  });

  console.log('✅ Membership granted successfully!');
  console.log(`User: ${user.email}`);
  console.log(`Subscription No: ${result?.subscriptionNo}`);
  console.log(`Plan Name: ${result?.planName}`);
  console.log(`Status: ${result?.status}`);
  console.log(`Current Period: ${now.toISOString()} -> ${periodEnd.toISOString()}`);

  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
