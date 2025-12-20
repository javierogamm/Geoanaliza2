import { Router } from 'express';
import {
  fetchCityBoundingBox,
  fetchNeighbourhoodBoundingBox,
  resolveCityFromBoundingBox
} from '../services/nominatim';
import { queryCatastroParcels } from '../services/catastro';
import { BoundingBox } from '../types';
import { parseBoundingBox } from '../utils/boundingBox';

const router = Router();

const parseLimit = (rawLimit: unknown): number => {
  const value = typeof rawLimit === 'string' ? parseInt(rawLimit, 10) : Number(rawLimit);
  if (Number.isNaN(value) || value <= 0) {
    return 20;
  }
  return Math.min(value, 1000);
};

router.get('/', async (req, res) => {
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  const neighbourhood =
    typeof req.query.neighbourhood === 'string' ? req.query.neighbourhood.trim() : '';
  const limit = parseLimit(req.query.limit);
  const boundingBox = parseBoundingBox(req.query);
  const startedAt = Date.now();

  console.info('[api/catastro] Received request', {
    city,
    neighbourhood,
    limit,
    boundingBox,
    query: req.query,
    path: req.originalUrl
  });

  if (!city && !boundingBox) {
    return res.status(400).json({
      error: 'Debes indicar un municipio o dibujar un área (bbox) para buscar puntos en Catastro.'
    });
  }

  try {
    let searchBoundingBox: BoundingBox;
    let resolvedCity: string | null = city || null;
    let resolvedNeighbourhood: string | null = null;
    let areaLabel: string | undefined;

    if (boundingBox) {
      searchBoundingBox = boundingBox;
      areaLabel = 'Área seleccionada en mapa';

      if (!resolvedCity) {
        try {
          resolvedCity = await resolveCityFromBoundingBox(boundingBox);
          console.info('[api/catastro] City inferred from bounding box', {
            resolvedCity,
            boundingBox
          });
        } catch (error) {
          console.warn('[api/catastro] Could not resolve city from bounding box', {
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    } else {
      const cityInfo = await fetchCityBoundingBox(city);

      console.info('[api/catastro] City resolved', {
        requestedCity: city,
        resolvedCity: cityInfo.city,
        boundingBox: cityInfo.boundingBox
      });

      searchBoundingBox = cityInfo.boundingBox;
      resolvedCity = cityInfo.city;

      if (neighbourhood) {
        console.info('[api/catastro] Resolving neighbourhood', {
          city: cityInfo.city,
          neighbourhood
        });
        const areaBox = await fetchNeighbourhoodBoundingBox(cityInfo.city, neighbourhood);
        if (areaBox) {
          searchBoundingBox = areaBox;
          resolvedNeighbourhood = neighbourhood;
          console.info('[api/catastro] Neighbourhood bounding box applied', {
            neighbourhood,
            boundingBox: areaBox
          });
        } else {
          console.warn('[api/catastro] Neighbourhood not found, using city bounding box', {
            neighbourhood,
            city: cityInfo.city
          });
        }
      }
    }

    console.info('[api/catastro] Querying Catastro', {
      limit,
      boundingBox: searchBoundingBox
    });

    const { totalAvailable, points } = await queryCatastroParcels(searchBoundingBox, limit);

    const payload = {
      city: resolvedCity,
      neighbourhood: resolvedNeighbourhood,
      totalAvailable,
      returned: points.length,
      points,
      boundingBox: searchBoundingBox,
      areaLabel
    };

    const durationMs = Date.now() - startedAt;

    console.info('[api/catastro] Response ready', {
      city: payload.city,
      neighbourhood: payload.neighbourhood,
      returned: payload.returned,
      totalAvailable: payload.totalAvailable,
      boundingBox: payload.boundingBox,
      durationMs
    });

    return res.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No se pudo completar la búsqueda en Catastro';

    const durationMs = Date.now() - startedAt;

    console.error('[api/catastro] Error while resolving request', {
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
