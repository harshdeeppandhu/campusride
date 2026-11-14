import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { placesController } from './controller.js';

export const placesRouter: ExpressRouter = Router();

placesRouter.get('/hubs', (req, res, next) => {
  void placesController.listHubs(req, res, next);
});

placesRouter.get('/autocomplete', (req, res, next) => {
  void placesController.autocomplete(req, res, next);
});

placesRouter.get('/:placeId/resolve', (req, res, next) => {
  void placesController.resolvePlace(req, res, next);
});
