/**
 * Dry-run abandoned checkout scanner.
 *
 * Usage:
 *   pnpm payments:abandoned
 *   pnpm payments:abandoned -- --minutes=30 --limit=100
 *   pnpm payments:abandoned -- --provider=all
 */
import { getOrders, getOrdersCount, OrderStatus } from '@/shared/models/order';

function getArg(name: string) {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : '';
}

function getPositiveNumberArg(name: string, fallback: number) {
  const rawValue = Number(getArg(name));
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : fallback;
}

function formatAmount(amount?: number | null, currency?: string | null) {
  if (typeof amount !== 'number') {
    return '-';
  }

  return `${(amount / 100).toFixed(2)} ${(currency || '').toUpperCase()}`.trim();
}

function formatDate(value?: Date | string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '-';
}

async function main() {
  const minutes = getPositiveNumberArg('minutes', 15);
  const limit = getPositiveNumberArg('limit', 50);
  const providerArg = getArg('provider') || 'stripe';
  const paymentProvider =
    providerArg.toLowerCase() === 'all' ? undefined : providerArg;
  const createdBefore = new Date(Date.now() - minutes * 60 * 1000);

  const [total, orders] = await Promise.all([
    getOrdersCount({
      status: OrderStatus.CREATED,
      paymentProvider,
      createdBefore,
    }),
    getOrders({
      status: OrderStatus.CREATED,
      paymentProvider,
      createdBefore,
      getUser: true,
      limit,
    }),
  ]);

  console.log('Potential abandoned checkout dry run');
  console.log(`Provider: ${paymentProvider || 'all'}`);
  console.log(`Older than: ${minutes} minutes`);
  console.log(`Created before: ${createdBefore.toISOString()}`);
  console.log(`Total matching orders: ${total}`);
  console.log(`Showing: ${orders.length}`);
  console.log('');

  if (orders.length === 0) {
    console.log('No abandoned checkout orders found.');
    return;
  }

  for (const order of orders) {
    console.log(
      [
        `order=${order.orderNo}`,
        `email=${order.user?.email || order.userEmail || '-'}`,
        `product=${order.productName || order.productId || '-'}`,
        `amount=${formatAmount(order.amount, order.currency)}`,
        `provider=${order.paymentProvider}`,
        `createdAt=${formatDate(order.createdAt)}`,
        `checkoutUrl=${order.checkoutUrl || '-'}`,
      ].join(' | ')
    );
  }
}

main().catch((error) => {
  console.error('scan abandoned checkouts failed:', error);
  process.exit(1);
});
