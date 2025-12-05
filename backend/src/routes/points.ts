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

    return res.json({
      city: cityInfo.city,
      neighbourhood: resolvedNeighbourhood,
      totalAvailable,
      returned: points.length,
      points
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo completar la búsqueda de puntos';
    return res.status(500).json({ error: message });
  }
});

export default router;
