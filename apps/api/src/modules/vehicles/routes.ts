import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { vehiclesController } from './controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const vehiclesRouter: ExpressRouter = Router();

vehiclesRouter.use(requireAuth);

vehiclesRouter.get('/', (req, res, next) => {
  void vehiclesController.listVehicles(req, res, next);
});

vehiclesRouter.post('/', (req, res, next) => {
  void vehiclesController.createVehicle(req, res, next);
});

vehiclesRouter.get('/:id', (req, res, next) => {
  void vehiclesController.getVehicle(req, res, next);
});

vehiclesRouter.patch('/:id', (req, res, next) => {
  void vehiclesController.updateVehicle(req, res, next);
});

vehiclesRouter.delete('/:id', (req, res, next) => {
  void vehiclesController.deleteVehicle(req, res, next);
});
