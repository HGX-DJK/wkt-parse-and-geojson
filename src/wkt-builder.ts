import {
  Geometry,
  Position,
  Point,
  LineString,
  Polygon,
  MultiPoint,
  MultiLineString,
  MultiPolygon,
  GeometryCollection,
} from './types';

/**
 * 将坐标数值格式化为字符串，避免科学计数法（WKT 不支持）。
 * 例：1e-7 → "0.0000001"，1.50000 → "1.5"，1.0 → "1"
 */
function formatNumber(v: number): string {
  if (v % 1 !== 0) {
    return Number(v.toFixed(15)).toString();
  }
  return String(v);
}

function positionToWkt(pos: Position): string {
  return pos.map(formatNumber).join(' ');
}

function coordsToWkt(coords: Position[]): string {
  return coords.map(positionToWkt).join(', ');
}

// 检查坐标是否包含 Z（3个分量）
function hasZ(coordinates: Position | Position[] | Position[][] | Position[][][]): boolean {
  if (!Array.isArray(coordinates)) return false;
  if (coordinates.length === 0) return false;

  const first = coordinates[0];

  // Point: coordinates[0] 是数字，不是数组
  if (typeof first === 'number') {
    return (coordinates as Position).length === 3;
  }

  // LineString/MultiPoint: coordinates[0] 是 Position（数字数组）
  if (Array.isArray(first) && typeof first[0] === 'number') {
    return (first as Position).length === 3;
  }

  // Polygon/MultiLineString: coordinates[0] 是 Position[]（线的数组）
  if (Array.isArray(first) && Array.isArray(first[0])) {
    const firstRing = (first as Position[]);
    return firstRing.length > 0 && (firstRing[0] as Position).length === 3;
  }

  return false;
}

// 获取 Z 后缀字符串
function zSuffix(coordinates: Position | Position[] | Position[][] | Position[][][]): string {
  return hasZ(coordinates) ? ' Z' : '';
}

export class WKTBuilder {
  build(geometry: Geometry): string {
    switch (geometry.type) {
      case 'Point':
        return this.buildPoint(geometry);
      case 'LineString':
        return this.buildLineString(geometry);
      case 'Polygon':
        return this.buildPolygon(geometry);
      case 'MultiPoint':
        return this.buildMultiPoint(geometry);
      case 'MultiLineString':
        return this.buildMultiLineString(geometry);
      case 'MultiPolygon':
        return this.buildMultiPolygon(geometry);
      case 'GeometryCollection':
        return this.buildGeometryCollection(geometry);
      default:
        throw new Error(`Unknown geometry type: ${(geometry as Geometry).type}`);
    }
  }

  private buildPoint(geom: Point): string {
    return `POINT${zSuffix(geom.coordinates)} (${positionToWkt(geom.coordinates)})`;
  }

  private buildLineString(geom: LineString): string {
    if (geom.coordinates.length === 0) return 'LINESTRING EMPTY';
    return `LINESTRING${zSuffix(geom.coordinates)} (${coordsToWkt(geom.coordinates)})`;
  }

  private buildPolygon(geom: Polygon): string {
    if (geom.coordinates.length === 0) return 'POLYGON EMPTY';
    const ringStr = geom.coordinates.map(ring => `(${coordsToWkt(ring)})`).join(', ');
    return `POLYGON${zSuffix(geom.coordinates)} (${ringStr})`;
  }

  /**
   * 按 OGC/ISO WKT 标准，MULTIPOINT 每个点用括号包裹：
   * MULTIPOINT ((0 0), (1 1), (2 2))
   */
  private buildMultiPoint(geom: MultiPoint): string {
    if (geom.coordinates.length === 0) return 'MULTIPOINT EMPTY';
    const pts = geom.coordinates.map(p => `(${positionToWkt(p)})`).join(', ');
    return `MULTIPOINT${zSuffix(geom.coordinates)} (${pts})`;
  }

  private buildMultiLineString(geom: MultiLineString): string {
    if (geom.coordinates.length === 0) return 'MULTILINESTRING EMPTY';
    const lines = geom.coordinates.map(line => `(${coordsToWkt(line)})`).join(', ');
    return `MULTILINESTRING${zSuffix(geom.coordinates)} (${lines})`;
  }

  private buildMultiPolygon(geom: MultiPolygon): string {
    if (geom.coordinates.length === 0) return 'MULTIPOLYGON EMPTY';
    const polys = geom.coordinates.map(poly => {
      const rings = poly.map(ring => `(${coordsToWkt(ring)})`).join(', ');
      return `(${rings})`;
    }).join(', ');
    return `MULTIPOLYGON${zSuffix(geom.coordinates)} (${polys})`;
  }

  private buildGeometryCollection(geom: GeometryCollection): string {
    if (geom.geometries.length === 0) return 'GEOMETRYCOLLECTION EMPTY';
    const geoms = geom.geometries.map(g => this.build(g)).join(', ');
    return `GEOMETRYCOLLECTION (${geoms})`;
  }
}

/** 将 GeoJSON Geometry 对象转换为 WKT 字符串 */
export function build(geometry: Geometry): string {
  return WKT_BUILDER.build(geometry);
}

// 单例实例，避免重复创建
const WKT_BUILDER = new WKTBuilder();