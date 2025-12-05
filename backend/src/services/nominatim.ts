import { BoundingBox, CityLocation } from '../types';
import fetch, { withUserAgent } from '../utils/fetch';
import { createRateLimiter } from '../utils/rateLimiter';

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string];
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    suburb?: string;
    neighbourhood?: string;
    city_district?: string;
  };
};

const NOMINATIM_BASE_URL =
  process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
const NOMINATIM_SEARCH_URL = `${NOMINATIM_BASE_URL}/search`;
const NOMINATIM_REVERSE_URL = `${NOMINATIM_BASE_URL}/reverse`;
const MIN_INTERVAL_MS = process.env.NODE_ENV === 'test' ? 0 : 1000;
const scheduleNominatim = createRateLimiter(MIN_INTERVAL_MS);

const parseBoundingBox = (bbox: [string, string, string, string]): BoundingBox => {
  const [south, north, west, east] = bbox.map((value) => parseFloat(value));
  return { south, north, west, east };
};

const extractDisplayCity = (result: NominatimResult, fallback: string): string => {
  return (
    result.address.city ||
    result.address.town ||
    result.address.village ||
    result.address.municipality ||
    fallback
  );
};

const extractCityFromAddress = (
  address: Partial<NominatimResult['address']>
): string | null => {
  return (
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    address.city_district ||
    address.state ||
    null
  );
};

export const fetchCityBoundingBox = async (city: string): Promise<CityLocation> => {
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '1');
  url.searchParams.set('city', city);

  const startedAt = Date.now();
  console.info('[nominatim] Fetching city', {
    city,
    url: url.toString()
  });

  const response = await scheduleNominatim(() => fetch(url.toString(), withUserAgent()));
  console.info('[nominatim] Response received', {
    city,
    status: response.status,
    statusText: response.statusText,
    durationMs: Date.now() - startedAt
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Nominatim respondió ${response.status} ${response.statusText}${
        detail ? `: ${detail}` : ''
      }`
    );
  }

  const results = (await response.json()) as NominatimResult[];
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('Ciudad no encontrada en Nominatim');
  }

  const [match] = results;
  const resolved = {
    city: extractDisplayCity(match, city),
    displayName: match.display_name,
    boundingBox: parseBoundingBox(match.boundingbox)
  };

  console.info('[nominatim] City parsed', {
    requestedCity: city,
    resolvedCity: resolved.city,
    boundingBox: resolved.boundingBox
  });

  return resolved;
};

export const fetchNeighbourhoodBoundingBox = async (
  city: string,
  neighbourhood: string
): Promise<BoundingBox | null> => {
  const query = `${neighbourhood}, ${city}`;
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', query);

  const startedAt = Date.now();
  console.info('[nominatim] Fetching neighbourhood', {
    query,
    url: url.toString()
  });

  const response = await scheduleNominatim(() => fetch(url.toString(), withUserAgent()));
  console.info('[nominatim] Neighbourhood response received', {
    query,
    status: response.status,
    statusText: response.statusText,
    durationMs: Date.now() - startedAt
  });
  if (!response.ok) {
    return null;
  }

  const results = (await response.json()) as NominatimResult[];
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const box = parseBoundingBox(results[0].boundingbox);
  console.info('[nominatim] Neighbourhood parsed', {
    query,
    boundingBox: box
  });

  return box;
};
