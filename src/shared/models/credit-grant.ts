import { grantCreditsForUser } from './credit';
import type { User } from './user';

export async function grantCreditsForNewUser(
  user: User,
  configs?: Record<string, string>
) {
  if (!configs) {
    const { getAllConfigsUncached } = await import('./config');
    configs = await getAllConfigsUncached();
  }

  if (configs.initial_credits_enabled === 'false') {
    return;
  }

  const credits = parseInt(configs.initial_credits_amount as string) || 60;
  if (credits <= 0) {
    return;
  }

  const creditsValidDays =
    parseInt(configs.initial_credits_valid_days as string) || 0;

  const description = configs.initial_credits_description || 'initial credits';

  return grantCreditsForUser({
    user,
    credits,
    validDays: creditsValidDays,
    description,
  });
}
