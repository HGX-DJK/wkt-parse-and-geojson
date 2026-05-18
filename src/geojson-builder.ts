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

// ─── 内部工具：判断是否为 Position（[number, number] 或 [number, number, number]）
function isPosition(v: unknown): v is Position {
  return (
    Array.isArray(v) &&
    (v.length === 2 || v.length === 3) &&
    v.every((n) => typeof n === 'number')
  );
}

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

  /**
   * 创建 Polygon。
   * - 传入 `Position[]`：视为单个外环，自动包装为 `[ring]`
   * - 传入 `Position[][]`：视为完整的环列表（外环 + 内环/空洞）
   */
  createPolygon(coordinates: Position[] | Position[][]): Polygon {
    const rings = isPosition(coordinates[0])
      ? [coordinates as Position[]]   // 单环：Position[] → Position[][]
      : (coordinates as Position[][]); // 多环：已是 Position[][]
    return { type: 'Polygon', coordinates: rings };
  }

  /**
   * 创建 MultiPoint。
   * - 传入 `Position`：视为单个点，自动包装为 `[point]`
   * - 传入 `Position[]`：视为多个点
   */
  createMultiPoint(coordinates: Position | Position[]): MultiPoint {
    const pts = isPosition(coordinates)
      ? [coordinates]               // 单点：Position → Position[]
      : (coordinates as Position[]); // 多点：已是 Position[]
    return { type: 'MultiPoint', coordinates: pts };
  }

  /**
   * 创建 MultiLineString。
   * - 传入 `Position[]`：视为单条线，自动包装为 `[line]`
   * - 传入 `Position[][]`：视为多条线
   */
  createMultiLineString(coordinates: Position[] | Position[][]): MultiLineString {
    const lines = isPosition(coordinates[0])
      ? [coordinates as Position[]]   // 单线：Position[] → Position[][]
      : (coordinates as Position[][]); // 多线：已是 Position[][]
    return { type: 'MultiLineString', coordinates: lines };
  }

  /**
   * 创建 MultiPolygon。
   * - 传入 `Position[][]`：视为单个多边形（环列表），自动包装为 `[polygon]`
   * - 传入 `Position[][][]`：视为多个多边形
   */
  createMultiPolygon(coordinates: Position[][] | Position[][][]): MultiPolygon {
    // 判断：若第一个元素是 Position[]（环），则整体是单个 polygon
    const firstElem = coordinates[0];
    const isSinglePolygon =
      Array.isArray(firstElem) && Array.isArray(firstElem[0]) && isPosition(firstElem[0]);
    const polys = isSinglePolygon
      ? [coordinates as Position[][]]    // 单多边形：Position[][] → Position[][][]
      : (coordinates as Position[][][]); // 多多边形：已是 Position[][][]
    return { type: 'MultiPolygon', coordinates: polys };
  }

  /**
   * 创建 GeometryCollection。
   * - 传入单个 `Geometry`：自动包装为 `[geometry]`
   * - 传入 `Geometry[]`：直接使用
   */
  createGeometryCollection(geometries: Geometry | Geometry[]): GeometryCollection {
    const geoms = Array.isArray(geometries) ? geometries : [geometries];
    return { type: 'GeometryCollection', geometries: geoms };
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

/**
 * 创建 Polygon。
 * - 传入 `Position[]`：单个外环，自动包装
 * - 传入 `Position[][]`：外环 + 内环（空洞）
 *
 * @example
 * createPolygon([[0,0],[1,0],[1,1],[0,1],[0,0]])
 * createPolygon([[[0,0],[10,0],[10,10],[0,10],[0,0]], [[2,2],[4,2],[4,4],[2,4],[2,2]]])
 */
export function createPolygon(coordinates: Position[] | Position[][]): Polygon {
  return _builder.createPolygon(coordinates);
}

/**
 * 创建 MultiPoint。
 * - 传入 `Position`：单个点
 * - 传入 `Position[]`：多个点
 *
 * @example
 * createMultiPoint([0, 0])
 * createMultiPoint([[0,0],[1,1],[2,2]])
 */
export function createMultiPoint(coordinates: Position | Position[]): MultiPoint {
  return _builder.createMultiPoint(coordinates);
}

/**
 * 创建 MultiLineString。
 * - 传入 `Position[]`：单条线
 * - 传入 `Position[][]`：多条线
 *
 * @example
 * createMultiLineString([[0,0],[1,1]])
 * createMultiLineString([[[0,0],[1,1]], [[2,2],[3,3]]])
 */
export function createMultiLineString(coordinates: Position[] | Position[][]): MultiLineString {
  return _builder.createMultiLineString(coordinates);
}

/**
 * 创建 MultiPolygon。
 * - 传入 `Position[][]`：单个多边形（环列表）
 * - 传入 `Position[][][]`：多个多边形
 *
 * @example
 * createMultiPolygon([[[0,0],[1,0],[1,1],[0,1],[0,0]]])
 * createMultiPolygon([[[[0,0],[1,0],[1,1],[0,1],[0,0]]], [[[2,2],[3,2],[3,3],[2,3],[2,2]]]])
 */
export function createMultiPolygon(coordinates: Position[][] | Position[][][]): MultiPolygon {
  return _builder.createMultiPolygon(coordinates);
}

/**
 * 创建 GeometryCollection。
 * - 传入单个 `Geometry`：自动包装
 * - 传入 `Geometry[]`：直接使用
 *
 * @example
 * createGeometryCollection(createPoint(0, 0))
 * createGeometryCollection([createPoint(0,0), createLineString([[0,0],[1,1]])])
 */
export function createGeometryCollection(geometries: Geometry | Geometry[]): GeometryCollection {
  return _builder.createGeometryCollection(geometries);
}