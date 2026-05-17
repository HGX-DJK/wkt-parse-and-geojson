import { Geometry, Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon, GeometryCollection } from './types';

export class GeoJSONBuilder {
  createPoint(x: number, y: number, z?: number): Point {
    return z !== undefined
      ? { type: 'Point', coordinates: [x, y, z] }
      : { type: 'Point', coordinates: [x, y] };
  }

  createLineString(coordinates: [number, number][]): LineString {
    return { type: 'LineString', coordinates };
  }

  createPolygon(coordinates: [number, number][][]): Polygon {
    return { type: 'Polygon', coordinates };
  }

  createMultiPoint(coordinates: [number, number][]): MultiPoint {
    return { type: 'MultiPoint', coordinates };
  }

  createMultiLineString(coordinates: [number, number][][]): MultiLineString {
    return { type: 'MultiLineString', coordinates };
  }

  createMultiPolygon(coordinates: [number, number][][][]): MultiPolygon {
    return { type: 'MultiPolygon', coordinates };
  }

  createGeometryCollection(geometries: Geometry[]): GeometryCollection {
    return { type: 'GeometryCollection', geometries };
  }
}

export function createPoint(x: number, y: number, z?: number): Point {
  return new GeoJSONBuilder().createPoint(x, y, z);
}

export function createLineString(coordinates: [number, number][]): LineString {
  return { type: 'LineString', coordinates };
}

export function createPolygon(coordinates: [number, number][][]): Polygon {
  return { type: 'Polygon', coordinates };
}

export function createMultiPoint(coordinates: [number, number][]): MultiPoint {
  return { type: 'MultiPoint', coordinates };
}

export function createMultiLineString(coordinates: [number, number][][]): MultiLineString {
  return { type: 'MultiLineString', coordinates };
}

export function createMultiPolygon(coordinates: [number, number][][][]): MultiPolygon {
  return { type: 'MultiPolygon', coordinates };
}

export function createGeometryCollection(geometries: Geometry[]): GeometryCollection {
  return new GeoJSONBuilder().createGeometryCollection(geometries);
}