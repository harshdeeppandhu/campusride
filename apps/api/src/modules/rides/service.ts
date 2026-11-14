import { eq, and, isNull, desc } from 'drizzle-orm';
import type {
  RideEstimateRequest,
  RideEstimateResponse,
  CreateRideRequest,
  UpdateRideRequest,
  RideResponse,
  JourneyType,
} from '@campusride/shared';
import {
  computeCostCap,
  computeCO2Savings,
} from '@campusride/shared';
import { db } from '../../db/client.js';
import {
  rides,
  rideStops,
  vehicles,
  users,
  bookings,
} from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { getMapsProvider } from '../../integrations/maps/index.js';
import { auditService } from '../audit/service.js';
import { hashIp } from '../auth/tokens.js';
import { env } from '../../config/env.js';

export class RidesService {
  /**
   * Pre-estimate ride distance, duration, polyline, statutory cost cap, and CO2 savings.
   */
  async estimateRide(input: RideEstimateRequest): Promise<RideEstimateResponse> {
    const maps = getMapsProvider();
    const route = await maps.getRoute(
      { lat: input.origin.lat, lng: input.origin.lng },
      { lat: input.destination.lat, lng: input.destination.lng },
    );

    const journeyType: JourneyType = route.distanceM > 40_000 ? 'outstation' : 'local';

    const costCap = computeCostCap({
      distanceM: route.distanceM,
      vehicleType: input.vehicleType,
      seatsTotal: input.seatsTotal,
      tollPaise: input.tollPaise,
    });

    const co2AvoidedKg = computeCO2Savings({
      distanceM: route.distanceM,
      passengers: input.seatsTotal,
    });

    return {
      distanceM: route.distanceM,
      durationS: route.durationS,
      routePolyline: route.polyline,
      journeyType,
      costCapPaise: costCap.capPerSeatPaise,
      defaultContributionPaise: costCap.capPerSeatPaise,
      soloCostPaise: costCap.soloCostPaise,
      co2AvoidedKg: Number(co2AvoidedKg.toFixed(2)),
    };
  }

  /**
   * Create and publish a new ride offer.
   */
  async createRide(
    userId: string,
    input: CreateRideRequest,
    ipAddress = '127.0.0.1',
    requestId = 'unknown',
  ): Promise<RideResponse> {
    // 1. Fetch user to verify driver identity & women_only eligibility
    const [driver] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!driver) {
      throw new AppError('NOT_FOUND', 404, 'Driver profile not found.');
    }

    // Women-only rule: Only verified female drivers may post women-only rides
    if (input.genderScope === 'women_only') {
      const isVerifiedFemale =
        driver.gender === 'female' && driver.genderVerifiedAt !== null;
      if (!isVerifiedFemale) {
        throw new AppError(
          'ELIGIBILITY_FAILED',
          403,
          'Only admin-verified female drivers may publish women-only rides.',
        );
      }
    }

