import { Router } from 'express';
import { searchLocation } from '../services/nominatim';

const router = Router();

router.get('/', async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';

  if (!query) {
    return res.status(400).json({ error: 'Indica una localidad para buscar en el mapa.' });
  }

  try {
    const location = await searchLocation(query);
    return res.json(location);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo localizar la zona indicada';
    return res.status(500).json({ error: message });
  }
});

export default router;
