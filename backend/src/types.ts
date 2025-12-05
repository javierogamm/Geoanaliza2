export type BoundingBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type Point = {
  id: string;
  name: string | null;
  street: string | null;
  lat: number;
  lng: number;
  source: 'osm';
};

export type CityLocation = {
  city: string;
  displayName: string;
  boundingBox: BoundingBox;
};
