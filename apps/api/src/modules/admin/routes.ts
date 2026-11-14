import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { adminController } from './controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const adminRouter: ExpressRouter = Router();

// All admin routes require authentication and the admin role
adminRouter.use(requireAuth);
adminRouter.use(requireRole('admin'));

adminRouter.get('/verification-queue', (req, res, next) => {
  void adminController.getVerificationQueue(req, res, next);
});

adminRouter.get('/verification/:id/doc-url', (req, res, next) => {
  void adminController.getDocumentDownloadUrl(req, res, next);
});

adminRouter.post('/verification/:id/decision', (req, res, next) => {
  void adminController.recordDecision(req, res, next);
});

adminRouter.post('/users/:id/set-gender-verified', (req, res, next) => {
  void adminController.setGenderVerified(req, res, next);
});

adminRouter.post('/users/:id/suspend', (req, res, next) => {
  void adminController.suspendUser(req, res, next);
});

adminRouter.post('/users/:id/restore', (req, res, next) => {
  void adminController.restoreUser(req, res, next);
});
