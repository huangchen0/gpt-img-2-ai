import type { User } from '@/shared/models/user';

import { assignRoleToUser, getRoleByName } from './rbac';

export async function grantRoleForNewUser(user: User) {
  try {
    const { getAllConfigs } = await import('@/shared/models/config');
    const configs = await getAllConfigs();

    if (configs.initial_role_enabled !== 'true') {
      return;
    }

    const roleName = configs.initial_role_name;
    if (!roleName) {
      return;
    }

    const role = await getRoleByName(roleName);
    if (!role) {
      return;
    }

    await assignRoleToUser(user.id, role.id, user.createdAt);
  } catch (e) {
    console.error('grant role for new user failed', e);
  }
}
