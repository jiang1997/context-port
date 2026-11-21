import { SetMetadata } from '@nestjs/common';

export const AUTH_POLICY = Symbol('auth-policy');
export type AuthPolicy = 'public' | 'session';

export const Public = () => SetMetadata(AUTH_POLICY, 'public' satisfies AuthPolicy);
export const SessionOnly = () => SetMetadata(AUTH_POLICY, 'session' satisfies AuthPolicy);
