import type { Request, Response } from 'express';
import { fetchCityBoundingBox, fetchNeighbourhoodBoundingBox } from '../../backend/src/services/nominatim';
import { queryOverpassForNodes } from '../../backend/src/services/overpass';
import pointsRouter from '../../backend/src/routes/points';

jest.mock('../../backend/src/services/nominatim');
jest.mock('../../backend/src/services/overpass');

const mockedFetchCity = fetchCityBoundingBox as jest.MockedFunction<typeof fetchCityBoundingBox>;
const mockedFetchNeighbourhood = fetchNeighbourhoodBoundingBox as jest.MockedFunction<
  typeof fetchNeighbourhoodBoundingBox
>;
const mockedQueryOverpass =
  queryOverpassForNodes as jest.MockedFunction<typeof queryOverpassForNodes>;

const getRouteHandler = () => {
  const stack = (pointsRouter as unknown as { stack: any[] }).stack;
  const layer = stack.find((item) => item.route?.path === '/' && item.route?.methods?.get);
  if (!layer) {
    throw new Error('No se encontró la ruta GET / en pointsRouter');
  }
  return layer.route.stack[0].handle as (req: Request, res: Response) => Promise<void>;
};

const createMockRes = () => {
  const res: Partial<Response> & { body?: any; statusCode?: number } = {};
  res.statusCode = 200;
  res.status = ((code: number) => {
    res.statusCode = code;
    return res as Response;
  }) as Response['status'];
  res.json = ((payload: any) => {
    res.body = payload;
    return res as Response;
  }) as Response['json'];
  return res as Response & { body?: any; statusCode: number };
};

describe('routes /api/points', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('valida que city sea obligatorio', async () => {
    const handler = getRouteHandler();
    const req = { query: {} } as unknown as Request;
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body?.error).toMatch(/city es obligatorio/i);
  });

  it('devuelve puntos usando bounding box de ciudad cuando no hay barrio', async () => {
    mockedFetchCity.mockResolvedValue({
      city: 'Zaragoza',
      displayName: 'Zaragoza, España',
      boundingBox: { south: 41, west: -1.2, north: 42, east: -0.7 }
    });
    mockedFetchNeighbourhood.mockResolvedValue(null);
    mockedQueryOverpass.mockResolvedValue({
      totalAvailable: 2,
      points: [
        { id: 'node/1', name: 'Parque', street: 'Calle 1', lat: 41.1, lng: -0.9, source: 'osm' },
        { id: 'node/2', name: 'Plaza', street: 'Calle 2', lat: 41.2, lng: -0.8, source: 'osm' }
      ]
    });

    const handler = getRouteHandler();
    const req = { query: { city: 'Zaragoza', limit: '2' } } as unknown as Request;
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.city).toBe('Zaragoza');
    expect(res.body.neighbourhood).toBeNull();
    expect(res.body.returned).toBe(2);
    expect(res.body.points).toHaveLength(2);
  });
});
