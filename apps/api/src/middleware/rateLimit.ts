import { rateLimit } from 'express-rate-limit';
import type { Request, Response } from 'express';

function makeRateLimitHandler(message: string) {
  return (req: Request, res: Response) => {
    res.status(429).json({
      type: 'https://campusride.example.com/errors/rate-limited',
      title: 'RATE_LIMITED',
      status: 429,
      code: 'RATE_LIMITED',
      detail: message,
      requestId: req.requestId || 'unknown',
    });
  };
}

// ── Global IP rate limit (300 req / min) ──────────────────────────────────────
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: makeRateLimitHandler('Too many requests from this IP. Please slow down.'),
});

// ── OTP Request rate limit (10 req / hour per IP) ────────────────────────────
export const otpRequestIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: makeRateLimitHandler('Too many verification code requests from this network. Please try again later.'),
});

// ── Auth Refresh rate limit (30 req / hour per IP) ───────────────────────────
export const authRefreshLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: makeRateLimitHandler('Too many session refresh requests. Please try again later.'),
});

// ── OTP Verify rate limit (15 attempts / 10 min per IP) ─────────────────────
export const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: makeRateLimitHandler('Too many verification attempts from this network.'),
});
