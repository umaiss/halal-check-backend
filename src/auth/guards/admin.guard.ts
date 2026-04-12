import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '../enums/admin-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Must be an authenticated admin-panel user
    if (!user || !user.role) return false;

    // Ensure role is a valid admin role (admin or assignee)
    const validRoles: string[] = [AdminRole.ADMIN, AdminRole.ASSIGNEE];
    if (!validRoles.includes(user.role)) return false;

    // Check if the route requires specific roles via @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no @Roles() decorator is set, allow any valid admin-panel user
    if (!requiredRoles || requiredRoles.length === 0) return true;

    // Otherwise check if the user's role is in the allowed list
    return requiredRoles.includes(user.role as AdminRole);
  }
}
