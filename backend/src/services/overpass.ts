import { BoundingBox, Point } from '../types';
import fetch, { withUserAgent } from '../utils/fetch';
import { createRateLimiter } from '../utils/rateLimiter';

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OverpassElement[];
};

const OVERPASS_URL =
  process.env.OVERPASS_BASE_URL || 'https://overpass-api.de/api/interpreter';
const MIN_INTERVAL_MS = process.env.NODE_ENV === 'test' ? 0 : 1000;
const scheduleOverpass = createRateLimiter(MIN_INTERVAL_MS);

const buildQuery = (bbox: BoundingBox): string => {
  const { south, west, north, east } = bbox;
  const header = '[out:json][timeout:25];';
  const addressFilters = ['["name"]["addr:street"]', '["name"]["addr:full"]', '["name"]["addr:place"]'];
  const buildFragments = (type: 'node' | 'way' | 'relation') =>
    addressFilters.map((filter) => `${type}${filter}(${south},${west},${north},${east});`).join('');

  return `${header}(${buildFragments('node')}${buildFragments('way')}${buildFragments('relation')});out center;`;
};

const resolveCoordinates = (element: OverpassElement): { lat: number; lon: number } | null => {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return { lat: element.lat, lon: element.lon };
  }
  if (element.center && typeof element.center.lat === 'number' && typeof element.center.lon === 'number') {
    return { lat: element.center.lat, lon: element.center.lon };
  }
  return null;
};

const buildStreet = (tags: Record<string, string> = {}): string | null => {
  const full = tags['addr:full'];
  if (full) return full;

  const street = tags['addr:street'] ?? tags['addr:place'] ?? tags['addr:road'];
  if (!street) return null;

  const houseNumber = tags['addr:housenumber'];
  return houseNumber ? `${street} ${houseNumber}` : street;
};

const toPoint = (element: OverpassElement): Point | null => {
  const coordinates = resolveCoordinates(element);
  if (!coordinates) {
    return null;
  }

  return {
    id: `${element.type}/${element.id}`,
    name: element.tags?.name ?? null,
    street: buildStreet(element.tags),
    lat: coordinates.lat,
    lng: coordinates.lon,
    source: 'osm'
  };
};

const hasStreet = (point: Point | null): point is Point & { street: string } => {
  return Boolean(point && point.street);
};

const pickSample = <T>(items: T[], limit: number): T[] => {
  if (items.length <= limit) {
    return items;
  }
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, limit);
};

export const queryOverpassForNodes = async (
  bbox: BoundingBox,
  limit: number
): Promise<{ totalAvailable: number; points: Point[] }> => {
  const query = buildQuery(bbox);
  const body = new URLSearchParams({ data: query });

  console.info('[overpass] Sending query', {
    bbox,
    limit,
    queryLength: query.length,
    preview: query.slice(0, 120)
  });

  const response = await scheduleOverpass(() =>
    fetch(OVERPASS_URL, withUserAgent({ method: 'POST', body }))
  );
  console.info('[overpass] Response received', {
    status: response.status,
    statusText: response.statusText,
    limit,
    bbox
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Overpass respondió ${response.status} ${response.statusText}${
        detail ? `: ${detail}` : ''
      }`
    );
  }

  const payload = (await response.json()) as OverpassResponse;
  const elements = payload?.elements ?? [];

  const mapped = elements.map(toPoint).filter(hasStreet);

  console.info('[overpass] Parsed elements', {
    totalElements: elements.length,
    withStreet: mapped.length,
    returned: Math.min(mapped.length, limit)
  });

  return {
    totalAvailable: mapped.length,
    points: pickSample(mapped, limit)
  };
};
