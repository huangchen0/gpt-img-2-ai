import type { User } from './user';

import { grantCreditsForUser } from './credit';

export async function grantCreditsForNewUser(user: User) {
  const { getAllConfigs } = await import('./config');
  const configs = await getAllConfigs();

  if (configs.initial_credits_enabled !== 'true') {
    return;
  }

  const credits = parseInt(configs.initial_credits_amount as string) || 0;
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
