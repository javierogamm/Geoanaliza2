export type BoundingBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type PointSource = 'osm' | 'catastro';

export type Point = {
  id: string;
  name: string | null;
  street: string | null;
  lat: number;
  lng: number;
  source: PointSource;
};

export type CityLocation = {
  city: string;
  displayName: string;
  boundingBox: BoundingBox;
};

export type SearchLocation = {
  name: string;
  boundingBox: BoundingBox;
  center: {
    lat: number;
    lng: number;
  };
};
