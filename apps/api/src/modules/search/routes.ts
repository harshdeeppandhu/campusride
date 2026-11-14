import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { searchController } from './controller.js';
import { optionalAuth } from '../../middleware/auth.js';

export const searchRouter: ExpressRouter = Router();

searchRouter.get('/rides', optionalAuth, (req, res, next) => {
  void searchController.searchRides(req, res, next);
});
