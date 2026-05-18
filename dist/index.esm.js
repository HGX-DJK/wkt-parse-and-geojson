var types = /*#__PURE__*/Object.freeze({
    __proto__: null
});

const RE_WHITESPACE = /\s/;
const RE_NUMBER_START = /[0-9\-]/;
const RE_NUMBER_BODY = /[0-9\.\-eE\+]/;
const RE_WORD_CHAR = /[a-zA-Z_]/;
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
        return RE_WHITESPACE.test(c);
    }
    isNumberStart(c) {
        return RE_NUMBER_START.test(c);
    }
    isNumberBody(c) {
        return RE_NUMBER_BODY.test(c);
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
        if (this.isNumberStart(c)) {
            const start = this.pos;
            while (this.pos < this.input.length && this.isNumberBody(this.peek())) {
                this.pos++;
            }
            return { type: 'NUMBER', value: this.input.slice(start, this.pos) };
        }
        const start = this.pos;
        while (this.pos < this.input.length && RE_WORD_CHAR.test(this.peek())) {
            this.pos++;
        }
        return { type: 'WORD', value: this.input.slice(start, this.pos).toUpperCase() };
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
        const geometry = this.parseGeometry();
        if (this.peek().type !== 'EOF') {
            throw new Error(`Unexpected trailing token after geometry: "${this.peek().value}"`);
        }
        return geometry;
    }
    peek() {
        return this.tokens[this.pos] || { type: 'EOF', value: '' };
    }
    advance() {
        return this.tokens[this.pos++];
    }
    consume(type) {
        const token = this.peek();
        if (token.type !== type) {
            throw new Error(`Expected ${type}, got ${token.type}: "${token.value}"`);
        }
        return this.advance();
    }
    skipComma() {
        if (this.peek().type === 'COMMA') {
            this.advance();
        }
    }
    isDone() {
        const t = this.peek();
        return t.type === 'RPAREN' || t.type === 'EOF';
    }
    parseGeometry() {
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
    skipDimensionKeyword() {
        const t = this.peek();
        if (t.type === 'WORD' && (t.value === 'Z' || t.value === 'M' || t.value === 'ZM')) {
            this.advance();
        }
    }
    isEmptyGeometry() {
        const t = this.peek();
        if (t.type === 'WORD' && t.value === 'EMPTY') {
            this.advance();
            return true;
        }
        return false;
    }
    parsePoint() {
        this.advance();
        this.skipDimensionKeyword();
        if (this.isEmptyGeometry()) {
            throw new Error('POINT EMPTY cannot be represented as a GeoJSON Point. ' +
                'Consider using wktToFeature() and checking Feature.geometry === null.');
        }
        this.consume('LPAREN');
        const coords = this.parseCoordinates();
        this.consume('RPAREN');
        return { type: 'Point', coordinates: coords };
    }
    parseLineString() {
        this.advance();
        this.skipDimensionKeyword();
        if (this.isEmptyGeometry()) {
            return { type: 'LineString', coordinates: [] };
        }
        const coords = this.parseCoordinatesList();
        return { type: 'LineString', coordinates: coords };
    }
    parsePolygon() {
        this.advance();
        this.skipDimensionKeyword();
        if (this.isEmptyGeometry()) {
            return { type: 'Polygon', coordinates: [] };
        }
        this.consume('LPAREN');
        const rings = [];
        while (!this.isDone()) {
            rings.push(this.parseCoordinatesList());
            this.skipComma();
        }
        this.consume('RPAREN');
        return { type: 'Polygon', coordinates: rings };
    }
    parseMultiPoint() {
        this.advance();
        this.skipDimensionKeyword();
        if (this.isEmptyGeometry() || this.peek().type !== 'LPAREN') {
            return { type: 'MultiPoint', coordinates: [] };
        }
        this.advance();
        const coords = [];
        while (!this.isDone()) {
            if (this.peek().type === 'LPAREN') {
                this.advance();
                coords.push(this.parseCoordinates());
                this.consume('RPAREN');
            }
            else {
                coords.push(this.parseCoordinates());
            }
            this.skipComma();
        }
        this.consume('RPAREN');
        return { type: 'MultiPoint', coordinates: coords };
    }
    parseMultiLineString() {
        this.advance();
        this.skipDimensionKeyword();
        if (this.isEmptyGeometry() || this.peek().type !== 'LPAREN') {
            return { type: 'MultiLineString', coordinates: [] };
        }
        this.advance();
        const lines = [];
        while (!this.isDone()) {
            lines.push(this.parseCoordinatesList());
            this.skipComma();
        }
        this.consume('RPAREN');
        return { type: 'MultiLineString', coordinates: lines };
    }
    parseMultiPolygon() {
        this.advance();
        this.skipDimensionKeyword();
        if (this.isEmptyGeometry()) {
            return { type: 'MultiPolygon', coordinates: [] };
        }
        this.consume('LPAREN');
        const polys = [];
        while (!this.isDone()) {
            polys.push(this.parseCoordinateListList());
            this.skipComma();
        }
        this.consume('RPAREN');
        return { type: 'MultiPolygon', coordinates: polys };
    }
    parseGeometryCollection() {
        this.advance();
        this.skipDimensionKeyword();
        if (this.isEmptyGeometry() || this.peek().type !== 'LPAREN') {
            return { type: 'GeometryCollection', geometries: [] };
        }
        this.advance();
        const geometries = [];
        while (!this.isDone()) {
            geometries.push(this.parseGeometry());
            this.skipComma();
        }
        this.consume('RPAREN');
        return { type: 'GeometryCollection', geometries };
    }
    parseCoordinates() {
        const xStr = this.consume('NUMBER').value;
        const yStr = this.consume('NUMBER').value;
        const x = parseFloat(xStr);
        const y = parseFloat(yStr);
        if (isNaN(x))
            throw new Error(`Invalid coordinate value: "${xStr}"`);
        if (isNaN(y))
            throw new Error(`Invalid coordinate value: "${yStr}"`);
        if (this.peek().type === 'NUMBER') {
            const zStr = this.advance().value;
            const z = parseFloat(zStr);
            if (isNaN(z))
                throw new Error(`Invalid coordinate value: "${zStr}"`);
            return [x, y, z];
        }
        return [x, y];
    }
    parseCoordinatesList() {
        this.consume('LPAREN');
        const coords = [];
        while (!this.isDone()) {
            coords.push(this.parseCoordinates());
            this.skipComma();
        }
        this.consume('RPAREN');
        return coords;
    }
    parseCoordinateListList() {
        if (this.peek().type !== 'LPAREN')
            return [];
        this.advance();
        const lists = [];
        while (!this.isDone()) {
            lists.push(this.parseCoordinatesList());
            this.skipComma();
        }
        this.consume('RPAREN');
        return lists;
    }
}
function parse(wkt) {
    const parser = new WKTParser();
    return parser.parse(wkt);
}

