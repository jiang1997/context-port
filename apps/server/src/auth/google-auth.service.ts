import { Inject, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import { users, type Database } from '@contextport/db';
import { DATABASE } from '../db/db.module.js';
import { getEnvironment } from '../config/environment.js';
import { GOOGLE_JWKS, GOOGLE_ISSUERS, GOOGLE_TOKEN_ENDPOINT } from './auth.constants.js';

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string | undefined;
  picture?: string | undefined;
}

const JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS));

@Injectable()
export class GoogleAuthService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * Verifies a Google ID Token (signature, aud, iss, exp) via JWKS and
   * upserts the local account by Google `sub`. Returns the internal user.
   */
  async authenticateWithCode(code: string, redirectUri: string): Promise<{ id: string; email: string; name: string | null; avatarUrl: string | null }> {
    const environment = getEnvironment();
    if (!environment.GOOGLE_CLIENT_ID || !environment.GOOGLE_CLIENT_SECRET) {
      throw new InternalServerErrorException('Google login is not configured.');
    }

    const identity = await this.exchangeAndVerify(code, redirectUri, environment.GOOGLE_CLIENT_ID, environment.GOOGLE_CLIENT_SECRET);
    return this.upsertUser(identity);
  }

  private async exchangeAndVerify(
    code: string,
    redirectUri: string,
    clientId: string,
    clientSecret: string,
  ): Promise<GoogleIdentity> {
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!response.ok) {
      // Do not log the code or tokens; a generic message is enough for audits.
      throw new UnauthorizedException({ code: 'GOOGLE_TOKEN_EXCHANGE_FAILED', message: 'Google token exchange failed.' });
    }
    const payload = (await response.json()) as { id_token?: unknown };
    if (typeof payload.id_token !== 'string' || payload.id_token.length === 0) {
      throw new UnauthorizedException({ code: 'GOOGLE_ID_TOKEN_MISSING', message: 'Google ID Token missing.' });
    }
    return this.verifyIdToken(payload.id_token, clientId);
  }

  private async verifyIdToken(idToken: string, clientId: string): Promise<GoogleIdentity> {
    let claims: Record<string, unknown>;
    try {
      const { payload } = await jwtVerify(idToken, JWKS, {
        issuer: GOOGLE_ISSUERS,
        audience: clientId,
        clockTolerance: 60,
        requiredClaims: ['exp', 'iat', 'sub'],
      });
      claims = payload as Record<string, string | boolean>;
    } catch {
      throw new UnauthorizedException({ code: 'GOOGLE_ID_TOKEN_INVALID', message: 'Google ID Token verification failed.' });
    }
    const sub = claims.sub;
    const email = claims.email;
    if (typeof sub !== 'string' || !sub || typeof email !== 'string' || !email) {
      throw new UnauthorizedException({ code: 'GOOGLE_ID_TOKEN_INCOMPLETE', message: 'Google ID Token lacks required claims.' });
    }
    if (claims.azp !== undefined && claims.azp !== clientId) {
      throw new UnauthorizedException({ code: 'GOOGLE_ID_TOKEN_INVALID', message: 'Google ID Token authorized party does not match.' });
    }
    if (claims.email_verified !== true) {
      throw new UnauthorizedException({ code: 'GOOGLE_EMAIL_NOT_VERIFIED', message: 'Google email is not verified.' });
    }
    return {
      sub,
      email,
      emailVerified: true,
      name: typeof claims.name === 'string' ? claims.name : undefined,
      picture: typeof claims.picture === 'string' ? claims.picture : undefined,
    };
  }

  /** First login creates the account idempotently by `sub`; later logins refresh display fields. */
  private async upsertUser(identity: GoogleIdentity) {
    const [user] = await this.db.select().from(users).where(eq(users.googleSub, identity.sub));
    const displayName = identity.name ?? identity.email;
    if (user) {
      const [updated] = await this.db.update(users).set({
        email: identity.email,
        name: displayName,
        avatarUrl: identity.picture ?? null,
        lastLoginAt: new Date().toISOString(),
      }).where(eq(users.id, user.id)).returning();
      if (!updated) throw new InternalServerErrorException('Account update failed.');
      return updated;
    }
    const [created] = await this.db.insert(users).values({
      googleSub: identity.sub,
      email: identity.email,
      name: displayName,
      avatarUrl: identity.picture ?? null,
      lastLoginAt: new Date().toISOString(),
    })
      // Handle first-login races (double submit) gracefully by re-reading.
      .onConflictDoUpdate({
        target: users.googleSub,
        set: { email: identity.email, name: displayName, avatarUrl: identity.picture ?? null, lastLoginAt: new Date().toISOString() },
      })
      .returning();
    if (!created) throw new InternalServerErrorException('Account creation failed.');
    return created;
  }
}
