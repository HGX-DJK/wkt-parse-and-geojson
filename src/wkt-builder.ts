import { Geometry, Position, Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon, GeometryCollection } from './types';

function positionToWkt(pos: Position): string {
  const vals = pos.map(v => v.toString());
  return vals.join(' ');
}

function coordsToWkt(coords: Position[]): string {
  return coords.map(pos => positionToWkt(pos)).join(', ');
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
    return `LINESTRING (${coordsToWkt(geom.coordinates)})`;
  }

  private buildPolygon(geom: Polygon): string {
    const rings = geom.coordinates.map(ring => `(${coordsToWkt(ring)})`).join(', ');
    return `POLYGON (${rings})`;
  }

  private buildMultiPoint(geom: MultiPoint): string {
    return `MULTIPOINT (${coordsToWkt(geom.coordinates)})`;
  }

  private buildMultiLineString(geom: MultiLineString): string {
    const lines = geom.coordinates.map(line => `(${coordsToWkt(line)})`).join(', ');
    return `MULTILINESTRING (${lines})`;
  }

  private buildMultiPolygon(geom: MultiPolygon): string {
    const polys = geom.coordinates.map(poly => {
      const rings = poly.map(ring => `(${coordsToWkt(ring)})`).join(', ');
      return `(${rings})`;
    }).join(', ');
    return `MULTIPOLYGON (${polys})`;
  }

  private buildGeometryCollection(geom: GeometryCollection): string {
    const geoms = geom.geometries.map(g => this.build(g)).join(', ');
    return `GEOMETRYCOLLECTION (${geoms})`;
  }
}

export function build(geometry: Geometry): string {
  return new WKTBuilder().build(geometry);
}