import { Geometry, Feature, FeatureCollection } from './types';
import { parse } from './wkt-parser';

/**
 * 将 WKT 字符串转换为 GeoJSON Geometry 对象。
 *
 * @example
 * wktToGeoJSON('POINT (30.5 40.5)')
 * // → { type: 'Point', coordinates: [30.5, 40.5] }
 *
 * wktToGeoJSON('POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))')
 * // → { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] }
 */
export function wktToGeoJSON(wkt: string): Geometry {
  return parse(wkt);
}

/**
 * 将 WKT 字符串转换为 GeoJSON Feature 对象。
 *
 * @param wkt       WKT 字符串
 * @param properties 可选的 Feature 属性对象
 * @param id         可选的 Feature ID
 *
 * @example
 * wktToFeature('POINT (30.5 40.5)', { name: '北京' })
 * // → { type: 'Feature', geometry: { type: 'Point', ... }, properties: { name: '北京' } }
 */
export function wktToFeature(
  wkt: string,
  properties: Record<string, unknown> | null = null,
  id?: string | number,
): Feature {
  const geometry = parse(wkt);
  const feature: Feature = {
    type: 'Feature',
    geometry,
    properties,
  };
  if (id !== undefined) {
    feature.id = id;
  }
  return feature;
}

/**
 * 将多个 WKT 字符串批量转换为 GeoJSON FeatureCollection。
 *
 * @param wkts        WKT 字符串数组
 * @param properties  可选，每个 Feature 的属性数组（长度应与 wkts 一致）
 *
 * @example
 * wktToFeatureCollection(['POINT (0 0)', 'POINT (1 1)'])
 * // → { type: 'FeatureCollection', features: [...] }
 */
export function wktToFeatureCollection(
  wkts: string[],
  properties?: Array<Record<string, unknown> | null>,
): FeatureCollection {
  const features: Feature[] = wkts.map((wkt, i) =>
    wktToFeature(wkt, properties ? (properties[i] ?? null) : null),
  );
  return { type: 'FeatureCollection', features };
}
