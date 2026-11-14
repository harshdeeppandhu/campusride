import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { verificationController } from './controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const verificationRouter: ExpressRouter = Router();

verificationRouter.use(requireAuth);

verificationRouter.post('/upload-url', (req, res, next) => {
  void verificationController.getUploadUrl(req, res, next);
});

verificationRouter.post('/requests', (req, res, next) => {
  void verificationController.createRequest(req, res, next);
});

verificationRouter.get('/requests/mine', (req, res, next) => {
  void verificationController.getMyRequests(req, res, next);
});
