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

// 默认导出命名空间（避免命名冲突）
// 使用方式: import WKT from 'wkt-parse-and-geojson';
export { default as WKT } from './namespace';