var wktParser = /*#__PURE__*/Object.freeze({
    __proto__: null,
    WKTParser: WKTParser,
    parse: parse
});

function formatNumber(v) {
    if (v % 1 !== 0) {
        return Number(v.toFixed(15)).toString();
    }
    return String(v);
}
function positionToWkt(pos) {
    return pos.map(formatNumber).join(' ');
}
function coordsToWkt(coords) {
    return coords.map(positionToWkt).join(', ');
}
function hasZ(coordinates) {
    if (!Array.isArray(coordinates))
        return false;
    if (coordinates.length === 0)
        return false;
    const first = coordinates[0];
    if (Array.isArray(first)) {
        if (typeof first[0] === 'number') {
            return first.length === 3;
        }
        if (Array.isArray(first[0])) {
            const firstRing = first;
            return firstRing.length > 0 && firstRing[0].length === 3;
        }
    }
    return false;
}
function zSuffix(coordinates) {
    return hasZ(coordinates) ? ' Z' : '';
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
        return `POINT${zSuffix(geom.coordinates)} (${positionToWkt(geom.coordinates)})`;
    }
    buildLineString(geom) {
        if (geom.coordinates.length === 0)
            return 'LINESTRING EMPTY';
        return `LINESTRING${zSuffix(geom.coordinates)} (${coordsToWkt(geom.coordinates)})`;
    }
    buildPolygon(geom) {
        if (geom.coordinates.length === 0)
            return 'POLYGON EMPTY';
        const ringStr = geom.coordinates.map(ring => `(${coordsToWkt(ring)})`).join(', ');
        return `POLYGON${zSuffix(geom.coordinates)} (${ringStr})`;
    }
    buildMultiPoint(geom) {
        if (geom.coordinates.length === 0)
            return 'MULTIPOINT EMPTY';
        const pts = geom.coordinates.map(p => `(${positionToWkt(p)})`).join(', ');
        return `MULTIPOINT${zSuffix(geom.coordinates)} (${pts})`;
    }
    buildMultiLineString(geom) {
        if (geom.coordinates.length === 0)
            return 'MULTILINESTRING EMPTY';
        const lines = geom.coordinates.map(line => `(${coordsToWkt(line)})`).join(', ');
        return `MULTILINESTRING${zSuffix(geom.coordinates)} (${lines})`;
    }
    buildMultiPolygon(geom) {
        if (geom.coordinates.length === 0)
            return 'MULTIPOLYGON EMPTY';
        const polys = geom.coordinates.map(poly => {
            const rings = poly.map(ring => `(${coordsToWkt(ring)})`).join(', ');
            return `(${rings})`;
        }).join(', ');
        return `MULTIPOLYGON${zSuffix(geom.coordinates)} (${polys})`;
    }
    buildGeometryCollection(geom) {
        if (geom.geometries.length === 0)
            return 'GEOMETRYCOLLECTION EMPTY';
        const geoms = geom.geometries.map(g => this.build(g)).join(', ');
        return `GEOMETRYCOLLECTION (${geoms})`;
    }
}
function build(geometry) {
    return WKT_BUILDER.build(geometry);
}
const WKT_BUILDER = new WKTBuilder();

