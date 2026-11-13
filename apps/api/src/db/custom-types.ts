import { customType } from 'drizzle-orm/pg-core';

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Custom Drizzle column type for PostGIS geography(Point, 4326).
 * Note: PostGIS POINT order is always (longitude, latitude).
 */
export const geographyPoint = customType<{ data: GeoPoint; driverData: string }>({
  dataType() {
    return 'geography(Point,4326)';
  },
  toDriver(value: GeoPoint): string {
    return `SRID=4326;POINT(${value.lng} ${value.lat})`;
  },
  fromDriver(value: string): GeoPoint {
    const match = value.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (!match || match[1] === undefined || match[2] === undefined) {
      throw new Error(`Invalid PostGIS Point format: ${value}`);
    }
    return {
      lng: parseFloat(match[1]),
      lat: parseFloat(match[2]),
    };
  },
});

/**
 * Custom Drizzle column type for PostGIS geography(LineString, 4326).
 */
export const geographyLineString = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geography(LineString,4326)';
  },
  toDriver(value: string): string {
    return value;
  },
  fromDriver(value: string): string {
    return value;
  },
});
