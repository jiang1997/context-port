import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/** Reads the identity BusinessGuard resolved for the current request. */
export const RequestIdentity = createParamDecorator(
  (_: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return request.authIdentity ?? { source: 'anonymous' };
  },
);
