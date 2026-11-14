import { randomUUID } from 'node:crypto';
import { eq, and, desc, isNull, gt } from 'drizzle-orm';
import type { AuthTokens, SessionItem, UserRole, UserStatus } from '@campusride/shared';
import { db } from '../../db/client.js';
import { authOtpChallenges, authSessions, users, consents } from '../../db/schema.js';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { getEmailProvider } from '../../integrations/email/index.js';
import { auditService } from '../audit/service.js';
import { computeTrustProfile } from '../me/trust.js';
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  generateRefreshToken,
  hashToken,
  hashIp,
  signAccessToken,
} from './tokens.js';

export interface OtpVerifyResult {
  tokens: AuthTokens;
  user: {
    id: string;
    email: string;
    role: UserRole;
    status: UserStatus;
  };
  sessionId: string;
  isNewUser: boolean;
}

export class AuthService {
  /**
   * Generates a 6-digit OTP, stores HMAC hash, and sends an email.
   * Always returns a generic message to prevent email enumeration.
   */
  async requestOtp(
    email: string,
    ipAddress = '127.0.0.1',
    _requestId = 'unknown',
  ): Promise<{ message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const otp = generateOtp();
    const codeHmac = hashOtp(otp, env.OTP_HMAC_PEPPER);
    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store challenge
    await db.insert(authOtpChallenges).values({
      email: normalizedEmail,
      codeHmac,
      expiresAt,
      attempts: 0,
      ipHash: ipHashed,
    });

    // Send OTP via configured email adapter
    const emailProvider = getEmailProvider();
    await emailProvider.sendOtp({
      to: normalizedEmail,
      otp,
      expiryMinutes: 10,
      ipAddress,
    });

    return {
      message: 'If the email is eligible, a 6-digit code has been sent.',
    };
  }

  /**
   * Verifies the 6-digit OTP against stored HMAC challenge.
   * Enforces 10-minute expiry, max 5 attempts, and single-use consumption.
   */
  async verifyOtp(
    email: string,
    code: string,
    userAgent = 'unknown',
    ipAddress = '127.0.0.1',
    requestId = 'unknown',
  ): Promise<OtpVerifyResult> {
    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();
    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);

    // Look for latest active, non-expired challenge
    const [challenge] = await db
      .select()
      .from(authOtpChallenges)
      .where(
        and(
          eq(authOtpChallenges.email, normalizedEmail),
          isNull(authOtpChallenges.consumedAt),
          gt(authOtpChallenges.expiresAt, now),
        ),
      )
      .orderBy(desc(authOtpChallenges.createdAt))
      .limit(1);

    if (!challenge) {
      throw new AppError('VALIDATION_ERROR', 400, 'Invalid or expired verification code.');
    }

    if (challenge.attempts >= 5) {
      throw new AppError(
        'RATE_LIMITED',
        429,
        'Too many failed attempts. Please request a new verification code.',
      );
    }

    const isValid = verifyOtpHash(code, challenge.codeHmac, env.OTP_HMAC_PEPPER);
    if (!isValid) {
      // Increment attempt counter
      await db
        .update(authOtpChallenges)
        .set({ attempts: challenge.attempts + 1 })
        .where(eq(authOtpChallenges.id, challenge.id));

      throw new AppError('VALIDATION_ERROR', 400, 'Invalid or expired verification code.');
    }

    // Immediately mark challenge consumed to prevent reuse
    await db
      .update(authOtpChallenges)
      .set({ consumedAt: now })
      .where(eq(authOtpChallenges.id, challenge.id));

