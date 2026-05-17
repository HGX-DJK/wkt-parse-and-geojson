'use strict';

class Lexer {
    constructor(input) {
        this.pos = 0;
        this.input = input.trim();
    }
    peek() {
        return this.input[this.pos] || '';
    }
    advance() {
        return this.input[this.pos++] || '';
    }
    isWhitespace(c) {
        return /\s/.test(c);
    }
    isDigit(c) {
        return /[0-9]/.test(c) || c === '-' || c === '.';
    }
    nextToken() {
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
class WKTParser {
    constructor() {
        this.tokens = [];
        this.pos = 0;
    }
    parse(wkt) {
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
    peek() {
        return this.tokens[this.pos] || { type: 'EOF', value: '' };
    }
    advance() {
        return this.tokens[this.pos++];
    }
    parseGeometry() {
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
    parsePoint() {
        this.advance(); // consume POINT
        const coords = this.parseCoordinateList(2);
        return { type: 'Point', coordinates: coords[0] };
    }
    parseLineString() {
        this.advance(); // consume LINESTRING
        const coords = this.parseCoordinatesList();
        return { type: 'LineString', coordinates: coords };
    }
    parseCoordinatesList() {
        const token = this.peek();
        if (token.type === 'LPAREN') {
            this.advance(); // consume (
            const coords = [];
            while (this.peek().type !== 'RPAREN') {
                coords.push(this.parseCoordinates(2));
                if (this.peek().type === 'COMMA') {
                    this.advance();
                }
            }
            this.advance(); // consume )
            return coords;
        }
        // Handle coordinates without parentheses (e.g., LINESTRING 0 0, 1 1)
        const coords = [];
        while (this.peek().type === 'NUMBER') {
            coords.push(this.parseCoordinates(2));
            if (this.peek().type === 'COMMA') {
                this.advance();
            }
        }
        return coords;
    }
    parsePolygon() {
        this.advance(); // consume POLYGON
        const rings = this.parseCoordinateListList();
        return { type: 'Polygon', coordinates: rings };
    }
    parseMultiPoint() {
        this.advance(); // consume MULTIPOINT
        const token = this.peek();
        if (token.type === 'LPAREN') {
            return { type: 'MultiPoint', coordinates: this.parseCoordinatesList() };
        }
        const coords = [];
        while (this.peek().type !== 'EOF' && this.peek().type !== 'RPAREN') {
            if (this.peek().type === 'LPAREN') {
                this.advance();
                coords.push(this.parseCoordinates(2));
                this.expect('RPAREN');
                this.advance();
            }
            else {
                coords.push(this.parseCoordinates(2));
            }
            if (this.peek().type === 'COMMA') {
                this.advance();
            }
        }
        return { type: 'MultiPoint', coordinates: coords };
    }
    parseMultiLineString() {
        this.advance(); // consume MULTILINESTRING
        const token = this.peek();
        if (token.type !== 'LPAREN') {
            return { type: 'MultiLineString', coordinates: [] };
        }
        this.advance(); // consume (
        const lines = [];
        while (this.peek().type !== 'RPAREN') {
            if (this.peek().type === 'LPAREN') {
                this.advance();
                const coords = [];
                while (this.peek().type !== 'RPAREN') {
                    coords.push(this.parseCoordinates(2));
                    if (this.peek().type === 'COMMA') {
                        this.advance();
                    }
                }
                this.advance(); // consume )
                lines.push(coords);
            }
            if (this.peek().type === 'COMMA') {
                this.advance();
            }
        }
        this.advance(); // consume )
        return { type: 'MultiLineString', coordinates: lines };
    }
    parseMultiPolygon() {
        this.advance(); // consume MULTIPOLYGON
        const polys = this.parseCoordinateListListList();
        return { type: 'MultiPolygon', coordinates: polys };
    }
    parseGeometryCollection() {
        this.advance(); // consume GEOMETRYCOLLECTION
        const token = this.peek();
        if (token.type !== 'LPAREN') {
            return { type: 'GeometryCollection', geometries: [] };
        }
        this.advance(); // consume (
        const geometries = [];
        while (this.peek().type !== 'RPAREN') {
            geometries.push(this.parseGeometry());
            if (this.peek().type === 'COMMA') {
                this.advance();
            }
        }
        this.advance(); // consume )
        return { type: 'GeometryCollection', geometries };
    }
    parseCoordinateList(dimensions) {
        const token = this.peek();
        if (token.type === 'LPAREN') {
            this.advance();
            const coords = [];
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
    parseCoordinates(dimensions) {
        const nums = [];
        while (nums.length < (dimensions > 0 ? dimensions : 2)) {
            const token = this.expect('NUMBER');
            nums.push(parseFloat(token.value));
        }
        return nums;
    }
    parseCoordinateListList() {
        const token = this.peek();
        if (token.type !== 'LPAREN') {
            return [];
        }
        this.advance(); // consume (
        const lists = [];
        while (this.peek().type !== 'RPAREN') {
            lists.push(this.parseCoordinateList(2));
            if (this.peek().type === 'COMMA') {
                this.advance();
            }
        }
        this.advance(); // consume )
        return lists;
    }
    parseCoordinateListListList() {
        const token = this.peek();
        if (token.type !== 'LPAREN') {
            return [];
        }
        this.advance(); // consume (
        const lists = [];
        while (this.peek().type !== 'RPAREN') {
            lists.push(this.parseCoordinateListList());
            if (this.peek().type === 'COMMA') {
                this.advance();
            }
        }
        this.advance(); // consume )
        return lists;
    }
    expect(type) {
        const token = this.peek();
        if (token.type === type) {
            return token;
        }
        throw new Error(`Expected ${type}, got ${token.type}: ${token.value}`);
    }
}
function parse(wkt) {
    return new WKTParser().parse(wkt);
}

function positionToWkt(pos) {
    const vals = pos.map(v => v.toString());
    return vals.join(' ');
}
function coordsToWkt(coords) {
    return coords.map(pos => positionToWkt(pos)).join(', ');
}
class WKTBuilder {
    build(geometry) {
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
                throw new Error(`Unknown geometry type: ${geometry.type}`);
        }
    }
    buildPoint(geom) {
        return `POINT (${positionToWkt(geom.coordinates)})`;
    }
    buildLineString(geom) {
        return `LINESTRING (${coordsToWkt(geom.coordinates)})`;
    }
    buildPolygon(geom) {
        const rings = geom.coordinates.map(ring => `(${coordsToWkt(ring)})`).join(', ');
        return `POLYGON (${rings})`;
    }
    buildMultiPoint(geom) {
        return `MULTIPOINT (${coordsToWkt(geom.coordinates)})`;
    }
    buildMultiLineString(geom) {
        const lines = geom.coordinates.map(line => `(${coordsToWkt(line)})`).join(', ');
        return `MULTILINESTRING (${lines})`;
    }
    buildMultiPolygon(geom) {
        const polys = geom.coordinates.map(poly => {
            const rings = poly.map(ring => `(${coordsToWkt(ring)})`).join(', ');
            return `(${rings})`;
        }).join(', ');
        return `MULTIPOLYGON (${polys})`;
    }
    buildGeometryCollection(geom) {
        const geoms = geom.geometries.map(g => this.build(g)).join(', ');
        return `GEOMETRYCOLLECTION (${geoms})`;
    }
}
function build(geometry) {
    return new WKTBuilder().build(geometry);
}

class GeoJSONBuilder {
    createPoint(x, y, z) {
        return z !== undefined
            ? { type: 'Point', coordinates: [x, y, z] }
            : { type: 'Point', coordinates: [x, y] };
    }
    createLineString(coordinates) {
        return { type: 'LineString', coordinates };
    }
    createPolygon(coordinates) {
        return { type: 'Polygon', coordinates };
    }
    createMultiPoint(coordinates) {
        return { type: 'MultiPoint', coordinates };
    }
    createMultiLineString(coordinates) {
        return { type: 'MultiLineString', coordinates };
    }
    createMultiPolygon(coordinates) {
        return { type: 'MultiPolygon', coordinates };
    }
    createGeometryCollection(geometries) {
        return { type: 'GeometryCollection', geometries };
    }
}
function createPoint(x, y, z) {
    return new GeoJSONBuilder().createPoint(x, y, z);
}
function createLineString(coordinates) {
    return { type: 'LineString', coordinates };
}
function createPolygon(coordinates) {
    return { type: 'Polygon', coordinates };
}
function createMultiPoint(coordinates) {
    return { type: 'MultiPoint', coordinates };
}
function createMultiLineString(coordinates) {
    return { type: 'MultiLineString', coordinates };
}
function createMultiPolygon(coordinates) {
    return { type: 'MultiPolygon', coordinates };
}
function createGeometryCollection(geometries) {
    return new GeoJSONBuilder().createGeometryCollection(geometries);
}

exports.GeoJSONBuilder = GeoJSONBuilder;
exports.WKTBuilder = WKTBuilder;
exports.WKTParser = WKTParser;
exports.build = build;
exports.createGeometryCollection = createGeometryCollection;
exports.createLineString = createLineString;
exports.createMultiLineString = createMultiLineString;
exports.createMultiPoint = createMultiPoint;
exports.createMultiPolygon = createMultiPolygon;
exports.createPoint = createPoint;
exports.createPolygon = createPolygon;
exports.parse = parse;
