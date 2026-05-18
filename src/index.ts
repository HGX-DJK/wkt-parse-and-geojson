// 类型定义
export * from './types';

// WKT 解析 & 构建
export { parse, WKTParser } from './wkt-parser';
export { build, WKTBuilder } from './wkt-builder';

// GeoJSON 工厂方法
export {
  createPoint,
  createLineString,
  createPolygon,
  createMultiPoint,
  createMultiLineString,
  createMultiPolygon,
  createGeometryCollection,
  GeoJSONBuilder,
} from './geojson-builder';

// WKT → GeoJSON 互转
export { wktToGeoJSON, wktToFeature, wktToFeatureCollection } from './wkt-to-geojson';

// GeoJSON → WKT 互转
export { geojsonToWkt, featureToWkt, featureCollectionToWkt } from './geojson-to-wkt';

// 校验工具
export {
  validateWKT,
  validateGeoJSON,
  tryFixWKT,
  cloneGeometry,
  geometryEquals,
  type ValidationResult,
} from './validate';