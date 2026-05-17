import { Position, Geometry, Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon, GeometryCollection } from './types';

type TokenType = 'WORD' | 'NUMBER' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'EOF';

interface Token {
  type: TokenType;
  value: string;
}

class Lexer {
  private pos = 0;
  private input: string;

  constructor(input: string) {
    this.input = input.trim();
  }

  private peek(): string {
    return this.input[this.pos] || '';
  }

  private advance(): string {
    return this.input[this.pos++] || '';
  }

  private isWhitespace(c: string): boolean {
    return /\s/.test(c);
  }

  private isDigit(c: string): boolean {
    return /[0-9]/.test(c) || c === '-' || c === '.';
  }

  nextToken(): Token {
    while (this.pos < this.input.length && this.isWhitespace(this.peek())) {
      this.advance();
    }

    if (this.pos >= this.input.length) {
      return { type: 'EOF', value: '' };
    }

    const c = this.peek();

    if (c === '(') {
      this.advance();
      return { type: 'LPAREN', value: '(' };
    }
    if (c === ')') {
      this.advance();
      return { type: 'RPAREN', value: ')' };
    }
    if (c === ',') {
      this.advance();
      return { type: 'COMMA', value: ',' };
    }
    if (this.isDigit(c)) {
      let num = '';
      while (this.pos < this.input.length && this.isDigit(this.peek())) {
        num += this.advance();
      }
      return { type: 'NUMBER', value: num };
    }

    let word = '';
    while (this.pos < this.input.length && /[a-zA-Z_]/.test(this.peek())) {
      word += this.advance();
    }
    return { type: 'WORD', value: word.toUpperCase() };
  }
}

export class WKTParser {
  private tokens: Token[] = [];
  private pos = 0;

  parse(wkt: string): Geometry {
    this.tokens = [];
    this.pos = 0;

    const lexer = new Lexer(wkt);
    let token = lexer.nextToken();
    while (token.type !== 'EOF') {
      this.tokens.push(token);
      token = lexer.nextToken();
    }
    this.tokens.push({ type: 'EOF', value: '' });

    return this.parseGeometry();
  }

  private peek(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '' };
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private parseGeometry(): Geometry {
    const token = this.peek();
    if (token.type !== 'WORD') {
      throw new Error(`Expected geometry type, got: ${token.value}`);
    }

    switch (token.value) {
      case 'POINT':
        return this.parsePoint();
      case 'LINESTRING':
        return this.parseLineString();
      case 'POLYGON':
        return this.parsePolygon();
      case 'MULTIPOINT':
        return this.parseMultiPoint();
      case 'MULTILINESTRING':
        return this.parseMultiLineString();
      case 'MULTIPOLYGON':
        return this.parseMultiPolygon();
      case 'GEOMETRYCOLLECTION':
        return this.parseGeometryCollection();
      default:
        throw new Error(`Unknown geometry type: ${token.value}`);
    }
  }

  private parsePoint(): Point {
    this.advance(); // consume POINT
    const coords = this.parseCoordinateList(2);
    return { type: 'Point', coordinates: coords[0] };
  }

  private parseLineString(): LineString {
    this.advance(); // consume LINESTRING
    const coords = this.parseCoordinateList(-1);
    return { type: 'LineString', coordinates: coords };
  }

  private parsePolygon(): Polygon {
    this.advance(); // consume POLYGON
    const rings = this.parseCoordinateListList();
    return { type: 'Polygon', coordinates: rings };
  }

  private parseMultiPoint(): MultiPoint {
    this.advance(); // consume MULTIPOINT
    const coords = this.parseCoordinateList(-1);
    return { type: 'MultiPoint', coordinates: coords };
  }

  private parseMultiLineString(): MultiLineString {
    this.advance(); // consume MULTILINESTRING
    const lines = this.parseCoordinateListList();
    return { type: 'MultiLineString', coordinates: lines };
  }

  private parseMultiPolygon(): MultiPolygon {
    this.advance(); // consume MULTIPOLYGON
    const polys = this.parseCoordinateListListList();
    return { type: 'MultiPolygon', coordinates: polys };
  }

  private parseGeometryCollection(): GeometryCollection {
    this.advance(); // consume GEOMETRYCOLLECTION
    const token = this.peek();
    if (token.type !== 'LPAREN') {
      return { type: 'GeometryCollection', geometries: [] };
    }
    this.advance(); // consume (
    const geometries: Geometry[] = [];

    while (this.peek().type !== 'RPAREN') {
      geometries.push(this.parseGeometry());
      if (this.peek().type === 'COMMA') {
        this.advance();
      }
    }
    this.advance(); // consume )

    return { type: 'GeometryCollection', geometries };
  }

  private parseCoordinateList(dimensions: number): Position[] {
    const token = this.peek();
    if (token.type === 'LPAREN') {
      this.advance();
      const coords: Position[] = [];
      while (this.peek().type !== 'RPAREN') {
        coords.push(this.parseCoordinates(dimensions));
        if (this.peek().type === 'COMMA') {
          this.advance();
        }
      }
      this.expect('RPAREN');
      this.advance();
      return coords;
    }
    return [this.parseCoordinates(dimensions)];
  }

  private parseCoordinates(dimensions: number): Position {
    const nums: number[] = [];
    while (nums.length < (dimensions > 0 ? dimensions : 2)) {
      const token = this.expect('NUMBER');
      nums.push(parseFloat(token.value));
    }
    return nums as Position;
  }

  private parseCoordinateListList(): Position[][] {
    const token = this.peek();
    if (token.type !== 'LPAREN') {
      return [];
    }
    this.advance(); // consume (

    const lists: Position[][] = [];
    while (this.peek().type !== 'RPAREN') {
      lists.push(this.parseCoordinateList(2));
      if (this.peek().type === 'COMMA') {
        this.advance();
      }
    }
    this.advance(); // consume )
    return lists;
  }

  private parseCoordinateListListList(): Position[][][] {
    const token = this.peek();
    if (token.type !== 'LPAREN') {
      return [];
    }
    this.advance(); // consume (

    const lists: Position[][][] = [];
    while (this.peek().type !== 'RPAREN') {
      lists.push(this.parseCoordinateListList());
      if (this.peek().type === 'COMMA') {
        this.advance();
      }
    }
    this.advance(); // consume )
    return lists;
  }

  private expect(type: string): Token {
    const token = this.peek();
    if (token.type === type) {
      return token;
    }
    throw new Error(`Expected ${type}, got ${token.type}: ${token.value}`);
  }
}

export function parse(wkt: string): Geometry {
  return new WKTParser().parse(wkt);
}