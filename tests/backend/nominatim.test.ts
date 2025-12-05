import { fetchCityBoundingBox, fetchNeighbourhoodBoundingBox } from '../../backend/src/services/nominatim';
import fetch, { withUserAgent } from '../../backend/src/utils/fetch';

jest.mock('../../backend/src/utils/fetch', () => {
  const original = jest.requireActual('../../backend/src/utils/fetch');
  return {
    __esModule: true,
    default: jest.fn(),
    withUserAgent: original.withUserAgent
  };
});

const mockedFetch = fetch as unknown as jest.Mock;

describe('services/nominatim', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('devuelve bounding box y nombre de ciudad', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          display_name: 'Zaragoza, España',
          lat: '41.6532',
          lon: '-0.8903',
          boundingbox: ['41.0', '42.0', '-1.2', '-0.7'],
          address: { city: 'Zaragoza' }
        }
      ]
    });

    const result = await fetchCityBoundingBox('Zaragoza');

    expect(result.city).toBe('Zaragoza');
    expect(result.boundingBox).toEqual({
      south: 41,
      north: 42,
      west: -1.2,
      east: -0.7
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      expect.stringContaining('Zaragoza'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': expect.any(String)
        })
      })
    );
  });

  it('retorna null si no encuentra barrio', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => []
    });

    const bbox = await fetchNeighbourhoodBoundingBox('Zaragoza', 'Barrio inventado');
    expect(bbox).toBeNull();
  });
});
