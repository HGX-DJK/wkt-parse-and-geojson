// WKT 命名空间 - 用于默认导出
import * as types from './types';
import { parse } from './wkt-parser';
import { build } from './wkt-builder';
import {
  createPoint,
  createLineString,
  createPolygon,
  createMultiPoint,
  createMultiLineString,
  createMultiPolygon,
  createGeometryCollection,
} from './geojson-builder';
import { wktToGeoJSON, wktToFeature, wktToFeatureCollection } from './wkt-to-geojson';
import { geojsonToWkt, featureToWkt, featureCollectionToWkt } from './geojson-to-wkt';
import { validateWKT, validateGeoJSON, tryFixWKT, cloneGeometry, geometryEquals } from './validate';

const WKT = {
  ...types,
  parse,
  build,
  createPoint,
  createLineString,
  createPolygon,
  createMultiPoint,
  createMultiLineString,
  createMultiPolygon,
  createGeometryCollection,
  wktToGeoJSON,
  wktToFeature,
  wktToFeatureCollection,
  geojsonToWkt,
  featureToWkt,
  featureCollectionToWkt,
  validateWKT,
  validateGeoJSON,
  tryFixWKT,
  cloneGeometry,
  geometryEquals,
};

export default WKT;