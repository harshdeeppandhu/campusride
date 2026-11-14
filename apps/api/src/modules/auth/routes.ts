import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authController } from './controller.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  otpRequestIpLimiter,
  otpVerifyLimiter,
  authRefreshLimiter,
} from '../../middleware/rateLimit.js';

export const authRouter: ExpressRouter = Router();

authRouter.post('/otp/request', otpRequestIpLimiter, (req, res, next) => {
  void authController.requestOtp(req, res, next);
});

authRouter.post('/otp/verify', otpVerifyLimiter, (req, res, next) => {
  void authController.verifyOtp(req, res, next);
});

authRouter.post('/refresh', authRefreshLimiter, (req, res, next) => {
  void authController.refresh(req, res, next);
});

authRouter.post('/logout', requireAuth, (req, res, next) => {
  void authController.logout(req, res, next);
});

authRouter.get('/sessions', requireAuth, (req, res, next) => {
  void authController.getSessions(req, res, next);
});

authRouter.delete('/sessions/:id', requireAuth, (req, res, next) => {
  void authController.revokeSession(req, res, next);
});
