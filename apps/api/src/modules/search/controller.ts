import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { RideSearchQuerySchema } from '@campusride/shared';
import { db } from '../../db/client.js';
import { users } from '../../db/schema.js';
import { searchService, type SearchCallerContext } from './service.js';

export class SearchController {
  async searchRides(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = RideSearchQuerySchema.parse(req.query);

      const caller: SearchCallerContext = {};
      if (req.user) {
        caller.userId = req.user.userId;
        caller.tier = req.user.tier;

        const [dbUser] = await db
          .select({
            gender: users.gender,
            genderVerifiedAt: users.genderVerifiedAt,
            collegeVerifiedAt: users.collegeVerifiedAt,
          })
          .from(users)
          .where(eq(users.id, req.user.userId))
          .limit(1);

        if (dbUser) {
          caller.gender = dbUser.gender;
          caller.genderVerifiedAt = dbUser.genderVerifiedAt;
          caller.collegeVerifiedAt = dbUser.collegeVerifiedAt;
        }
      }

      const results = await searchService.searchRides(caller, parsed);
      res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  }
}

export const searchController = new SearchController();
