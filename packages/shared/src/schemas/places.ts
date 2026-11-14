import { z } from 'zod';
import { PlaceKind } from '../enums.js';

export const PlaceKindSchema = z.enum([
  PlaceKind.HUB,
  PlaceKind.CAMPUS,
  PlaceKind.CUSTOM,
]);

export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

export const PlaceResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  kind: PlaceKindSchema,
  city: z.string(),
  address: z.string(),
  location: CoordinatesSchema,
  googlePlaceId: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});
export type PlaceResponse = z.infer<typeof PlaceResponseSchema>;

export const AutocompleteQuerySchema = z.object({
  q: z.string().min(1).max(100).trim(),
  sessionToken: z.string().max(100).optional(),
});
export type AutocompleteQuery = z.infer<typeof AutocompleteQuerySchema>;

export const AutocompleteItemSchema = z.object({
  placeId: z.string(),
  primaryText: z.string(),
  secondaryText: z.string(),
  fullText: z.string(),
});
export type AutocompleteItem = z.infer<typeof AutocompleteItemSchema>;

export const ResolvePlaceSchema = z.object({
  placeId: z.string().min(1).max(255),
  sessionToken: z.string().max(100).optional(),
});
export type ResolvePlace = z.infer<typeof ResolvePlaceSchema>;

export const ResolvePlaceResponseSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  formattedAddress: z.string(),
  location: CoordinatesSchema,
  city: z.string().optional(),
});
export type ResolvePlaceResponse = z.infer<typeof ResolvePlaceResponseSchema>;
