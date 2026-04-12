import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../enums/admin-role.enum';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which admin roles are allowed to access a route.
 * Usage: @Roles(AdminRole.ADMIN) or @Roles(AdminRole.ADMIN, AdminRole.ASSIGNEE)
 */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
