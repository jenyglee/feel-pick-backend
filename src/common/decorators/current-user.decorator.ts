import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import User from '../../users/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const req = ctx.switchToHttp().getRequest<Request & { user: User }>();
    return req.user;
  },
);
