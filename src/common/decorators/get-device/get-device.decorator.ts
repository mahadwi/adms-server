import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { Device } from 'generated/prisma';

export const GetDevice = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.device as Device;
  },
);