    // Find or create user
    let [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    let isNewUser = false;

    if (user) {
      if (user.status === 'suspended' || user.status === 'deleted') {
        throw new AppError('FORBIDDEN', 403, 'Your account has been suspended or deactivated.');
      }
      await db
        .update(users)
        .set({
          emailVerifiedAt: user.emailVerifiedAt || now,
          lastActiveAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));
    } else {
      isNewUser = true;
      const isCampusDomain =
        normalizedEmail.endsWith('.edu') ||
        normalizedEmail.endsWith('.ac.in') ||
        normalizedEmail.includes('.edu.') ||
        normalizedEmail.includes('.ac.');

      const [newUser] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          emailVerifiedAt: now,
          fullName: normalizedEmail.split('@')[0] || 'Campus Rider',
          memberType: isCampusDomain ? 'student' : 'community',
          role: 'member',
          status: 'active',
          gender: 'undisclosed',
          adultConfirmedAt: now,
          privacy: {},
          locale: 'en',
          lastActiveAt: now,
        })
        .returning();

      if (!newUser) {
        throw new AppError('INTERNAL', 500, 'Failed to create user account.');
      }
      user = newUser;
    }

    // Create session with new family
    const familyId = randomUUID();
    const refreshToken = generateRefreshToken();
    const refreshHash = hashToken(refreshToken);
    const refreshExpiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRY_SECONDS * 1000);

    const [session] = await db
      .insert(authSessions)
      .values({
        userId: user.id,
        familyId,
        refreshHash,
        userAgent,
        ipHash: ipHashed,
        expiresAt: refreshExpiresAt,
      })
      .returning();

    if (!session) {
      throw new AppError('INTERNAL', 500, 'Failed to establish user session.');
    }

    // Check user consents for trust tier computation
    const userConsents = await db
      .select()
      .from(consents)
      .where(and(eq(consents.userId, user.id), isNull(consents.revokedAt)));

    const hasTosConsent = userConsents.some((c) => c.kind === 'tos');

    const trustProfile = computeTrustProfile({
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      adultConfirmedAt: user.adultConfirmedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      collegeVerifiedAt: user.collegeVerifiedAt,
      gender: user.gender,
      genderVerifiedAt: user.genderVerifiedAt,
      hasTosConsent,
    });

    const accessToken = signAccessToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        tier: trustProfile.tier,
        sessionId: session.id,
      },
      env.JWT_SECRET,
      env.JWT_ACCESS_EXPIRY_SECONDS,
    );

    await auditService.log({
      actorId: user.id,
      action: isNewUser ? 'auth.signup' : 'auth.login',
      entity: 'users',
      entityId: user.id,
      after: { email: user.email, sessionId: session.id },
      ipHash: ipHashed,
      requestId,
    });

    return {
      tokens: {
        accessToken,
        expiresIn: env.JWT_ACCESS_EXPIRY_SECONDS,
        tokenType: 'Bearer',
        refreshToken,
      },
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      sessionId: session.id,
      isNewUser,
    };
  }

  /**
   * Rotates the refresh token and issues a new access JWT.
   * If an already-revoked refresh token is presented, detects token theft
   * and immediately revokes the ENTIRE token family.
   */
  async refreshSession(
    refreshToken: string,
    userAgent = 'unknown',
    ipAddress = '127.0.0.1',
    requestId = 'unknown',
  ): Promise<AuthTokens> {
    const refreshHash = hashToken(refreshToken);
    const now = new Date();
    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);

    const [session] = await db
      .select()
      .from(authSessions)
      .where(eq(authSessions.refreshHash, refreshHash))
      .limit(1);

    if (!session) {
      throw new AppError('UNAUTHENTICATED', 401, 'Invalid session token.');
    }

    // ── Reuse Detection (Token Theft) ─────────────────────────────────────────
    if (session.revokedAt !== null) {
      logger.warn(
        {
          sessionId: session.id,
          familyId: session.familyId,
          userId: session.userId,
        },
        'SECURITY ALERT: Refresh token reuse detected! Revoking entire session family.',
      );

      // Revoke all sessions belonging to this family
      await db
        .update(authSessions)
        .set({ revokedAt: now })
        .where(
          and(
            eq(authSessions.familyId, session.familyId),
            isNull(authSessions.revokedAt),
          ),
        );

      await auditService.log({
        actorId: session.userId,
        action: 'auth.token_theft_detected',
        entity: 'auth_sessions',
        entityId: session.id,
        after: { familyId: session.familyId, action: 'revoked_family' },
        ipHash: ipHashed,
        requestId,
      });

      throw new AppError(
        'UNAUTHENTICATED',
        401,
        'Invalid session. Token reuse detected. Please sign in again.',
      );
    }

    if (session.expiresAt < now) {
      throw new AppError('UNAUTHENTICATED', 401, 'Session has expired. Please sign in again.');
    }

    // Verify user is active
    const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (!user || user.status !== 'active') {
      await db.update(authSessions).set({ revokedAt: now }).where(eq(authSessions.id, session.id));
      throw new AppError('FORBIDDEN', 403, 'Account is no longer active.');
    }

    // Issue new rotating refresh token
    const newRefreshToken = generateRefreshToken();
    const newRefreshHash = hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRY_SECONDS * 1000);

    const [newSession] = await db
      .insert(authSessions)
      .values({
        userId: user.id,
        familyId: session.familyId, // same token family
        refreshHash: newRefreshHash,
        userAgent: userAgent || session.userAgent,
        ipHash: ipHashed,
        expiresAt: newExpiresAt,
      })
      .returning();

    if (!newSession) {
      throw new AppError('INTERNAL', 500, 'Failed to rotate session.');
    }

    // Revoke old session and link to new one
    await db
      .update(authSessions)
      .set({
        revokedAt: now,
        replacedBy: newSession.id,
      })
      .where(eq(authSessions.id, session.id));

    // Consents & Trust Tier
    const userConsents = await db
      .select()
      .from(consents)
      .where(and(eq(consents.userId, user.id), isNull(consents.revokedAt)));

    const hasTosConsent = userConsents.some((c) => c.kind === 'tos');
    const trustProfile = computeTrustProfile({
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      adultConfirmedAt: user.adultConfirmedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      collegeVerifiedAt: user.collegeVerifiedAt,
      gender: user.gender,
      genderVerifiedAt: user.genderVerifiedAt,
      hasTosConsent,
    });

    const accessToken = signAccessToken(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        tier: trustProfile.tier,
        sessionId: newSession.id,
      },
      env.JWT_SECRET,
      env.JWT_ACCESS_EXPIRY_SECONDS,
    );

    return {
      accessToken,
      expiresIn: env.JWT_ACCESS_EXPIRY_SECONDS,
      tokenType: 'Bearer',
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logs out a session by revoking it.
   */
  async logout(
    sessionId: string,
    userId?: string,
    ipAddress = '127.0.0.1',
    requestId = 'unknown',
  ): Promise<void> {
    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    await db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.id, sessionId));

    if (userId) {
      await auditService.log({
        actorId: userId,
        action: 'auth.logout',
        entity: 'auth_sessions',
        entityId: sessionId,
        ipHash: ipHashed,
        requestId,
      });
    }
  }

  /**
   * Lists all active sessions for the user.
   */
  async listSessions(userId: string, currentSessionId?: string): Promise<SessionItem[]> {
    const now = new Date();
    const rows = await db
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.userId, userId),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, now),
        ),
      )
      .orderBy(desc(authSessions.createdAt));

    return rows.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipHash: s.ipHash,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isCurrent: s.id === currentSessionId,
    }));
  }

  /**
   * Revokes a specific session belonging to the user.
   */
  async revokeSession(
    userId: string,
    sessionId: string,
    ipAddress = '127.0.0.1',
    requestId = 'unknown',
  ): Promise<void> {
    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    const result = await db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(authSessions.id, sessionId), eq(authSessions.userId, userId)))
      .returning();

    if (result.length === 0) {
      throw new AppError('NOT_FOUND', 404, 'Session not found or already revoked.');
    }

    await auditService.log({
      actorId: userId,
      action: 'auth.session_revoked',
      entity: 'auth_sessions',
      entityId: sessionId,
      ipHash: ipHashed,
      requestId,
    });
  }
}

export const authService = new AuthService();
