import { Router } from 'express';
import {
  fetchCityBoundingBox,
  fetchNeighbourhoodBoundingBox,
  resolveCityFromBoundingBox
} from '../services/nominatim';
import { queryOverpassForNodes } from '../services/overpass';
import { BoundingBox } from '../types';

const router = Router();

const parseLimit = (rawLimit: unknown): number => {
  const value = typeof rawLimit === 'string' ? parseInt(rawLimit, 10) : Number(rawLimit);
  if (Number.isNaN(value) || value <= 0) {
    return 20;
  }
  return Math.min(value, 100);
};

const isValidLatitude = (value: number): boolean => value >= -90 && value <= 90;
const isValidLongitude = (value: number): boolean => value >= -180 && value <= 180;

const parseBoundingBox = (query: Record<string, unknown>): BoundingBox | null => {
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

const formatBoundingBoxLabel = (bbox: BoundingBox): string => {
  const south = bbox.south.toFixed(4);
  const west = bbox.west.toFixed(4);
  const north = bbox.north.toFixed(4);
  const east = bbox.east.toFixed(4);
  return `Área seleccionada (SO: ${south}, ${west} · NE: ${north}, ${east})`;
};

router.get('/', async (req, res) => {
  const requestedCity = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  const neighbourhood =
    typeof req.query.neighbourhood === 'string' ? req.query.neighbourhood.trim() : '';
  const limit = parseLimit(req.query.limit);
  const boundingBox = parseBoundingBox(req.query);
  const startedAt = Date.now();

  console.info('[api/points] Received request', {
    requestedCity,
    neighbourhood,
    limit,
    boundingBox,
    query: req.query,
    path: req.originalUrl
  });

  if (!requestedCity && !boundingBox) {
    return res
      .status(400)
      .json({ error: 'El parámetro city es obligatorio si no se envía un bbox' });
  }

  try {
    let searchBoundingBox: BoundingBox;
    let resolvedNeighbourhood: string | null = null;
    let resolvedCity: string | null = requestedCity || null;
    let areaLabel: string | undefined;

    if (boundingBox) {
      searchBoundingBox = boundingBox;
      areaLabel = formatBoundingBoxLabel(boundingBox);

      if (!resolvedCity) {
        resolvedCity = await resolveCityFromBoundingBox(boundingBox);
        console.info('[api/points] City inferred from bounding box', {
          inferredCity: resolvedCity,
          boundingBox
        });
      }
    } else {
      const cityInfo = await fetchCityBoundingBox(requestedCity);

      console.info('[api/points] City resolved', {
        requestedCity,
        resolvedCity: cityInfo.city,
        boundingBox: cityInfo.boundingBox
      });

      searchBoundingBox = cityInfo.boundingBox;
      resolvedCity = cityInfo.city;

      if (neighbourhood) {
        console.info('[api/points] Resolving neighbourhood', {
          city: cityInfo.city,
          neighbourhood
        });
        const areaBox = await fetchNeighbourhoodBoundingBox(cityInfo.city, neighbourhood);
        if (areaBox) {
          searchBoundingBox = areaBox;
          resolvedNeighbourhood = neighbourhood;
          console.info('[api/points] Neighbourhood bounding box applied', {
            neighbourhood,
            boundingBox: areaBox
          });
        } else {
          console.warn('[api/points] Neighbourhood not found, using city bounding box', {
            neighbourhood,
            city: cityInfo.city
          });
        }
      }
    }

    console.info('[api/points] Querying Overpass', {
      limit,
      boundingBox: searchBoundingBox
    });

    const { totalAvailable, points } = await queryOverpassForNodes(searchBoundingBox, limit);

    const payload = {
      city: resolvedCity ?? requestedCity || 'Área seleccionada',
      neighbourhood: resolvedNeighbourhood,
      totalAvailable,
      returned: points.length,
      points,
      areaLabel
    };

    const durationMs = Date.now() - startedAt;

    console.info('[api/points] Response ready', {
      city: payload.city,
      neighbourhood: payload.neighbourhood,
      returned: payload.returned,
      totalAvailable: payload.totalAvailable,
      durationMs
    });

    return res.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo completar la búsqueda de puntos';

    const durationMs = Date.now() - startedAt;

    console.error('[api/points] Error while resolving request', {
      requestedCity,
      neighbourhood,
      limit,
      message,
      stack: error instanceof Error ? error.stack : undefined,
      durationMs
    });

    return res.status(500).json({ error: message });
  }
});

export default router;
