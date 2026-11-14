import { env } from '../../config/env.js';
import type { MapsProvider } from './interface.js';
import { ConsoleMapsAdapter } from './console.js';
import { GoogleMapsAdapter } from './google.js';

let mapsProviderInstance: MapsProvider | null = null;

export function getMapsProvider(): MapsProvider {
  if (!mapsProviderInstance) {
    const isGoogle = (env.MAPS_PROVIDER === 'google' || env.MAPS_ADAPTER === 'google') &&
      Boolean(env.GOOGLE_MAPS_API_KEY || env.GOOGLE_MAPS_SERVER_KEY);
    if (isGoogle) {
      mapsProviderInstance = new GoogleMapsAdapter();
    } else {
      mapsProviderInstance = new ConsoleMapsAdapter();
    }
  }
  return mapsProviderInstance;
}

export function setMapsProviderForTest(provider: MapsProvider | null): void {
  mapsProviderInstance = provider;
}