var wktBuilder = /*#__PURE__*/Object.freeze({
    __proto__: null,
    WKTBuilder: WKTBuilder,
    build: build
});

function isPosition(v) {
    return (Array.isArray(v) &&
        (v.length === 2 || v.length === 3) &&
        v.every((n) => typeof n === 'number'));
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
        const rings = isPosition(coordinates[0])
            ? [coordinates]
            : coordinates;
        return { type: 'Polygon', coordinates: rings };
    }
    createMultiPoint(coordinates) {
        const pts = isPosition(coordinates)
            ? [coordinates]
            : coordinates;
        return { type: 'MultiPoint', coordinates: pts };
    }
    createMultiLineString(coordinates) {
        const lines = isPosition(coordinates[0])
            ? [coordinates]
            : coordinates;
        return { type: 'MultiLineString', coordinates: lines };
    }
    createMultiPolygon(coordinates) {
        const firstElem = coordinates[0];
        const isSinglePolygon = Array.isArray(firstElem) && Array.isArray(firstElem[0]) && isPosition(firstElem[0]);
        const polys = isSinglePolygon
            ? [coordinates]
            : coordinates;
        return { type: 'MultiPolygon', coordinates: polys };
    }
    createGeometryCollection(geometries) {
        const geoms = Array.isArray(geometries) ? geometries : [geometries];
        return { type: 'GeometryCollection', geometries: geoms };
    }
}
const _builder = new GeoJSONBuilder();
function createPoint(x, y, z) {
    return _builder.createPoint(x, y, z);
}
function createLineString(coordinates) {
    return _builder.createLineString(coordinates);
}
function createPolygon(coordinates) {
    return _builder.createPolygon(coordinates);
}
function createMultiPoint(coordinates) {
    return _builder.createMultiPoint(coordinates);
}
function createMultiLineString(coordinates) {
    return _builder.createMultiLineString(coordinates);
}
function createMultiPolygon(coordinates) {
    return _builder.createMultiPolygon(coordinates);
}
function createGeometryCollection(geometries) {
    return _builder.createGeometryCollection(geometries);
}

var geojsonBuilder = /*#__PURE__*/Object.freeze({
    __proto__: null,
    GeoJSONBuilder: GeoJSONBuilder,
    createGeometryCollection: createGeometryCollection,
    createLineString: createLineString,
    createMultiLineString: createMultiLineString,
    createMultiPoint: createMultiPoint,
    createMultiPolygon: createMultiPolygon,
    createPoint: createPoint,
    createPolygon: createPolygon
});