    // 2. Fetch vehicle & verify ownership, status, capacity
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, input.vehicleId),
          eq(vehicles.ownerId, userId),
          isNull(vehicles.deletedAt),
        ),
      )
      .limit(1);

    if (!vehicle) {
      throw new AppError(
        'NOT_FOUND',
        404,
        'Vehicle not found or does not belong to your account.',
      );
    }

    if (vehicle.status !== 'verified') {
      throw new AppError(
        'ELIGIBILITY_FAILED',
        403,
        'Only verified vehicles can be used to offer rides. Please wait for document review.',
      );
    }

    if (
      (vehicle.type === 'bike' || vehicle.type === 'scooter') &&
      input.seatsTotal !== 1
    ) {
      throw new AppError(
        'VALIDATION_ERROR',
        400,
        'Two-wheelers (bike and scooter) may carry at most 1 passenger.',
      );
    }

    if (input.seatsTotal > vehicle.passengerCapacity) {
      throw new AppError(
        'VALIDATION_ERROR',
        400,
        `Selected seats (${input.seatsTotal}) exceeds vehicle capacity (${vehicle.passengerCapacity}).`,
      );
    }

    // 3. Validate departure timing: ≥ 30 min in future, ≤ 60 days
    const now = new Date();
    const departsAt = new Date(input.departsAt);
    const minDeparture = new Date(now.getTime() + 30 * 60 * 1000); // 30 min
    const maxDeparture = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days

    if (departsAt < minDeparture) {
      throw new AppError(
        'VALIDATION_ERROR',
        400,
        'Departure time must be at least 30 minutes in the future.',
      );
    }

    if (departsAt > maxDeparture) {
      throw new AppError(
        'VALIDATION_ERROR',
        400,
        'Departure time cannot be scheduled more than 60 days in advance.',
      );
    }

    // 4. Calculate route & statutory cost cap
    const maps = getMapsProvider();
    const route = await maps.getRoute(
      { lat: input.origin.lat, lng: input.origin.lng },
      { lat: input.destination.lat, lng: input.destination.lng },
    );

    const journeyType: JourneyType = route.distanceM > 40_000 ? 'outstation' : 'local';

    const costCap = computeCostCap({
      distanceM: route.distanceM,
      vehicleType: vehicle.type,
      seatsTotal: input.seatsTotal,
      tollPaise: input.tollPaise ?? 0,
    });

    if (input.contributionPaise > costCap.capPerSeatPaise) {
      throw new AppError(
        'VALIDATION_ERROR',
        400,
        `Contribution of ₹${(input.contributionPaise / 100).toFixed(2)} exceeds the statutory cost-share cap of ₹${(costCap.capPerSeatPaise / 100).toFixed(2)}.`,
      );
    }

    // 5. Insert primary ride
    const [created] = await db
      .insert(rides)
      .values({
        driverId: userId,
        vehicleId: vehicle.id,
        originLabel: input.origin.label,
        originLocation: {
          lat: input.origin.lat,
          lng: input.origin.lng,
        },
        originPlaceId: input.origin.placeId || null,
        destLabel: input.destination.label,
        destLocation: {
          lat: input.destination.lat,
          lng: input.destination.lng,
        },
        destPlaceId: input.destination.placeId || null,
        routePolyline: route.polyline,
        distanceM: route.distanceM,
        durationS: route.durationS,
        departsAt,
        journeyType,
        seatsTotal: input.seatsTotal,
        seatsAvailable: input.seatsTotal,
        contributionPaise: input.contributionPaise,
        costCapPaise: costCap.capPerSeatPaise,
        tollPaise: input.tollPaise ?? 0,
        audienceScope: input.audienceScope,
        genderScope: input.genderScope,
        status: 'scheduled',
        notes: input.notes || null,
        helmetProvided: input.helmetProvided ?? null,
        luggage: input.luggage || null,
      })
      .returning();

    if (!created) {
      throw new AppError('INTERNAL', 500, 'Failed to create ride.');
    }

    // 6. Optional intermediate stops
    if (input.stops && input.stops.length > 0) {
      for (let i = 0; i < input.stops.length; i++) {
        const stop = input.stops[i]!;
        await db.insert(rideStops).values({
          rideId: created.id,
          seq: i + 1,
          label: stop.label,
          location: {
            lat: stop.lat,
            lng: stop.lng,
          },
          etaOffsetS: stop.etaOffsetS,
        });
      }
    }

    // 7. Optional Return Trip
    if (input.returnTrip) {
      const returnDepartsAt = new Date(input.returnTrip.departsAt);
      const estReturnMin = new Date(
        departsAt.getTime() + (route.durationS * 1000) + 15 * 60 * 1000,
      ); // at least duration + 15m buffer

      if (returnDepartsAt < estReturnMin) {
        throw new AppError(
          'VALIDATION_ERROR',
          400,
          'Return trip departure time must be after the estimated arrival time of the outbound trip.',
        );
      }

      // Inverted route for return
      const returnRoute = await maps.getRoute(
        { lat: input.destination.lat, lng: input.destination.lng },
        { lat: input.origin.lat, lng: input.origin.lng },
      );

      const [returnRide] = await db
        .insert(rides)
        .values({
          driverId: userId,
          vehicleId: vehicle.id,
          originLabel: input.destination.label,
          originLocation: {
            lat: input.destination.lat,
            lng: input.destination.lng,
          },
          originPlaceId: input.destination.placeId || null,
          destLabel: input.origin.label,
          destLocation: {
            lat: input.origin.lat,
            lng: input.origin.lng,
          },
          destPlaceId: input.origin.placeId || null,
          routePolyline: returnRoute.polyline,
          distanceM: returnRoute.distanceM,
          durationS: returnRoute.durationS,
          departsAt: returnDepartsAt,
          journeyType,
          seatsTotal: input.seatsTotal,
          seatsAvailable: input.seatsTotal,
          contributionPaise: input.contributionPaise,
          costCapPaise: costCap.capPerSeatPaise,
          tollPaise: input.tollPaise ?? 0,
          audienceScope: input.audienceScope,
          genderScope: input.genderScope,
          status: 'scheduled',
          returnRideId: created.id,
          notes: input.returnTrip.notes || input.notes || null,
          helmetProvided: input.helmetProvided ?? null,
          luggage: input.luggage || null,
        })
        .returning();

      if (returnRide) {
        // Link primary ride to return ride
        await db
          .update(rides)
          .set({ returnRideId: returnRide.id })
          .where(eq(rides.id, created.id));
      }
    }

    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    await auditService.log({
      actorId: userId,
      action: 'ride.created',
      entity: 'rides',
      entityId: created.id,
      after: {
        vehicleId: created.vehicleId,
        origin: created.originLabel,
        dest: created.destLabel,
        contributionPaise: created.contributionPaise,
        journeyType: created.journeyType,
        genderScope: created.genderScope,
      },
      ipHash: ipHashed,
      requestId,
    });

    return this.getRideById(created.id);
  }

  /**
   * Fetch complete ride details with driver badges, vehicle, and stops.
   */
  async getRideById(rideId: string): Promise<RideResponse> {
    const [r] = await db
      .select({
        id: rides.id,
        driverId: rides.driverId,
        driverFullName: users.fullName,
        driverPhotoKey: users.photoKey,
        driverGender: users.gender,
        driverGenderVerifiedAt: users.genderVerifiedAt,
        driverCollegeVerifiedAt: users.collegeVerifiedAt,
        vehicleId: rides.vehicleId,
        vehicleType: vehicles.type,
        vehicleMakeModel: vehicles.makeModel,
        vehicleColour: vehicles.colour,
        vehicleRegNumber: vehicles.registrationNumber,
        originLabel: rides.originLabel,
        originLocation: rides.originLocation,
        destLabel: rides.destLabel,
        destLocation: rides.destLocation,
        routePolyline: rides.routePolyline,
        distanceM: rides.distanceM,
        durationS: rides.durationS,
        departsAt: rides.departsAt,
        journeyType: rides.journeyType,
        seatsTotal: rides.seatsTotal,
        seatsAvailable: rides.seatsAvailable,
        contributionPaise: rides.contributionPaise,
        costCapPaise: rides.costCapPaise,
        tollPaise: rides.tollPaise,
        audienceScope: rides.audienceScope,
        genderScope: rides.genderScope,
        status: rides.status,
        returnRideId: rides.returnRideId,
        notes: rides.notes,
        helmetProvided: rides.helmetProvided,
        luggage: rides.luggage,
        createdAt: rides.createdAt,
        updatedAt: rides.updatedAt,
      })
      .from(rides)
      .innerJoin(users, eq(rides.driverId, users.id))
      .innerJoin(vehicles, eq(rides.vehicleId, vehicles.id))
      .where(eq(rides.id, rideId))
      .limit(1);

    if (!r) {
      throw new AppError('NOT_FOUND', 404, 'Ride not found.');
    }

    const stops = await db
      .select()
      .from(rideStops)
      .where(eq(rideStops.rideId, rideId))
      .orderBy(rideStops.seq);

    const badges: string[] = [];
    if (r.driverCollegeVerifiedAt) {
      badges.push('campus_verified');
    }
    if (r.driverGender === 'female' && r.driverGenderVerifiedAt) {
      badges.push('women_verified');
    }
    badges.push('driver_verified');

    return {
      id: r.id,
      driverId: r.driverId,
      vehicleId: r.vehicleId,
      vehicle: {
        id: r.vehicleId,
        type: r.vehicleType,
        makeModel: r.vehicleMakeModel,
        colour: r.vehicleColour,
        registrationNumber: r.vehicleRegNumber,
      },
      driver: {
        id: r.driverId,
        fullName: r.driverFullName,
        photoKey: r.driverPhotoKey,
        badges,
      },
      originLabel: r.originLabel,
      originLocation: {
        lat: r.originLocation.lat,
        lng: r.originLocation.lng,
      },
      destLabel: r.destLabel,
      destLocation: {
        lat: r.destLocation.lat,
        lng: r.destLocation.lng,
      },
      routePolyline: r.routePolyline,
      distanceM: r.distanceM,
      durationS: r.durationS,
      departsAt: r.departsAt.toISOString(),
      journeyType: r.journeyType,
      seatsTotal: r.seatsTotal,
      seatsAvailable: r.seatsAvailable,
      contributionPaise: r.contributionPaise,
      costCapPaise: r.costCapPaise,
      tollPaise: r.tollPaise,
      audienceScope: r.audienceScope,
      genderScope: r.genderScope,
      status: r.status,
      returnRideId: r.returnRideId,
      notes: r.notes,
      helmetProvided: r.helmetProvided,
      luggage: r.luggage,
      stops: stops.map((s) => ({
        id: s.id,
        seq: s.seq,
        label: s.label,
        location: {
          lat: s.location.lat,
          lng: s.location.lng,
        },
        etaOffsetS: s.etaOffsetS,
      })),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  /**
   * Edit ride before first booking.
   */
  async updateRide(
    userId: string,
    rideId: string,
    input: UpdateRideRequest,
    ipAddress = '127.0.0.1',
    requestId = 'unknown',
  ): Promise<RideResponse> {
    const [existing] = await db
      .select()
      .from(rides)
      .where(eq(rides.id, rideId))
      .limit(1);

    if (!existing) {
      throw new AppError('NOT_FOUND', 404, 'Ride not found.');
    }

    if (existing.driverId !== userId) {
      throw new AppError('FORBIDDEN', 403, 'You do not own this ride.');
    }

    if (existing.status !== 'scheduled') {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        400,
        `Cannot edit a ride that is in state '${existing.status}'.`,
      );
    }

    // Check if bookings exist
    const [existingBooking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.rideId, rideId), eq(bookings.status, 'accepted')))
      .limit(1);

    if (existingBooking) {
      // If bookings exist, only non-material safe fields (notes, luggage, helmet) allowed
      if (input.contributionPaise !== undefined || input.departsAt !== undefined || input.seatsTotal !== undefined) {
        throw new AppError(
          'CONFLICT',
          409,
          'Material ride details cannot be modified once passengers have confirmed bookings.',
        );
      }
    }

    const now = new Date();
    const updateData: Partial<typeof rides.$inferInsert> = {
      updatedAt: now,
    };

    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.helmetProvided !== undefined) updateData.helmetProvided = input.helmetProvided;
    if (input.luggage !== undefined) updateData.luggage = input.luggage;
    if (input.contributionPaise !== undefined) {
      if (input.contributionPaise > existing.costCapPaise) {
        throw new AppError(
          'VALIDATION_ERROR',
          400,
          'Contribution exceeds the statutory cost cap.',
        );
      }
      updateData.contributionPaise = input.contributionPaise;
    }
    if (input.departsAt !== undefined) {
      const newDeparts = new Date(input.departsAt);
      if (newDeparts < new Date(Date.now() + 30 * 60 * 1000)) {
        throw new AppError(
          'VALIDATION_ERROR',
          400,
          'Departure time must be at least 30 minutes in the future.',
        );
      }
      updateData.departsAt = newDeparts;
    }

    await db.update(rides).set(updateData).where(eq(rides.id, rideId));

    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    await auditService.log({
      actorId: userId,
      action: 'ride.updated',
      entity: 'rides',
      entityId: rideId,
      after: updateData,
      ipHash: ipHashed,
      requestId,
    });

    return this.getRideById(rideId);
  }

  /**
   * Cancel a scheduled ride.
   */
  async cancelRide(
    userId: string,
    rideId: string,
    cancelReason: string,
    ipAddress = '127.0.0.1',
    requestId = 'unknown',
  ): Promise<{ message: string }> {
    const [existing] = await db
      .select()
      .from(rides)
      .where(eq(rides.id, rideId))
      .limit(1);

    if (!existing) {
      throw new AppError('NOT_FOUND', 404, 'Ride not found.');
    }

    if (existing.driverId !== userId) {
      throw new AppError('FORBIDDEN', 403, 'You do not own this ride.');
    }

    if (existing.status !== 'scheduled' && existing.status !== 'in_progress') {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        400,
        `Cannot cancel ride with status '${existing.status}'.`,
      );
    }

    const now = new Date();
    await db
      .update(rides)
      .set({
        status: 'cancelled',
        cancelledAt: now,
        cancelReason,
        updatedAt: now,
      })
      .where(eq(rides.id, rideId));

    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    await auditService.log({
      actorId: userId,
      action: 'ride.cancelled',
      entity: 'rides',
      entityId: rideId,
      after: { cancelReason },
      ipHash: ipHashed,
      requestId,
    });

    return { message: 'Ride cancelled successfully.' };
  }

  /**
   * Driver starts ride: transitions scheduled -> in_progress.
   */
  async startRide(userId: string, rideId: string): Promise<{ message: string }> {
    const [existing] = await db
      .select()
      .from(rides)
      .where(eq(rides.id, rideId))
      .limit(1);

    if (!existing) {
      throw new AppError('NOT_FOUND', 404, 'Ride not found.');
    }

    if (existing.driverId !== userId) {
      throw new AppError('FORBIDDEN', 403, 'You do not own this ride.');
    }

    if (existing.status !== 'scheduled') {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        400,
        `Cannot start ride with status '${existing.status}'. Only scheduled rides can be started.`,
      );
    }

    const now = new Date();
    await db
      .update(rides)
      .set({
        status: 'in_progress',
        startedAt: now,
        updatedAt: now,
      })
      .where(eq(rides.id, rideId));

    return { message: 'Ride started.' };
  }

  /**
   * Driver completes ride: transitions in_progress -> completed.
   */
  async completeRide(userId: string, rideId: string): Promise<{ message: string }> {
    const [existing] = await db
      .select()
      .from(rides)
      .where(eq(rides.id, rideId))
      .limit(1);

    if (!existing) {
      throw new AppError('NOT_FOUND', 404, 'Ride not found.');
    }

    if (existing.driverId !== userId) {
      throw new AppError('FORBIDDEN', 403, 'You do not own this ride.');
    }

    if (existing.status !== 'in_progress') {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        400,
        `Cannot complete ride with status '${existing.status}'. Only in-progress rides can be completed.`,
      );
    }

    const now = new Date();
    await db
      .update(rides)
      .set({
        status: 'completed',
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(rides.id, rideId));

    return { message: 'Ride completed.' };
  }

  /**
   * List rides offered by current driver.
   */
  async listMyRides(userId: string, status?: string): Promise<RideResponse[]> {
    const conditions = [eq(rides.driverId, userId)];
    if (status) {
      conditions.push(eq(rides.status, status as typeof rides.$inferSelect['status']));
    }

    const userRides = await db
      .select({ id: rides.id })
      .from(rides)
      .where(and(...conditions))
      .orderBy(desc(rides.departsAt));

    const result: RideResponse[] = [];
    for (const r of userRides) {
      result.push(await this.getRideById(r.id));
    }
    return result;
  }
}

export const ridesService = new RidesService();
