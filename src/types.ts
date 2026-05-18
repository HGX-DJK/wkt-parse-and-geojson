export type Position = [number, number] | [number, number, number];

export interface Point {
  type: 'Point';
  coordinates: Position;
}

export interface LineString {
  type: 'LineString';
  coordinates: Position[];
}

export interface Polygon {
  type: 'Polygon';
  coordinates: Position[][];
}

export interface MultiPoint {
  type: 'MultiPoint';
  coordinates: Position[];
}

export interface MultiLineString {
  type: 'MultiLineString';
  coordinates: Position[][];
}

export interface MultiPolygon {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}

export interface GeometryCollection {
  type: 'GeometryCollection';
  geometries: Geometry[];
}

export type Geometry =
  | Point
  | LineString
  | Polygon
  | MultiPoint
  | MultiLineString
  | MultiPolygon
  | GeometryCollection;

/** GeoJSON Feature，包含一个 Geometry 和任意属性 */
export interface Feature<G extends Geometry = Geometry> {
  type: 'Feature';
  geometry: G | null;
  properties: Record<string, unknown> | null;
  id?: string | number;
}

/** GeoJSON FeatureCollection，包含多个 Feature */
export interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

/** 所有 GeoJSON 对象的联合类型 */
export type GeoJSONObject = Geometry | Feature | FeatureCollection;

/**
 * @deprecated 请使用 `GeoJSONObject`（包含 Geometry、Feature、FeatureCollection）
 *             或直接使用 `Geometry` 类型（仅几何体）。
 *             此别名保留用于向后兼容。
 */
export type GeoJSON = GeoJSONObject;

export type WKTType =
  | 'POINT'
  | 'LINESTRING'
  | 'POLYGON'
  | 'MULTIPOINT'
  | 'MULTILINESTRING'
  | 'MULTIPOLYGON'
  | 'GEOMETRYCOLLECTION';