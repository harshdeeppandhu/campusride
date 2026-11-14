import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { meController } from './controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const meRouter: ExpressRouter = Router();

meRouter.use(requireAuth);

meRouter.get('/', (req, res, next) => {
  void meController.getProfile(req, res, next);
});

meRouter.patch('/', (req, res, next) => {
  void meController.updateProfile(req, res, next);
});

meRouter.post('/consents', (req, res, next) => {
  void meController.recordConsents(req, res, next);
});

meRouter.get('/trust', (req, res, next) => {
  void meController.getTrust(req, res, next);
});
