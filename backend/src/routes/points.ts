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

  console.info('[api/points] Received request', {
    city,
    neighbourhood,
    limit
  });

  if (!city) {
    return res.status(400).json({ error: 'El parámetro city es obligatorio' });
  }

  try {
    const cityInfo = await fetchCityBoundingBox(city);

    let searchBoundingBox: BoundingBox = cityInfo.boundingBox;
    let resolvedNeighbourhood: string | null = null;

    if (neighbourhood) {
      const areaBox = await fetchNeighbourhoodBoundingBox(cityInfo.city, neighbourhood);
      if (areaBox) {
        searchBoundingBox = areaBox;
        resolvedNeighbourhood = neighbourhood;
      }
    }

    const { totalAvailable, points } = await queryOverpassForNodes(searchBoundingBox, limit);

    const payload = {
      city: cityInfo.city,
      neighbourhood: resolvedNeighbourhood,
      totalAvailable,
      returned: points.length,
      points
    };

    console.info('[api/points] Response ready', {
      city: payload.city,
      neighbourhood: payload.neighbourhood,
      returned: payload.returned,
      totalAvailable: payload.totalAvailable
    });

    return res.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo completar la búsqueda de puntos';

    console.error('[api/points] Error while resolving request', {
      city,
      neighbourhood,
      limit,
      message,
      stack: error instanceof Error ? error.stack : undefined
    });

    return res.status(500).json({ error: message });
  }
});

export default router;
