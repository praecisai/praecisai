import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const BusinessId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Never let a tenant-scoped query run without a business id — Prisma
    // treats `where: { business_id: undefined }` as "no filter", which would
    // leak every tenant's data.
    if (!request.businessId) {
      throw new UnauthorizedException(
        'No business linked to this account yet. Please complete onboarding.',
      );
    }
    return request.businessId;
  },
);
