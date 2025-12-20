import { BoundingBox, Point } from '../types';
import fetch, { withUserAgent } from '../utils/fetch';

type CatastroFeature = {
  id?: string;
  properties?: Record<string, unknown>;
  geometry?: {
    type: string;
    coordinates: unknown;
  };
};

type CatastroResponse = {
  features?: CatastroFeature[];
  numberMatched?: number;
  totalFeatures?: number;
};

const CATASTRO_WFS_URL =
  process.env.CATASTRO_WFS_URL || 'https://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx';
const DEFAULT_FEATURE_MULTIPLIER = 5;
const MAX_FEATURES = 500;

const buildCatastroUrl = (bbox: BoundingBox, limit: number): string => {
  const requestedCount = Math.min(
    Math.max(limit, limit * DEFAULT_FEATURE_MULTIPLIER),
    MAX_FEATURES
  );
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typenames: 'CP.CadastralParcel',
    srsName: 'EPSG:4326',
    bbox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north},EPSG:4326`,
    count: String(requestedCount),
    outputFormat: 'application/json'
  });

  return `${CATASTRO_WFS_URL}?${params.toString()}`;
};

const collectCoordinates = (coordinates: unknown, output: Array<[number, number]>) => {
  if (!coordinates) return;
  if (
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    typeof coordinates[0] === 'number' &&
    typeof coordinates[1] === 'number'
  ) {
    output.push([coordinates[0], coordinates[1]]);
    return;
  }
  if (Array.isArray(coordinates)) {
    coordinates.forEach((entry) => collectCoordinates(entry, output));
  }
};

const computeCentroid = (geometry?: CatastroFeature['geometry']): { lat: number; lng: number } | null => {
  if (!geometry) return null;
  const coordinates: Array<[number, number]> = [];
  collectCoordinates(geometry.coordinates, coordinates);
  if (!coordinates.length) return null;

  const summary = coordinates.reduce(
    (acc, [lng, lat]) => {
      acc.lat += lat;
      acc.lng += lng;
      return acc;
    },
    { lat: 0, lng: 0 }
  );
  return {
    lat: summary.lat / coordinates.length,
    lng: summary.lng / coordinates.length
  };
};

const toPoint = (feature: CatastroFeature, index: number): Point | null => {
  const centroid = computeCentroid(feature.geometry);
  if (!centroid) return null;

  const properties = feature.properties ?? {};
  const cadastralReference =
    (properties.nationalCadastralReference as string | undefined) ||
    (properties.reference as string | undefined) ||
    (properties.label as string | undefined);

  const name =
    (properties.label as string | undefined) ||
    (properties.nationalCadastralReference as string | undefined) ||
    null;

  const street =
    (properties.address as string | undefined) ||
    (properties.postalAddress as string | undefined) ||
    null;

  return {
    id: `catastro/${feature.id ?? cadastralReference ?? index}`,
    name,
    street,
    lat: centroid.lat,
    lng: centroid.lng,
    source: 'catastro'
  };
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

export const queryCatastroParcels = async (
  bbox: BoundingBox,
  limit: number
): Promise<{ totalAvailable: number; points: Point[] }> => {
  const url = buildCatastroUrl(bbox, limit);

  console.info('[catastro] Sending query', {
    bbox,
    limit,
    url
  });

  const response = await fetch(url, withUserAgent());
  console.info('[catastro] Response received', {
    status: response.status,
    statusText: response.statusText
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Catastro respondió ${response.status} ${response.statusText}${detail ? `: ${detail}` : ''}`
    );
  }

  const payload = (await response.json()) as CatastroResponse;
  const features = payload?.features ?? [];
  const mapped = features
    .map((feature, index) => toPoint(feature, index))
    .filter((point): point is Point => Boolean(point));

  const totalAvailable =
    typeof payload?.numberMatched === 'number'
      ? payload.numberMatched
      : typeof payload?.totalFeatures === 'number'
        ? payload.totalFeatures
        : mapped.length;

  console.info('[catastro] Parsed features', {
    totalFeatures: features.length,
    mapped: mapped.length,
    returned: Math.min(mapped.length, limit)
  });

  return {
    totalAvailable,
    points: pickSample(mapped, limit)
  };
};
