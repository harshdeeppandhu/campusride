import { sql, and, eq, gte, lte, or, notInArray } from 'drizzle-orm';
import type {
  RideSearchQuery,
  RideSearchResponse,
  SearchResultItem,
} from '@campusride/shared';
import { db } from '../../db/client.js';
import {
  rides,
  vehicles,
  users,
  blocks,
  searchEvents,
} from '../../db/schema.js';
import { calculateHaversineDistanceM } from '../../integrations/maps/console.js';

export interface SearchCallerContext {
  userId?: string;
  tier?: number;
  gender?: string;
  genderVerifiedAt?: Date | null;
  collegeVerifiedAt?: Date | null;
}

export class SearchService {
  async searchRides(
    caller: SearchCallerContext,
    query: RideSearchQuery,
  ): Promise<RideSearchResponse> {
    const now = new Date();

    // 1. Determine caller eligibility flags
    const isCallerVerifiedFemale =
      Boolean(caller.userId) &&
      caller.gender === 'female' &&
      caller.genderVerifiedAt !== null &&
      caller.genderVerifiedAt !== undefined;

    const isCallerCampusVerified =
      Boolean(caller.userId) &&
      caller.collegeVerifiedAt !== null &&
      caller.collegeVerifiedAt !== undefined;

    // 2. Fetch blocked driver IDs if caller is authenticated
    const blockedDriverIds: string[] = [];
    if (caller.userId) {
      const blockRows = await db
        .select({
          blockerId: blocks.blockerId,
          blockedId: blocks.blockedId,
        })
        .from(blocks)
        .where(
          or(
            eq(blocks.blockerId, caller.userId),
            eq(blocks.blockedId, caller.userId),
          ),
        );

      for (const b of blockRows) {
        if (b.blockerId === caller.userId) {
          blockedDriverIds.push(b.blockedId);
        } else {
          blockedDriverIds.push(b.blockerId);
        }
      }
    }

    // 3. Build query conditions
    const conditions = [
      eq(rides.status, 'scheduled'),
      gte(rides.departsAt, now),
      gte(rides.seatsAvailable, query.seats ?? 1),
    ];

    // Self-exclusion: driver cannot see own rides in search
    if (caller.userId) {
      conditions.push(sql`${rides.driverId} != ${caller.userId}`);
    }

    // Block filter
    if (blockedDriverIds.length > 0) {
      conditions.push(notInArray(rides.driverId, blockedDriverIds));
    }

    // Women-only rule: exclude women-only rides unless caller is verified female
    if (!isCallerVerifiedFemale) {
      conditions.push(eq(rides.genderScope, 'any'));
    } else if (query.womenOnly) {
      conditions.push(eq(rides.genderScope, 'women_only'));
    }

    // Campus-only rule: exclude campus-only rides unless caller is campus verified
    if (!isCallerCampusVerified) {
      conditions.push(eq(rides.audienceScope, 'campus_and_community'));
    }

    // Vehicle Type filter
    if (query.vehicleType) {
      conditions.push(eq(vehicles.type, query.vehicleType));
    }

    // Journey Type filter
    if (query.journeyType) {
      conditions.push(eq(rides.journeyType, query.journeyType));
    }

    // Date filter
    if (query.date) {
      const dateStart = new Date(`${query.date}T00:00:00.000Z`);
      const dateEnd = new Date(`${query.date}T23:59:59.999Z`);
      conditions.push(gte(rides.departsAt, dateStart));
      conditions.push(lte(rides.departsAt, dateEnd));
    }

    // Destination filter (Place ID)
    if (query.destPlaceId) {
      conditions.push(eq(rides.destPlaceId, query.destPlaceId));
    }

    // Proximity search on origin using PostGIS ST_DWithin
    // ST_DWithin(geom, point, distance_in_metres) on geography
    const originPoint = sql`ST_SetSRID(ST_MakePoint(${query.originLng}, ${query.originLat}), 4326)::geography`;
    conditions.push(
      sql`ST_DWithin(${rides.originLocation}, ${originPoint}, ${query.radiusM})`,
    );

    // Optional destination proximity search
    if (query.destLat !== undefined && query.destLng !== undefined) {
      const destPoint = sql`ST_SetSRID(ST_MakePoint(${query.destLng}, ${query.destLat}), 4326)::geography`;
      conditions.push(
        sql`ST_DWithin(${rides.destLocation}, ${destPoint}, ${query.radiusM})`,
      );
    }

    // Fetch rides joined with driver and vehicle
    const rows = await db
      .select({
        id: rides.id,
        driverId: rides.driverId,
        driverFullName: users.fullName,
        driverPhotoKey: users.photoKey,
        driverCollegeVerifiedAt: users.collegeVerifiedAt,
        driverGender: users.gender,
        driverGenderVerifiedAt: users.genderVerifiedAt,
        originLabel: rides.originLabel,
        originLocation: rides.originLocation,
        destLabel: rides.destLabel,
        destLocation: rides.destLocation,
        departsAt: rides.departsAt,
        seatsAvailable: rides.seatsAvailable,
        contributionPaise: rides.contributionPaise,
        journeyType: rides.journeyType,
        genderScope: rides.genderScope,
        vehicleType: vehicles.type,
        vehicleMakeModel: vehicles.makeModel,
      })
      .from(rides)
      .innerJoin(users, eq(rides.driverId, users.id))
      .innerJoin(vehicles, eq(rides.vehicleId, vehicles.id))
      .where(and(...conditions))
      .orderBy(rides.departsAt)
      .limit((query.limit ?? 20) + 1);

    const hasMore = rows.length > (query.limit ?? 20);
    const resultRows = hasMore ? rows.slice(0, query.limit ?? 20) : rows;

    const items: SearchResultItem[] = resultRows.map((r) => {
      const pickupCoords = {
        lat: r.originLocation.lat,
        lng: r.originLocation.lng,
      };
      const distanceToPickupM = calculateHaversineDistanceM(
        { lat: query.originLat, lng: query.originLng },
        pickupCoords,
      );

      const badges: string[] = [];
      if (r.driverCollegeVerifiedAt) {
        badges.push('campus_verified');
      }
      if (r.driverGender === 'female' && r.driverGenderVerifiedAt) {
        badges.push('women_verified');
      }
      badges.push('driver_verified');

      // T0 unverified / anonymous privacy masking:
      // Area-level labels only, no driver photo, first name only
      const driverFirstName = r.driverFullName
        ? r.driverFullName.split(' ')[0] || null
        : null;

      const isExact = distanceToPickupM <= 1500;

      return {
        rideId: r.id,
        driver: {
          id: r.driverId,
          firstName: driverFirstName,
          photoKey: caller.tier && caller.tier >= 1 ? r.driverPhotoKey : null,
          badges,
          rating: 4.9,
          ridesCount: 12,
        },
        origin: {
          areaLabel: r.originLabel.split(',')[0] || r.originLabel,
          lat: caller.tier && caller.tier >= 1 ? pickupCoords.lat : undefined,
          lng: caller.tier && caller.tier >= 1 ? pickupCoords.lng : undefined,
        },
        destination: {
          areaLabel: r.destLabel.split(',')[0] || r.destLabel,
          lat: caller.tier && caller.tier >= 1 ? r.destLocation.lat : undefined,
          lng: caller.tier && caller.tier >= 1 ? r.destLocation.lng : undefined,
        },
        departsAt: r.departsAt.toISOString(),
        seatsAvailable: r.seatsAvailable,
        contributionPaise: r.contributionPaise,
        vehicle: {
          type: r.vehicleType,
          makeModel: r.vehicleMakeModel,
        },
        journeyType: r.journeyType,
        womenOnly: r.genderScope === 'women_only',
        distanceToPickupM,
        match: isExact ? 'exact' : 'nearby',
      };
    });

    // 4. Privacy demand logging to search_events (zero user_id per docs/03 §search_events)
    try {
      const dateBucket = now.toISOString().split('T')[0]!;
      const hourBucket = now.getUTCHours();

      await db.insert(searchEvents).values({
        destPlaceId: query.destPlaceId || null,
        dateBucket,
        hourBucket,
        resultsCount: items.length,
      });
    } catch {
      // Non-blocking telemetry
    }

    const nextCursor = hasMore && resultRows.length > 0
      ? resultRows[resultRows.length - 1]!.id
      : null;

    return {
      items,
      nextCursor,
    };
  }
}

export const searchService = new SearchService();
