import { queryOverpassForNodes } from '../../backend/src/services/overpass';
import fetch from '../../backend/src/utils/fetch';

jest.mock('../../backend/src/utils/fetch', () => {
  const original = jest.requireActual('../../backend/src/utils/fetch');
  return {
    __esModule: true,
    default: jest.fn(),
    withUserAgent: original.withUserAgent
  };
});

const mockedFetch = fetch as unknown as jest.Mock;

describe('services/overpass', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('transforma elementos de Overpass a puntos con límite', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        elements: [
          { type: 'node', id: 1, lat: 41.1, lon: -0.1, tags: { name: 'Parque', 'addr:street': 'Calle 1', 'addr:housenumber': '5' } },
          {
            type: 'way',
            id: 2,
            center: { lat: 41.3, lon: -0.3 },
            tags: { name: 'Biblioteca', 'addr:full': 'Avenida Principal 10' }
          },
          { type: 'node', id: 3, lat: 41.2, lon: -0.2, tags: { name: 'Plaza' } }
        ]
      })
    });

    const { totalAvailable, points } = await queryOverpassForNodes(
      { south: 40.9, west: -0.5, north: 41.5, east: 0.1 },
      2
    );

    expect(totalAvailable).toBe(2);
    expect(points).toHaveLength(2);
    expect(points[0].street).toMatch(/Calle 1 5/);
    expect(points.some((p) => p.id === 'way/2' && p.street === 'Avenida Principal 10')).toBe(true);
    expect(points[0].source).toBe('osm');

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.stringContaining('overpass-api.de'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'User-Agent': expect.any(String)
        })
      })
    );
  });
});
