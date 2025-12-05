import { Router } from 'express';
import { fetchCityBoundingBox, fetchNeighbourhoodBoundingBox } from '../services/nominatim';
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

router.get('/', async (req, res) => {
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  const neighbourhood =
    typeof req.query.neighbourhood === 'string' ? req.query.neighbourhood.trim() : '';
  const limit = parseLimit(req.query.limit);
  const startedAt = Date.now();

  console.info('[api/points] Received request', {
    city,
    neighbourhood,
    limit,
    query: req.query,
    path: req.originalUrl
  });

  if (!city) {
    return res.status(400).json({ error: 'El parámetro city es obligatorio' });
  }

  try {
    const cityInfo = await fetchCityBoundingBox(city);

    console.info('[api/points] City resolved', {
      requestedCity: city,
      resolvedCity: cityInfo.city,
      boundingBox: cityInfo.boundingBox
    });

    let searchBoundingBox: BoundingBox = cityInfo.boundingBox;
    let resolvedNeighbourhood: string | null = null;

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

    console.info('[api/points] Querying Overpass', {
      limit,
      boundingBox: searchBoundingBox
    });

    const { totalAvailable, points } = await queryOverpassForNodes(searchBoundingBox, limit);

    const payload = {
      city: cityInfo.city,
      neighbourhood: resolvedNeighbourhood,
      totalAvailable,
      returned: points.length,
      points
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
      city,
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
