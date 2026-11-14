import type { Request, Response, NextFunction } from 'express';
import {
  AutocompleteQuerySchema,
  ResolvePlaceSchema,
} from '@campusride/shared';
import { placesService } from './service.js';

function getParamPlaceId(req: Request): string {
  const raw = req.params['placeId'];
  if (Array.isArray(raw)) {
    return raw[0] || '';
  }
  return typeof raw === 'string' ? raw : '';
}

export class PlacesController {
  async listHubs(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hubs = await placesService.listHubs();
      res.status(200).json({ hubs });
    } catch (err) {
      next(err);
    }
  }

  async autocomplete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = AutocompleteQuerySchema.parse(req.query);
      const predictions = await placesService.autocomplete(parsed.q, parsed.sessionToken);
      res.status(200).json({ predictions });
    } catch (err) {
      next(err);
    }
  }

  async resolvePlace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const placeId = getParamPlaceId(req);
      const sessionToken = typeof req.query['sessionToken'] === 'string'
        ? req.query['sessionToken']
        : undefined;

      const parsed = ResolvePlaceSchema.parse({ placeId, sessionToken });
      const place = await placesService.resolvePlace(parsed.placeId, parsed.sessionToken);
      res.status(200).json(place);
    } catch (err) {
      next(err);
    }
  }
}

export const placesController = new PlacesController();
