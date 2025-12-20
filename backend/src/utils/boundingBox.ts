import { BoundingBox } from '../types';

const isValidLatitude = (value: number): boolean => value >= -90 && value <= 90;
const isValidLongitude = (value: number): boolean => value >= -180 && value <= 180;

export const parseBoundingBox = (query: Record<string, unknown>): BoundingBox | null => {
  if (typeof query.bbox === 'string') {
    const parts = query.bbox
      .split(',')
      .map((value) => Number.parseFloat(value.trim()))
      .filter((value) => !Number.isNaN(value));

    if (parts.length === 4) {
      const [south, west, north, east] = parts;
      if (
        isValidLatitude(south) &&
        isValidLatitude(north) &&
        isValidLongitude(west) &&
        isValidLongitude(east) &&
        north > south &&
        east !== west
      ) {
        return { south, west, north, east };
      }
    }
  }

  const south = typeof query.south === 'string' ? Number.parseFloat(query.south) : null;
  const west = typeof query.west === 'string' ? Number.parseFloat(query.west) : null;
  const north = typeof query.north === 'string' ? Number.parseFloat(query.north) : null;
  const east = typeof query.east === 'string' ? Number.parseFloat(query.east) : null;

  if (
    south !== null &&
    west !== null &&
    north !== null &&
    east !== null &&
    ![south, west, north, east].some((value) => Number.isNaN(value)) &&
    isValidLatitude(south) &&
    isValidLatitude(north) &&
    isValidLongitude(west) &&
    isValidLongitude(east) &&
    north > south &&
    east !== west
  ) {
    return { south, west, north, east };
  }

  return null;
};
