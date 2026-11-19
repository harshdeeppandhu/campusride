import type {
  MapsProvider,
  Coordinates,
  AutocompletePrediction,
  PlaceDetails,
  RouteResult,
} from './interface.js';

export function calculateHaversineDistanceM(from: Coordinates, to: Coordinates): number {
  const R = 6371e3; // Earth radius in metres
  const phi1 = (from.lat * Math.PI) / 180;
  const phi2 = (to.lat * Math.PI) / 180;
  const deltaPhi = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLambda = ((to.lng - from.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

const KNOWN_PLACES: Record<string, PlaceDetails> = {
  // Dehradun Campuses & Hubs
  'kandoli-campus': {
    placeId: 'kandoli-campus',
    name: 'Kandoli Campus (Knowledge Acres)',
    formattedAddress: 'Knowledge Acres, P.O. Kandoli, via Prem Nagar, Dehradun, Uttarakhand 248007',
    location: { lat: 30.385, lng: 77.947 },
    city: 'Dehradun',
  },
  'bidholi-campus': {
    placeId: 'bidholi-campus',
    name: 'Bidholi Campus (Energy Acres)',
    formattedAddress: 'Energy Acres, P.O. Bidholi, via Prem Nagar, Dehradun, Uttarakhand 248007',
    location: { lat: 30.4159, lng: 77.967 },
    city: 'Dehradun',
  },
  'isbt-dehradun': {
    placeId: 'isbt-dehradun',
    name: 'ISBT Dehradun (Inter State Bus Terminal)',
    formattedAddress: 'ISBT, Haridwar Bypass Road, Transport Nagar, Dehradun, Uttarakhand 248001',
    location: { lat: 30.2874, lng: 77.9979 },
    city: 'Dehradun',
  },
  'dehradun-railway-station': {
    placeId: 'dehradun-railway-station',
    name: 'Dehradun Railway Station (DDN)',
    formattedAddress: 'Station Road, Lakkhi Bagh, Dehradun, Uttarakhand 248001',
    location: { lat: 30.3155, lng: 78.0322 },
    city: 'Dehradun',
  },
  'jolly-grant-airport': {
    placeId: 'jolly-grant-airport',
    name: 'Jolly Grant Airport Dehradun (DED)',
    formattedAddress: 'Dehradun Airport, Rishikesh Road, Jauligrant, Dehradun, Uttarakhand 248140',
    location: { lat: 30.1897, lng: 78.1803 },
    city: 'Dehradun',
  },
  'prem-nagar': {
    placeId: 'prem-nagar',
    name: 'Prem Nagar (Nanda Ki Chowki Junction)',
    formattedAddress: 'Nanda Ki Chowki, Chakrata Road, Prem Nagar, Dehradun, Uttarakhand 248007',
    location: { lat: 30.334, lng: 77.962 },
    city: 'Dehradun',
  },
  'clock-tower-dehradun': {
    placeId: 'clock-tower-dehradun',
    name: 'Clock Tower (Ghanta Ghar)',
    formattedAddress: 'Ghanta Ghar, Rajpur Road, Dehradun, Uttarakhand 248001',
    location: { lat: 30.3244, lng: 78.0416 },
    city: 'Dehradun',
  },
  'jakhan-rajpur-road': {
    placeId: 'jakhan-rajpur-road',
    name: 'Jakhan / Pacific Mall (Rajpur Road)',
    formattedAddress: 'Rajpur Road, Jakhan, Dehradun, Uttarakhand 248006',
    location: { lat: 30.362, lng: 78.067 },
    city: 'Dehradun',
  },

  // Existing test fixtures for backward compatibility
  'campus-main-gate': {
    placeId: 'campus-main-gate',
    name: 'Campus Main Gate',
    formattedAddress: 'Main Gate, University Campus, New Delhi, 110016',
    location: { lat: 28.545, lng: 77.1926 },
    city: 'New Delhi',
  },
  'igi-airport-t3': {
    placeId: 'igi-airport-t3',
    name: 'Indira Gandhi International Airport Terminal 3',
    formattedAddress: 'Terminal 3, IGI Airport, New Delhi, 110037',
    location: { lat: 28.5562, lng: 77.1 },
    city: 'New Delhi',
  },
  'ndls-railway-station': {
    placeId: 'ndls-railway-station',
    name: 'New Delhi Railway Station (NDLS)',
    formattedAddress: 'Bhavbhuti Marg, Ratan Lal Market, Kamla Market, New Delhi, 110002',
    location: { lat: 28.6429, lng: 77.2195 },
    city: 'New Delhi',
  },
  'isbt-kashmere-gate': {
    placeId: 'isbt-kashmere-gate',
    name: 'ISBT Kashmere Gate',
    formattedAddress: 'Inter State Bus Terminal, Kashmere Gate, New Delhi, 110006',
    location: { lat: 28.6675, lng: 77.2332 },
    city: 'New Delhi',
  },
  'connaught-place': {
    placeId: 'connaught-place',
    name: 'Connaught Place',
    formattedAddress: 'Connaught Place, New Delhi, 110001',
    location: { lat: 28.6315, lng: 77.2167 },
    city: 'New Delhi',
  },
};

export class ConsoleMapsAdapter implements MapsProvider {
  public readonly name = 'console';
  private readonly cache = new Map<string, unknown>();

  autocomplete(input: string, _sessionToken?: string): Promise<AutocompletePrediction[]> {
    const q = input.trim().toLowerCase();
    if (q.length === 0) return Promise.resolve([]);

    const cacheKey = `ac:${q}`;
    if (this.cache.has(cacheKey)) {
      return Promise.resolve(this.cache.get(cacheKey) as AutocompletePrediction[]);
    }

    const matches: AutocompletePrediction[] = Object.values(KNOWN_PLACES)
      .filter((p) => p.name.toLowerCase().includes(q) || p.formattedAddress.toLowerCase().includes(q))
      .map((p) => ({
        placeId: p.placeId,
        primaryText: p.name,
        secondaryText: p.formattedAddress,
        fullText: `${p.name}, ${p.formattedAddress}`,
      }));

    if (matches.length === 0) {
      // Dynamic fallback prediction
      matches.push({
        placeId: `custom-${encodeURIComponent(q)}`,
        primaryText: input.trim(),
        secondaryText: 'Delhi NCR, India',
        fullText: `${input.trim()}, Delhi NCR, India`,
      });
    }

    this.cache.set(cacheKey, matches);
    return Promise.resolve(matches);
  }

  resolvePlace(placeId: string, _sessionToken?: string): Promise<PlaceDetails> {
    if (KNOWN_PLACES[placeId]) {
      return Promise.resolve(KNOWN_PLACES[placeId]);
    }

    // Dynamic resolution fallback
    const decoded = decodeURIComponent(placeId.replace(/^custom-/, ''));
    return Promise.resolve({
      placeId,
      name: decoded,
      formattedAddress: `${decoded}, Delhi NCR, India`,
      location: { lat: 28.545, lng: 77.1926 },
      city: 'New Delhi',
    });
  }

  getRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
    const straightDistM = calculateHaversineDistanceM(origin, destination);
    // Driving distance is typically 1.25 - 1.4x straight line distance
    const distanceM = Math.max(1000, Math.round(straightDistM * 1.3));
    // Average urban/semi-urban speed: ~35 km/h (approx 9.72 m/s)
    const durationS = Math.max(300, Math.round(distanceM / 9.72));
    const polyline = `_mock_polyline_${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}_to_${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;

    return Promise.resolve({
      distanceM,
      durationS,
      polyline,
    });
  }

  reverseGeocode(location: Coordinates): Promise<string> {
    return Promise.resolve(`Location (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}), Delhi NCR`);
  }
}
