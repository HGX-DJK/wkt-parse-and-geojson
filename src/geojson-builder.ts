import {
  Position,
  Geometry,
  Point,
  LineString,
  Polygon,
  MultiPoint,
  MultiLineString,
  MultiPolygon,
  GeometryCollection,
} from './types';

/**
 * GeoJSON 几何对象构建器（类形式，方便组合使用）
 */
export class GeoJSONBuilder {
  createPoint(x: number, y: number, z?: number): Point {
    return z !== undefined
      ? { type: 'Point', coordinates: [x, y, z] }
      : { type: 'Point', coordinates: [x, y] };
  }

  createLineString(coordinates: Position[]): LineString {
    return { type: 'LineString', coordinates };
  }

  createPolygon(coordinates: Position[][]): Polygon {
    return { type: 'Polygon', coordinates };
  }

  createMultiPoint(coordinates: Position[]): MultiPoint {
    return { type: 'MultiPoint', coordinates };
  }

  createMultiLineString(coordinates: Position[][]): MultiLineString {
    return { type: 'MultiLineString', coordinates };
  }

  createMultiPolygon(coordinates: Position[][][]): MultiPolygon {
    return { type: 'MultiPolygon', coordinates };
  }

  createGeometryCollection(geometries: Geometry[]): GeometryCollection {
    return { type: 'GeometryCollection', geometries };
  }
}

// 单例，避免重复实例化
const _builder = new GeoJSONBuilder();

/** 创建 Point */
export function createPoint(x: number, y: number, z?: number): Point {
  return _builder.createPoint(x, y, z);
}

/** 创建 LineString */
export function createLineString(coordinates: Position[]): LineString {
  return _builder.createLineString(coordinates);
}

/** 创建 Polygon（第一个环为外环，后续为内环/空洞） */
export function createPolygon(coordinates: Position[][]): Polygon {
  return _builder.createPolygon(coordinates);
}

/** 创建 MultiPoint */
export function createMultiPoint(coordinates: Position[]): MultiPoint {
  return _builder.createMultiPoint(coordinates);
}

/** 创建 MultiLineString */
export function createMultiLineString(coordinates: Position[][]): MultiLineString {
  return _builder.createMultiLineString(coordinates);
}

/** 创建 MultiPolygon */
export function createMultiPolygon(coordinates: Position[][][]): MultiPolygon {
  return _builder.createMultiPolygon(coordinates);
}

/** 创建 GeometryCollection */
export function createGeometryCollection(geometries: Geometry[]): GeometryCollection {
  return _builder.createGeometryCollection(geometries);
}