import { Geometry, Feature, FeatureCollection } from './types';
import { build } from './wkt-builder';

/**
 * 将 GeoJSON Geometry 对象转换为 WKT 字符串。
 *
 * @example
 * geojsonToWkt({ type: 'Point', coordinates: [30.5, 40.5] })
 * // → 'POINT (30.5 40.5)'
 *
 * geojsonToWkt({ type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] })
 * // → 'POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))'
 */
export function geojsonToWkt(geojson: Geometry): string {
  return build(geojson);
}

/**
 * 将 GeoJSON Feature 对象转换为 WKT 字符串（取 geometry 部分）。
 *
 * @throws 若 Feature.geometry 为 null，则抛出错误
 *
 * @example
 * featureToWkt({ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: null })
 * // → 'POINT (0 0)'
 */
export function featureToWkt(feature: Feature): string {
  if (!feature.geometry) {
    throw new Error('Feature.geometry is null, cannot convert to WKT');
  }
  return build(feature.geometry);
}

/**
 * 将 GeoJSON FeatureCollection 中所有 Feature 转换为 WKT 字符串数组。
 *
 * geometry 为 null 的 Feature 会被跳过（返回数组中对应位置为 null）。
 *
 * @example
 * featureCollectionToWkt({ type: 'FeatureCollection', features: [...] })
 * // → ['POINT (0 0)', 'LINESTRING (0 0, 1 1)', ...]
 */
export function featureCollectionToWkt(fc: FeatureCollection): Array<string | null> {
  return fc.features.map((f) => {
    if (!f.geometry) return null;
    return build(f.geometry);
  });
}
