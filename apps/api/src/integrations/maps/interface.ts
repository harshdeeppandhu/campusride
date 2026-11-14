export interface Coordinates {
  lat: number;
  lng: number;
}

export interface AutocompletePrediction {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  fullText: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  location: Coordinates;
  city?: string;
}

export interface RouteResult {
  distanceM: number;
  durationS: number;
  polyline: string;
}

export interface MapsProvider {
  readonly name: string;

  /**
   * Provides place predictions for user query string.
   */
  autocomplete(input: string, sessionToken?: string): Promise<AutocompletePrediction[]>;

  /**
   * Resolves place details (name, address, coordinates) from placeId.
   */
  resolvePlace(placeId: string, sessionToken?: string): Promise<PlaceDetails>;

  /**
   * Computes driving route distance, duration, and geometry between two points.
   */
  getRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult>;

  /**
   * Obtains a human-readable address for coordinates.
   */
  reverseGeocode(location: Coordinates): Promise<string>;
}
