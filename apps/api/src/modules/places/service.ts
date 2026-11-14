import { eq, and } from 'drizzle-orm';
import type {
  PlaceResponse,
  AutocompleteItem,
  ResolvePlaceResponse,
} from '@campusride/shared';
import { db } from '../../db/client.js';
import { places } from '../../db/schema.js';
import { getMapsProvider } from '../../integrations/maps/index.js';

export class PlacesService {
  async listHubs(): Promise<PlaceResponse[]> {
    const rows = await db
      .select()
      .from(places)
      .where(and(eq(places.kind, 'hub'), eq(places.isActive, true)));

    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      city: p.city,
      address: p.address,
      location: {
        lat: p.location.lat,
        lng: p.location.lng,
      },
      googlePlaceId: p.googlePlaceId,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  async autocomplete(query: string, sessionToken?: string): Promise<AutocompleteItem[]> {
    const maps = getMapsProvider();
    return maps.autocomplete(query, sessionToken);
  }

  async resolvePlace(placeId: string, sessionToken?: string): Promise<ResolvePlaceResponse> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(placeId);
    let dbPlace = null;
    try {
      if (isUuid) {
        const [p] = await db
          .select()
          .from(places)
          .where(eq(places.id, placeId))
          .limit(1);
        dbPlace = p;
      } else {
        const [p] = await db
          .select()
          .from(places)
          .where(eq(places.googlePlaceId, placeId))
          .limit(1);
        dbPlace = p;
      }
    } catch {
      // In case DB lookup fails or place not in DB, fallback to maps provider
    }

    if (dbPlace) {
      return {
        placeId: dbPlace.id,
        name: dbPlace.name,
        formattedAddress: dbPlace.address,
        location: {
          lat: dbPlace.location.lat,
          lng: dbPlace.location.lng,
        },
        city: dbPlace.city,
      };
    }

    const maps = getMapsProvider();
    const details = await maps.resolvePlace(placeId, sessionToken);
    return {
      placeId: details.placeId,
      name: details.name,
      formattedAddress: details.formattedAddress,
      location: details.location,
      city: details.city,
    };
  }
}

export const placesService = new PlacesService();
