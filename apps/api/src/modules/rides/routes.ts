import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { ridesController } from './controller.js';
import { requireAuth, requireTier } from '../../middleware/auth.js';
import { idempotency } from '../../middleware/idempotency.js';

export const ridesRouter: ExpressRouter = Router();

ridesRouter.post('/estimate', (req, res, next) => {
  void ridesController.estimateRide(req, res, next);
});

ridesRouter.post(
  '/',
  requireAuth,
  requireTier(3),
  idempotency({ required: true }),
  (req, res, next) => {
    void ridesController.createRide(req, res, next);
  },
);

ridesRouter.get('/mine', requireAuth, (req, res, next) => {
  void ridesController.listMyRides(req, res, next);
});

ridesRouter.get('/:id', (req, res, next) => {
  void ridesController.getRide(req, res, next);
});

ridesRouter.patch('/:id', requireAuth, (req, res, next) => {
  void ridesController.updateRide(req, res, next);
});

ridesRouter.post('/:id/cancel', requireAuth, (req, res, next) => {
  void ridesController.cancelRide(req, res, next);
});

ridesRouter.post('/:id/start', requireAuth, (req, res, next) => {
  void ridesController.startRide(req, res, next);
});

ridesRouter.post('/:id/complete', requireAuth, (req, res, next) => {
  void ridesController.completeRide(req, res, next);
});
