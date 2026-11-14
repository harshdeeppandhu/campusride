import { z } from 'zod';
import {
  JourneyType,
  RideStatus,
  AudienceScope,
  GenderScope,
} from '../enums.js';
import { CoordinatesSchema } from './places.js';
import { VehicleTypeSchema } from './vehicle.js';

export const JourneyTypeSchema = z.enum([
  JourneyType.LOCAL,
  JourneyType.OUTSTATION,
]);

export const RideStatusSchema = z.enum([
  RideStatus.SCHEDULED,
  RideStatus.IN_PROGRESS,
  RideStatus.COMPLETED,
  RideStatus.CANCELLED,
]);

export const AudienceScopeSchema = z.enum([
  AudienceScope.CAMPUS_ONLY,
  AudienceScope.CAMPUS_AND_COMMUNITY,
]);

export const GenderScopeSchema = z.enum([
  GenderScope.ANY,
  GenderScope.WOMEN_ONLY,
]);

export const RideLocationInputSchema = z.object({
  label: z.string().min(2).max(200).trim(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  placeId: z.string().uuid().optional(),
});
export type RideLocationInput = z.infer<typeof RideLocationInputSchema>;

export const RideStopInputSchema = z.object({
  label: z.string().min(2).max(200).trim(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  etaOffsetS: z.number().int().min(0).max(86400),
});
export type RideStopInput = z.infer<typeof RideStopInputSchema>;

export const RideEstimateRequestSchema = z.object({
  origin: RideLocationInputSchema,
  destination: RideLocationInputSchema,
  vehicleType: VehicleTypeSchema,
  seatsTotal: z.number().int().min(1).max(6),
  tollPaise: z.number().int().min(0).default(0),
});
export type RideEstimateRequest = z.infer<typeof RideEstimateRequestSchema>;

export const RideEstimateResponseSchema = z.object({
  distanceM: z.number().int().min(0),
  durationS: z.number().int().min(0),
  routePolyline: z.string().nullable(),
  journeyType: JourneyTypeSchema,
  costCapPaise: z.number().int().min(0),
  defaultContributionPaise: z.number().int().min(0),
  soloCostPaise: z.number().int().min(0),
  co2AvoidedKg: z.number().min(0),
});
export type RideEstimateResponse = z.infer<typeof RideEstimateResponseSchema>;

export const ReturnTripInputSchema = z.object({
  departsAt: z.string().datetime(),
  notes: z.string().max(500).optional(),
});
export type ReturnTripInput = z.infer<typeof ReturnTripInputSchema>;

export const CreateRideRequestSchema = z
  .object({
    vehicleId: z.string().uuid(),
    origin: RideLocationInputSchema,
    destination: RideLocationInputSchema,
    departsAt: z.string().datetime(),
    seatsTotal: z.number().int().min(1).max(6),
    contributionPaise: z.number().int().min(0),
    tollPaise: z.number().int().min(0).default(0),
    audienceScope: AudienceScopeSchema,
    genderScope: GenderScopeSchema.default('any'),
    stops: z.array(RideStopInputSchema).max(5).optional(),
    returnTrip: ReturnTripInputSchema.optional(),
    notes: z.string().max(500).trim().optional(),
    helmetProvided: z.boolean().optional(),
    luggage: z.string().max(100).trim().optional(),
  });
export type CreateRideRequest = z.infer<typeof CreateRideRequestSchema>;

export const UpdateRideRequestSchema = z.object({
  notes: z.string().max(500).trim().optional(),
  helmetProvided: z.boolean().optional(),
  luggage: z.string().max(100).trim().optional(),
  contributionPaise: z.number().int().min(0).optional(),
  seatsTotal: z.number().int().min(1).max(6).optional(),
  departsAt: z.string().datetime().optional(),
});
export type UpdateRideRequest = z.infer<typeof UpdateRideRequestSchema>;

export const CancelRideRequestSchema = z.object({
  cancelReason: z.string().min(3).max(500).trim(),
});
export type CancelRideRequest = z.infer<typeof CancelRideRequestSchema>;

export const RideStopResponseSchema = z.object({
  id: z.string().uuid(),
  seq: z.number().int(),
  label: z.string(),
  location: CoordinatesSchema,
  etaOffsetS: z.number().int(),
});
export type RideStopResponse = z.infer<typeof RideStopResponseSchema>;

export const RideResponseSchema = z.object({
  id: z.string().uuid(),
  driverId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  vehicle: z.object({
    id: z.string().uuid(),
    type: VehicleTypeSchema,
    makeModel: z.string(),
    colour: z.string(),
    registrationNumber: z.string(),
  }),
  driver: z.object({
    id: z.string().uuid(),
    fullName: z.string().nullable(),
    photoKey: z.string().nullable(),
    badges: z.array(z.string()),
    rating: z.number().optional(),
    ridesCount: z.number().optional(),
  }),
  originLabel: z.string(),
  originLocation: CoordinatesSchema,
  destLabel: z.string(),
  destLocation: CoordinatesSchema,
  routePolyline: z.string().nullable(),
  distanceM: z.number().int(),
  durationS: z.number().int(),
  departsAt: z.string().datetime(),
  journeyType: JourneyTypeSchema,
  seatsTotal: z.number().int(),
  seatsAvailable: z.number().int(),
  contributionPaise: z.number().int(),
  costCapPaise: z.number().int(),
  tollPaise: z.number().int(),
  audienceScope: AudienceScopeSchema,
  genderScope: GenderScopeSchema,
  status: RideStatusSchema,
  returnRideId: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  helmetProvided: z.boolean().nullable(),
  luggage: z.string().nullable(),
  stops: z.array(RideStopResponseSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type RideResponse = z.infer<typeof RideResponseSchema>;

export const RideSearchQuerySchema = z.object({
  originLat: z.coerce.number().min(-90).max(90),
  originLng: z.coerce.number().min(-180).max(180),
  destLat: z.coerce.number().min(-90).max(90).optional(),
  destLng: z.coerce.number().min(-180).max(180).optional(),
  destPlaceId: z.string().uuid().optional(),
  radiusM: z.coerce.number().int().min(500).max(50000).default(5000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  timeFrom: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm').optional(),
  timeTo: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm').optional(),
  seats: z.coerce.number().int().min(1).max(6).default(1),
  vehicleType: VehicleTypeSchema.optional(),
  journeyType: JourneyTypeSchema.optional(),
  womenOnly: z.coerce.boolean().optional(),
  sort: z.enum(['departs_at', 'contribution', 'distance']).default('departs_at'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type RideSearchQuery = z.infer<typeof RideSearchQuerySchema>;

export const SearchResultItemSchema = z.object({
  rideId: z.string().uuid(),
  driver: z.object({
    id: z.string().uuid(),
    firstName: z.string().nullable(),
    photoKey: z.string().nullable(),
    badges: z.array(z.string()),
    rating: z.number().nullable(),
    ridesCount: z.number().default(0),
  }),
  origin: z.object({
    areaLabel: z.string(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  destination: z.object({
    areaLabel: z.string(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  departsAt: z.string().datetime(),
  seatsAvailable: z.number().int(),
  contributionPaise: z.number().int(),
  vehicle: z.object({
    type: VehicleTypeSchema,
    makeModel: z.string(),
  }),
  journeyType: JourneyTypeSchema,
  womenOnly: z.boolean(),
  distanceToPickupM: z.number().int(),
  match: z.enum(['exact', 'nearby']),
});
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

export const RideSearchResponseSchema = z.object({
  items: z.array(SearchResultItemSchema),
  nextCursor: z.string().nullable(),
});
export type RideSearchResponse = z.infer<typeof RideSearchResponseSchema>;
