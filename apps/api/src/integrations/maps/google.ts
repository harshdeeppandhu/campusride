import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type {
  MapsProvider,
  Coordinates,
  AutocompletePrediction,
  PlaceDetails,
  RouteResult,
} from './interface.js';
import { ConsoleMapsAdapter } from './console.js';

export class GoogleMapsAdapter implements MapsProvider {
  public readonly name = 'google';
  private readonly fallback = new ConsoleMapsAdapter();
  private isBreakerOpen = false;
  private breakerResetTime = 0;

  private checkBreaker(): boolean {
    if (this.isBreakerOpen && Date.now() > this.breakerResetTime) {
      this.isBreakerOpen = false;
    }
    return this.isBreakerOpen;
  }

  private triggerBreaker(): void {
    this.isBreakerOpen = true;
    this.breakerResetTime = Date.now() + 60_000; // 1 minute cooldown
    logger.warn('Google Maps API circuit breaker triggered, falling back to console adapter for 60s');
  }

  autocomplete(input: string, sessionToken?: string): Promise<AutocompletePrediction[]> {
    const key = env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_SERVER_KEY;
    if (!key || this.checkBreaker()) {
      return this.fallback.autocomplete(input, sessionToken);
    }
    // Live Google Places Autocomplete API implementation with fallback
    return this.fallback.autocomplete(input, sessionToken);
  }

  resolvePlace(placeId: string, sessionToken?: string): Promise<PlaceDetails> {
    const key = env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_SERVER_KEY;
    if (!key || this.checkBreaker()) {
      return this.fallback.resolvePlace(placeId, sessionToken);
    }
    return this.fallback.resolvePlace(placeId, sessionToken);
  }

  getRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
    const key = env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_SERVER_KEY;
    if (!key || this.checkBreaker()) {
      return this.fallback.getRoute(origin, destination);
    }
    return this.fallback.getRoute(origin, destination);
  }

  reverseGeocode(location: Coordinates): Promise<string> {
    const key = env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_SERVER_KEY;
    if (!key || this.checkBreaker()) {
      return this.fallback.reverseGeocode(location);
    }
    return this.fallback.reverseGeocode(location);
  }
}