function wktToGeoJSON(wkt) {
    return parse(wkt);
}
function wktToFeature(wkt, properties = null, id) {
    const geometry = parse(wkt);
    const feature = {
        type: 'Feature',
        geometry,
        properties,
    };
    if (id !== undefined) {
        feature.id = id;
    }
    return feature;
}
function wktToFeatureCollection(wkts, properties) {
    const features = wkts.map((wkt, i) => wktToFeature(wkt, properties ? (properties[i] ?? null) : null));
    return { type: 'FeatureCollection', features };
}

var wktToGeojson = /*#__PURE__*/Object.freeze({
    __proto__: null,
    wktToFeature: wktToFeature,
    wktToFeatureCollection: wktToFeatureCollection,
    wktToGeoJSON: wktToGeoJSON
});

function geojsonToWkt(geojson) {
    return build(geojson);
}
function featureToWkt(feature) {
    if (!feature.geometry) {
        throw new Error('Feature.geometry is null, cannot convert to WKT');
    }
    return build(feature.geometry);
}
function featureCollectionToWkt(fc) {
    return fc.features.map((f) => {
        if (!f.geometry)
            return null;
        return build(f.geometry);
    });
}

var geojsonToWkt$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    featureCollectionToWkt: featureCollectionToWkt,
    featureToWkt: featureToWkt,
    geojsonToWkt: geojsonToWkt
});

