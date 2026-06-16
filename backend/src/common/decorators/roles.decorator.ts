import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type UserRole = 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'MANAGER' | 'RECOVERY_AGENT';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
