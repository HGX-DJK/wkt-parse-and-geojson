import {
  Position,
  Geometry,
  Point,
  LineString,
  Polygon,
  MultiPoint,
  MultiLineString,
  MultiPolygon,
  GeometryCollection,
} from './types';

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

  /** 数字开头字符：数字 或 负号 */
  private isNumberStart(c: string): boolean {
    return /[0-9\-]/.test(c);
  }

  private isNumberBody(c: string): boolean {
    return /[0-9\.\-eE\+]/.test(c);
  }

  nextToken(): Token {
    // skip whitespace
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

    // Number: starts with digit or minus
    if (this.isNumberStart(c)) {
      let num = '';
      while (this.pos < this.input.length && this.isNumberBody(this.peek())) {
        num += this.advance();
      }
      return { type: 'NUMBER', value: num };
    }

    // Word (geometry type or EMPTY/Z/M keyword)
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

    const geometry = this.parseGeometry();

    // 校验尾部无多余字符（防止静默忽略垃圾输入）
    if (this.peek().type !== 'EOF') {
      throw new Error(
        `Unexpected trailing token after geometry: "${this.peek().value}"`,
      );
    }

    return geometry;
  }

  private peek(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '' };
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  /** 消费当前 token 并返回，若类型不匹配则抛出错误 */
  private consume(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new Error(`Expected ${type}, got ${token.type}: "${token.value}"`);
    }
    return this.advance();
  }

  private parseGeometry(): Geometry {
    const token = this.peek();
    if (token.type !== 'WORD') {
      throw new Error(`Expected geometry type keyword, got: "${token.value}"`);
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

  // ── 消费可选的维度修饰符（Z / M / ZM）
  private skipDimensionKeyword(): void {
    const t = this.peek();
    if (t.type === 'WORD' && (t.value === 'Z' || t.value === 'M' || t.value === 'ZM')) {
      this.advance();
    }
  }

  // ── 判断并消费 EMPTY 关键字
  private isEmptyGeometry(): boolean {
    const t = this.peek();
    if (t.type === 'WORD' && t.value === 'EMPTY') {
      this.advance();
      return true;
    }
    return false;
  }

  // ── POINT ────────────────────────────────────────────────────────
  private parsePoint(): Point {
    this.advance(); // consume POINT
    this.skipDimensionKeyword();
    if (this.isEmptyGeometry()) {
      // GeoJSON 无法表示空点：POINT EMPTY 在 GeoJSON 中应用 null geometry Feature，
      // 此处直接抛出，由调用方决定如何处理。
      throw new Error(
        'POINT EMPTY cannot be represented as a GeoJSON Point. ' +
        'Consider using wktToFeature() and checking Feature.geometry === null.',
      );
    }
    this.consume('LPAREN');
    const coords = this.parseCoordinates();
    this.consume('RPAREN');
    return { type: 'Point', coordinates: coords };
  }

  // ── LINESTRING ───────────────────────────────────────────────────
  private parseLineString(): LineString {
    this.advance(); // consume LINESTRING
    this.skipDimensionKeyword();
    if (this.isEmptyGeometry()) {
      return { type: 'LineString', coordinates: [] };
    }
    const coords = this.parseCoordinatesList();
    return { type: 'LineString', coordinates: coords };
  }

  // ── POLYGON ──────────────────────────────────────────────────────
  private parsePolygon(): Polygon {
    this.advance(); // consume POLYGON
    this.skipDimensionKeyword();
    if (this.isEmptyGeometry()) {
      return { type: 'Polygon', coordinates: [] };
    }
    const rings = this.parseCoordinateListList();
    return { type: 'Polygon', coordinates: rings };
  }

  // ── MULTIPOINT ───────────────────────────────────────────────────
  private parseMultiPoint(): MultiPoint {
    this.advance(); // consume MULTIPOINT
    this.skipDimensionKeyword();
    if (this.isEmptyGeometry() || this.peek().type !== 'LPAREN') {
      return { type: 'MultiPoint', coordinates: [] };
    }
    this.advance(); // consume outer (

    const coords: Position[] = [];
    while (this.peek().type !== 'RPAREN' && this.peek().type !== 'EOF') {
      if (this.peek().type === 'LPAREN') {
        // 标准写法: MULTIPOINT ((x y), (x y))
        this.advance(); // consume (
        coords.push(this.parseCoordinates());
        this.consume('RPAREN');
      } else {
        // 非标准写法: MULTIPOINT (x y, x y)
        coords.push(this.parseCoordinates());
      }
      if (this.peek().type === 'COMMA') {
        this.advance();
      }
    }
    this.consume('RPAREN');
    return { type: 'MultiPoint', coordinates: coords };
  }

  // ── MULTILINESTRING ──────────────────────────────────────────────
  private parseMultiLineString(): MultiLineString {
    this.advance(); // consume MULTILINESTRING
    this.skipDimensionKeyword();
    if (this.isEmptyGeometry() || this.peek().type !== 'LPAREN') {
      return { type: 'MultiLineString', coordinates: [] };
    }
    this.advance(); // consume outer (
    const lines: Position[][] = [];
    while (this.peek().type !== 'RPAREN' && this.peek().type !== 'EOF') {
      lines.push(this.parseCoordinatesList());
      if (this.peek().type === 'COMMA') {
        this.advance();
      }
    }
    this.consume('RPAREN');
    return { type: 'MultiLineString', coordinates: lines };
  }

  // ── MULTIPOLYGON ─────────────────────────────────────────────────
  private parseMultiPolygon(): MultiPolygon {
    this.advance(); // consume MULTIPOLYGON
    this.skipDimensionKeyword();
    if (this.isEmptyGeometry()) {
      return { type: 'MultiPolygon', coordinates: [] };
    }
    const polys = this.parseCoordinateListListList();
    return { type: 'MultiPolygon', coordinates: polys };
  }

  // ── GEOMETRYCOLLECTION ───────────────────────────────────────────
  private parseGeometryCollection(): GeometryCollection {
    this.advance(); // consume GEOMETRYCOLLECTION
    this.skipDimensionKeyword();
    if (this.isEmptyGeometry() || this.peek().type !== 'LPAREN') {
      return { type: 'GeometryCollection', geometries: [] };
    }
    this.advance(); // consume (
    const geometries: Geometry[] = [];

    while (this.peek().type !== 'RPAREN' && this.peek().type !== 'EOF') {
      geometries.push(this.parseGeometry());
      if (this.peek().type === 'COMMA') {
        this.advance();
      }
    }
    this.consume('RPAREN');
    return { type: 'GeometryCollection', geometries };
  }

  // ── 坐标解析辅助方法 ──────────────────────────────────────────────

  /**
   * 读取一个坐标点（自动检测维度：X Y 或 X Y Z）
   * 读完 X、Y 后，若下一个 token 仍是 NUMBER，则继续读 Z
   */
  private parseCoordinates(): Position {
    const xStr = this.consume('NUMBER').value;
    const yStr = this.consume('NUMBER').value;
    const x = parseFloat(xStr);
    const y = parseFloat(yStr);
    if (isNaN(x)) throw new Error(`Invalid coordinate value: "${xStr}"`);
    if (isNaN(y)) throw new Error(`Invalid coordinate value: "${yStr}"`);
    // 动态检测 Z 坐标
    if (this.peek().type === 'NUMBER') {
      const zStr = this.advance().value;
      const z = parseFloat(zStr);
      if (isNaN(z)) throw new Error(`Invalid coordinate value: "${zStr}"`);
      return [x, y, z];
    }
    return [x, y];
  }

  /** 解析带括号的坐标序列：( x y, x y, ... ) */
  private parseCoordinatesList(): Position[] {
    this.consume('LPAREN');
    const coords: Position[] = [];
    while (this.peek().type !== 'RPAREN' && this.peek().type !== 'EOF') {
      coords.push(this.parseCoordinates());
      if (this.peek().type === 'COMMA') {
        this.advance();
      }
    }
    this.consume('RPAREN');
    return coords;
  }

  /** 解析环列表（Polygon 级别）：( (...), (...) ) */
  private parseCoordinateListList(): Position[][] {
    if (this.peek().type !== 'LPAREN') return [];
    this.advance(); // consume outer (
    const lists: Position[][] = [];
    while (this.peek().type !== 'RPAREN' && this.peek().type !== 'EOF') {
      lists.push(this.parseCoordinatesList());
      if (this.peek().type === 'COMMA') {
        this.advance();
      }
    }
    this.consume('RPAREN');
    return lists;
  }

  /** 解析多边形列表（MultiPolygon 级别）：( ((...)), ((...)) ) */
  private parseCoordinateListListList(): Position[][][] {
    if (this.peek().type !== 'LPAREN') return [];
    this.advance(); // consume outer (
    const lists: Position[][][] = [];
    while (this.peek().type !== 'RPAREN' && this.peek().type !== 'EOF') {
      lists.push(this.parseCoordinateListList());
      if (this.peek().type === 'COMMA') {
        this.advance();
      }
    }
    this.consume('RPAREN');
    return lists;
  }
}

/** 将 WKT 字符串解析为 GeoJSON Geometry 对象 */
export function parse(wkt: string): Geometry {
  const parser = new WKTParser();
  return parser.parse(wkt);
}