const VALID_GEOMETRY_TYPES = [
    'Point', 'LineString', 'Polygon',
    'MultiPoint', 'MultiLineString', 'MultiPolygon',
    'GeometryCollection'
];
function validateWKT(wkt) {
    if (!wkt || typeof wkt !== 'string') {
        return { valid: false, error: 'WKT must be a non-empty string' };
    }
    const trimmed = wkt.trim();
    if (trimmed.length === 0) {
        return { valid: false, error: 'WKT cannot be empty' };
    }
    try {
        parse(wkt);
        return { valid: true };
    }
    catch (e) {
        return { valid: false, error: e.message };
    }
}
function validateGeoJSON(geojson) {
    if (!geojson || typeof geojson !== 'object') {
        return { valid: false, error: 'GeoJSON must be an object' };
    }
    const obj = geojson;
    if (!obj.type || typeof obj.type !== 'string') {
        return { valid: false, error: 'GeoJSON must have a "type" property' };
    }
    const type = obj.type;
    if (!VALID_GEOMETRY_TYPES.includes(type)) {
        return { valid: false, error: `Invalid geometry type: "${type}". Must be one of: ${VALID_GEOMETRY_TYPES.join(', ')}` };
    }
    if (type === 'GeometryCollection') {
        if (!obj.geometries || !Array.isArray(obj.geometries)) {
            return { valid: false, error: 'GeometryCollection must have a "geometries" array' };
        }
        for (let i = 0; i < obj.geometries.length; i++) {
            const result = validateGeoJSON(obj.geometries[i]);
            if (!result.valid) {
                return { valid: false, error: `GeometryCollection[${i}]: ${result.error}` };
            }
        }
        return { valid: true };
    }
    if (obj.coordinates === undefined) {
        return { valid: false, error: `${type} must have "coordinates"` };
    }
    return validateCoordinates(type, obj.coordinates);
}
function validateCoordinates(type, coords) {
    switch (type) {
        case 'Point':
            return validatePosition(coords);
        case 'LineString':
        case 'MultiPoint':
            if (!Array.isArray(coords)) {
                return { valid: false, error: `${type} coordinates must be an array` };
            }
            for (let i = 0; i < coords.length; i++) {
                const result = validatePosition(coords[i]);
                if (!result.valid) {
                    return { valid: false, error: `${type}[${i}]: ${result.error}` };
                }
            }
            return { valid: true };
        case 'Polygon':
        case 'MultiLineString':
            if (!Array.isArray(coords)) {
                return { valid: false, error: `${type} coordinates must be a nested array` };
            }
            for (let i = 0; i < coords.length; i++) {
                if (!Array.isArray(coords[i])) {
                    return { valid: false, error: `${type}[${i}] must be an array of positions` };
                }
                for (let j = 0; j < coords[i].length; j++) {
                    const result = validatePosition(coords[i][j]);
                    if (!result.valid) {
                        return { valid: false, error: `${type}[${i}][${j}]: ${result.error}` };
                    }
                }
            }
            return { valid: true };
        case 'MultiPolygon':
            if (!Array.isArray(coords)) {
                return { valid: false, error: `${type} coordinates must be a deeply nested array` };
            }
            for (let i = 0; i < coords.length; i++) {
                if (!Array.isArray(coords[i])) {
                    return { valid: false, error: `${type}[${i}] must be an array of rings` };
                }
                for (let j = 0; j < coords[i].length; j++) {
                    if (!Array.isArray(coords[i][j])) {
                        return { valid: false, error: `${type}[${i}][${j}] must be an array of positions` };
                    }
                    for (let k = 0; k < coords[i][j].length; k++) {
                        const result = validatePosition(coords[i][j][k]);
                        if (!result.valid) {
                            return { valid: false, error: `${type}[${i}][${j}][${k}]: ${result.error}` };
                        }
                    }
                }
            }
            return { valid: true };
        default:
            return { valid: true };
    }
}
function validatePosition(pos) {
    if (!Array.isArray(pos)) {
        return { valid: false, error: 'Position must be an array of numbers' };
    }
    if (pos.length < 2 || pos.length > 3) {
        return { valid: false, error: `Position must have 2 or 3 coordinates, got ${pos.length}` };
    }
    for (let i = 0; i < pos.length; i++) {
        if (typeof pos[i] !== 'number' || isNaN(pos[i])) {
            return { valid: false, error: `Position[${i}] must be a valid number` };
        }
    }
    return { valid: true };
}
function tryFixWKT(wkt) {
    const trimmed = wkt.trim();
    if (!trimmed) {
        return { fixed: wkt, changed: false };
    }
    try {
        parse(trimmed);
        return { fixed: trimmed, changed: false };
    }
    catch {
    }
    const patterns = [
        /\)\s*[A-Z]/i,
        /EMPTY\s+[A-Z]/i,
        /\)\s*$/,
    ];
    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match) {
            const fixed = trimmed.slice(0, match.index + (match[0].match(/\)/)?.[0].length || 0));
            try {
                parse(fixed);
                return { fixed, changed: true };
            }
            catch {
            }
        }
    }
    const lastValidIndex = findLastValidPosition(trimmed);
    if (lastValidIndex > 0) {
        const fixed = trimmed.slice(0, lastValidIndex + 1);
        try {
            parse(fixed);
            return { fixed, changed: true };
        }
        catch {
        }
    }
    return { fixed: wkt, changed: false };
}
function findLastValidPosition(wkt) {
    let depth = 0;
    for (let i = wkt.length - 1; i >= 0; i--) {
        const c = wkt[i];
        if (c === ')')
            depth++;
        else if (c === '(')
            depth--;
        else if (c === ' ' && depth === 0 && /[A-Z]/.test(wkt.slice(i + 1))) {
            if (wkt.slice(0, i).trimEnd().match(/[A-Z]\s*$/)) {
                return i - 1;
            }
        }
    }
    return wkt.length - 1;
}
function cloneGeometry(geometry) {
    return JSON.parse(JSON.stringify(geometry));
}
function geometryEquals(a, b) {
    if (a.type !== b.type)
        return false;
    if (a.type === 'Point') {
        const aCoords = a.coordinates;
        const bCoords = b.coordinates;
        return aCoords.length === bCoords.length &&
            aCoords[0] === bCoords[0] &&
            aCoords[1] === bCoords[1] &&
            (aCoords.length === 2 || aCoords[2] === bCoords[2]);
    }
    return JSON.stringify(a) === JSON.stringify(b);
}

var validate = /*#__PURE__*/Object.freeze({
    __proto__: null,
    cloneGeometry: cloneGeometry,
    geometryEquals: geometryEquals,
    tryFixWKT: tryFixWKT,
    validateGeoJSON: validateGeoJSON,
    validateWKT: validateWKT
});

const WKT = {
    ...types,
    ...wktParser,
    ...wktBuilder,
    ...geojsonBuilder,
    ...wktToGeojson,
    ...geojsonToWkt$1,
    ...validate,
};

export { GeoJSONBuilder, WKT, WKTBuilder, WKTParser, build, cloneGeometry, createGeometryCollection, createLineString, createMultiLineString, createMultiPoint, createMultiPolygon, createPoint, createPolygon, featureCollectionToWkt, featureToWkt, geojsonToWkt, geometryEquals, parse, tryFixWKT, validateGeoJSON, validateWKT, wktToFeature, wktToFeatureCollection, wktToGeoJSON };
