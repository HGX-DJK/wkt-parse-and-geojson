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
  // 有小数则最多保留 15 位有效位，再去掉尾零
  if (v % 1 !== 0) {
    return parseFloat(v.toFixed(15)).toString();
  }
  return v.toFixed(0);
}

function positionToWkt(pos: Position): string {
  return pos.map(formatNumber).join(' ');
}

function coordsToWkt(coords: Position[]): string {
  return coords.map(positionToWkt).join(', ');
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
    return `POINT (${positionToWkt(geom.coordinates)})`;
  }

  private buildLineString(geom: LineString): string {
    if (geom.coordinates.length === 0) return 'LINESTRING EMPTY';
    return `LINESTRING (${coordsToWkt(geom.coordinates)})`;
  }

  private buildPolygon(geom: Polygon): string {
    if (geom.coordinates.length === 0) return 'POLYGON EMPTY';
    const rings = geom.coordinates.map(ring => `(${coordsToWkt(ring)})`).join(', ');
    return `POLYGON (${rings})`;
  }

  /**
   * 按 OGC/ISO WKT 标准，MULTIPOINT 每个点用括号包裹：
   * MULTIPOINT ((0 0), (1 1), (2 2))
   */
  private buildMultiPoint(geom: MultiPoint): string {
    if (geom.coordinates.length === 0) return 'MULTIPOINT EMPTY';
    const pts = geom.coordinates.map(p => `(${positionToWkt(p)})`).join(', ');
    return `MULTIPOINT (${pts})`;
  }

  private buildMultiLineString(geom: MultiLineString): string {
    if (geom.coordinates.length === 0) return 'MULTILINESTRING EMPTY';
    const lines = geom.coordinates.map(line => `(${coordsToWkt(line)})`).join(', ');
    return `MULTILINESTRING (${lines})`;
  }

  private buildMultiPolygon(geom: MultiPolygon): string {
    if (geom.coordinates.length === 0) return 'MULTIPOLYGON EMPTY';
    const polys = geom.coordinates.map(poly => {
      const rings = poly.map(ring => `(${coordsToWkt(ring)})`).join(', ');
      return `(${rings})`;
    }).join(', ');
    return `MULTIPOLYGON (${polys})`;
  }

  private buildGeometryCollection(geom: GeometryCollection): string {
    if (geom.geometries.length === 0) return 'GEOMETRYCOLLECTION EMPTY';
    const geoms = geom.geometries.map(g => this.build(g)).join(', ');
    return `GEOMETRYCOLLECTION (${geoms})`;
  }
}

/** 将 GeoJSON Geometry 对象转换为 WKT 字符串 */
export function build(geometry: Geometry): string {
  return new WKTBuilder().build(geometry);
}