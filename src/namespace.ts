// 命名空间导出 - 所有公共 API 汇总
// 使用方式: import WKT from 'wkt-parse-and-geojson';
//          WKT.parse(...), WKT.build(...), etc.

import * as types from './types';
import * as wktParser from './wkt-parser';
import * as wktBuilder from './wkt-builder';
import * as geojsonBuilder from './geojson-builder';
import * as wktToGeojson from './wkt-to-geojson';
import * as geojsonToWkt from './geojson-to-wkt';
import * as validate from './validate';

const WKT = {
  ...types,
  ...wktParser,
  ...wktBuilder,
  ...geojsonBuilder,
  ...wktToGeojson,
  ...geojsonToWkt,
  ...validate,
};

export default WKT;