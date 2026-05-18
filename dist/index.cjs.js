'use strict';

// Precompiled regex for better performance
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
            const start = this.pos;
            while (this.pos < this.input.length && this.isNumberBody(this.peek())) {
                this.pos++;
            }
            return { type: 'NUMBER', value: this.input.slice(start, this.pos) };
        }
        // Word (geometry type or EMPTY/Z/M keyword)
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
        // 校验尾部无多余字符（防止静默忽略垃圾输入）
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
    /** 消费当前 token 并返回，若类型不匹配则抛出错误 */
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
    // ── 消费可选的维度修饰符（Z / M / ZM）
    skipDimensionKeyword() {
        const t = this.peek();
        if (t.type === 'WORD' && (t.value === 'Z' || t.value === 'M' || t.value === 'ZM')) {
            this.advance();
        }
    }
    // ── 判断并消费 EMPTY 关键字
    isEmptyGeometry() {
        const t = this.peek();
        if (t.type === 'WORD' && t.value === 'EMPTY') {
            this.advance();
            return true;
        }
        return false;
    }
    // ── POINT ────────────────────────────────────────────────────────
    parsePoint() {
        this.advance(); // consume POINT
        this.skipDimensionKeyword();
        if (this.isEmptyGeometry()) {
            // GeoJSON 无法表示空点：POINT EMPTY 在 GeoJSON 中应用 null geometry Feature，
            // 此处直接抛出，由调用方决定如何处理。
            throw new Error('POINT EMPTY cannot be represented as a GeoJSON Point. ' +
                'Consider using wktToFeature() and checking Feature.geometry === null.');
        }
        this.consume('LPAREN');
        const coords = this.parseCoordinates();
        this.consume('RPAREN');
        return { type: 'Point', coordinates: coords };
    }
    // ── LINESTRING ───────────────────────────────────────────────────
    parseLineString() {
        this.advance(); // consume LINESTRING
        this.skipDimensionKeyword();
        if (this.isEmptyGeometry()) {
            return { type: 'LineString', coordinates: [] };
        }
        const coords = this.parseCoordinatesList();
        return { type: 'LineString', coordinates: coords };
    }
    // ── POLYGON ──────────────────────────────────────────────────────
    parsePolygon() {
        this.advance(); // consume POLYGON
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
    // ── MULTIPOINT ───────────────────────────────────────────────────
    parseMultiPoint() {
        this.advance(); // consume MULTIPOINT
        this.skipDimensionKeyword();
        if (this.isEmptyGeometry() || this.peek().type !== 'LPAREN') {
            return { type: 'MultiPoint', coordinates: [] };
        }
        this.advance(); // consume outer (
        const coords = [];
        while (!this.isDone()) {
            if (this.peek().type === 'LPAREN') {
                // 标准写法: MULTIPOINT ((x y), (x y))
                this.advance(); // consume (
                coords.push(this.parseCoordinates());
                this.consume('RPAREN');
            }
            else {
                // 非标准写法: MULTIPOINT (x y, x y)
                coords.push(this.parseCoordinates());
            }
            this.skipComma();
        }
        this.consume('RPAREN');
        return { type: 'MultiPoint', coordinates: coords };
    }
    // ── MULTILINESTRING ──────────────────────────────────────────────
    parseMultiLineString() {
        this.advance(); // consume MULTILINESTRING
        this.skipDimensionKeyword();
        if (this.isEmptyGeometry() || this.peek().type !== 'LPAREN') {
            return { type: 'MultiLineString', coordinates: [] };
        }
        this.advance(); // consume outer (
        const lines = [];
        while (!this.isDone()) {
            lines.push(this.parseCoordinatesList());
            this.skipComma();
        }
        this.consume('RPAREN');
        return { type: 'MultiLineString', coordinates: lines };
    }
    // ── MULTIPOLYGON ─────────────────────────────────────────────────
    parseMultiPolygon() {
        this.advance(); // consume MULTIPOLYGON
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
    // ── GEOMETRYCOLLECTION ───────────────────────────────────────────
    parseGeometryCollection() {
        this.advance(); // consume GEOMETRYCOLLECTION
        this.skipDimensionKeyword();
        if (this.isEmptyGeometry() || this.peek().type !== 'LPAREN') {
            return { type: 'GeometryCollection', geometries: [] };
        }
        this.advance(); // consume (
        const geometries = [];
        while (!this.isDone()) {
            geometries.push(this.parseGeometry());
            this.skipComma();
        }
        this.consume('RPAREN');
        return { type: 'GeometryCollection', geometries };
    }
    // ── 坐标解析辅助方法 ──────────────────────────────────────────────
    /**
     * 读取一个坐标点（自动检测维度：X Y 或 X Y Z）
     * 读完 X、Y 后，若下一个 token 仍是 NUMBER，则继续读 Z
     */
    parseCoordinates() {
        const xStr = this.consume('NUMBER').value;
        const yStr = this.consume('NUMBER').value;
        const x = parseFloat(xStr);
        const y = parseFloat(yStr);
        if (isNaN(x))
            throw new Error(`Invalid coordinate value: "${xStr}"`);
        if (isNaN(y))
            throw new Error(`Invalid coordinate value: "${yStr}"`);
        // 动态检测 Z 坐标
        if (this.peek().type === 'NUMBER') {
            const zStr = this.advance().value;
            const z = parseFloat(zStr);
            if (isNaN(z))
                throw new Error(`Invalid coordinate value: "${zStr}"`);
            return [x, y, z];
        }
        return [x, y];
    }
    /** 解析带括号的坐标序列：( x y, x y, ... ) */
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
    /** 解析环列表（Polygon 级别）：( (...), (...) ) */
    parseCoordinateListList() {
        if (this.peek().type !== 'LPAREN')
            return [];
        this.advance(); // consume outer (
        const lists = [];
        while (!this.isDone()) {
            lists.push(this.parseCoordinatesList());
            this.skipComma();
        }
        this.consume('RPAREN');
        return lists;
    }
}
/** 将 WKT 字符串解析为 GeoJSON Geometry 对象 */
function parse(wkt) {
    const parser = new WKTParser();
    return parser.parse(wkt);
}

/**
 * 将坐标数值格式化为字符串，避免科学计数法（WKT 不支持）。
 * 例：1e-7 → "0.0000001"，1.50000 → "1.5"，1.0 → "1"
 */
function formatNumber(v) {
    // 有小数则最多保留 15 位有效位，再去掉尾零
    if (v % 1 !== 0) {
        return parseFloat(v.toFixed(15)).toString();
    }
    return v.toFixed(0);
}
function positionToWkt(pos) {
    return pos.map(formatNumber).join(' ');
}
function coordsToWkt(coords) {
    return coords.map(positionToWkt).join(', ');
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
        const hasZ = geom.coordinates.length === 3;
        return `POINT${hasZ ? ' Z' : ''} (${positionToWkt(geom.coordinates)})`;
    }
    buildLineString(geom) {
        if (geom.coordinates.length === 0)
            return 'LINESTRING EMPTY';
        const hasZ = geom.coordinates[0].length === 3;
        return `LINESTRING${hasZ ? ' Z' : ''} (${coordsToWkt(geom.coordinates)})`;
    }
    buildPolygon(geom) {
        if (geom.coordinates.length === 0)
            return 'POLYGON EMPTY';
        const hasZ = geom.coordinates[0].length > 0 && geom.coordinates[0][0].length === 3;
        const ringStr = geom.coordinates.map(ring => `(${coordsToWkt(ring)})`).join(', ');
        return `POLYGON${hasZ ? ' Z' : ''} (${ringStr})`;
    }
    /**
     * 按 OGC/ISO WKT 标准，MULTIPOINT 每个点用括号包裹：
     * MULTIPOINT ((0 0), (1 1), (2 2))
     */
    buildMultiPoint(geom) {
        if (geom.coordinates.length === 0)
            return 'MULTIPOINT EMPTY';
        const hasZ = geom.coordinates[0].length === 3;
        const pts = geom.coordinates.map(p => `(${positionToWkt(p)})`).join(', ');
        return `MULTIPOINT${hasZ ? ' Z' : ''} (${pts})`;
    }
    buildMultiLineString(geom) {
        if (geom.coordinates.length === 0)
            return 'MULTILINESTRING EMPTY';
        const hasZ = geom.coordinates[0].length > 0 && geom.coordinates[0][0].length === 3;
        const lines = geom.coordinates.map(line => `(${coordsToWkt(line)})`).join(', ');
        return `MULTILINESTRING${hasZ ? ' Z' : ''} (${lines})`;
    }
    buildMultiPolygon(geom) {
        if (geom.coordinates.length === 0)
            return 'MULTIPOLYGON EMPTY';
        const hasZ = geom.coordinates[0].length > 0 && geom.coordinates[0][0].length > 0 && geom.coordinates[0][0][0].length === 3;
        const polys = geom.coordinates.map(poly => {
            const rings = poly.map(ring => `(${coordsToWkt(ring)})`).join(', ');
            return `(${rings})`;
        }).join(', ');
        return `MULTIPOLYGON${hasZ ? ' Z' : ''} (${polys})`;
    }
    buildGeometryCollection(geom) {
        if (geom.geometries.length === 0)
            return 'GEOMETRYCOLLECTION EMPTY';
        const geoms = geom.geometries.map(g => this.build(g)).join(', ');
        return `GEOMETRYCOLLECTION (${geoms})`;
    }
}
/** 将 GeoJSON Geometry 对象转换为 WKT 字符串 */
function build(geometry) {
    return new WKTBuilder().build(geometry);
}

// ─── 内部工具：判断是否为 Position（[number, number] 或 [number, number, number]）
function isPosition(v) {
    return (Array.isArray(v) &&
        (v.length === 2 || v.length === 3) &&
        v.every((n) => typeof n === 'number'));
}
/**
 * GeoJSON 几何对象构建器（类形式，方便组合使用）
 */
class GeoJSONBuilder {
    createPoint(x, y, z) {
        return z !== undefined
            ? { type: 'Point', coordinates: [x, y, z] }
            : { type: 'Point', coordinates: [x, y] };
    }
    createLineString(coordinates) {
        return { type: 'LineString', coordinates };
    }
    /**
     * 创建 Polygon。
     * - 传入 `Position[]`：视为单个外环，自动包装为 `[ring]`
     * - 传入 `Position[][]`：视为完整的环列表（外环 + 内环/空洞）
     */
    createPolygon(coordinates) {
        const rings = isPosition(coordinates[0])
            ? [coordinates] // 单环：Position[] → Position[][]
            : coordinates; // 多环：已是 Position[][]
        return { type: 'Polygon', coordinates: rings };
    }
    /**
     * 创建 MultiPoint。
     * - 传入 `Position`：视为单个点，自动包装为 `[point]`
     * - 传入 `Position[]`：视为多个点
     */
    createMultiPoint(coordinates) {
        const pts = isPosition(coordinates)
            ? [coordinates] // 单点：Position → Position[]
            : coordinates; // 多点：已是 Position[]
        return { type: 'MultiPoint', coordinates: pts };
    }
    /**
     * 创建 MultiLineString。
     * - 传入 `Position[]`：视为单条线，自动包装为 `[line]`
     * - 传入 `Position[][]`：视为多条线
     */
    createMultiLineString(coordinates) {
        const lines = isPosition(coordinates[0])
            ? [coordinates] // 单线：Position[] → Position[][]
            : coordinates; // 多线：已是 Position[][]
        return { type: 'MultiLineString', coordinates: lines };
    }
    /**
     * 创建 MultiPolygon。
     * - 传入 `Position[][]`：视为单个多边形（环列表），自动包装为 `[polygon]`
     * - 传入 `Position[][][]`：视为多个多边形
     */
    createMultiPolygon(coordinates) {
        // 判断：若第一个元素是 Position[]（环），则整体是单个 polygon
        const firstElem = coordinates[0];
        const isSinglePolygon = Array.isArray(firstElem) && Array.isArray(firstElem[0]) && isPosition(firstElem[0]);
        const polys = isSinglePolygon
            ? [coordinates] // 单多边形：Position[][] → Position[][][]
            : coordinates; // 多多边形：已是 Position[][][]
        return { type: 'MultiPolygon', coordinates: polys };
    }
    /**
     * 创建 GeometryCollection。
     * - 传入单个 `Geometry`：自动包装为 `[geometry]`
     * - 传入 `Geometry[]`：直接使用
     */
    createGeometryCollection(geometries) {
        const geoms = Array.isArray(geometries) ? geometries : [geometries];
        return { type: 'GeometryCollection', geometries: geoms };
    }
}
// 单例，避免重复实例化
const _builder = new GeoJSONBuilder();
/** 创建 Point */
function createPoint(x, y, z) {
    return _builder.createPoint(x, y, z);
}
/** 创建 LineString */
function createLineString(coordinates) {
    return _builder.createLineString(coordinates);
}
/**
 * 创建 Polygon。
 * - 传入 `Position[]`：单个外环，自动包装
 * - 传入 `Position[][]`：外环 + 内环（空洞）
 *
 * @example
 * createPolygon([[0,0],[1,0],[1,1],[0,1],[0,0]])
 * createPolygon([[[0,0],[10,0],[10,10],[0,10],[0,0]], [[2,2],[4,2],[4,4],[2,4],[2,2]]])
 */
function createPolygon(coordinates) {
    return _builder.createPolygon(coordinates);
}
/**
 * 创建 MultiPoint。
 * - 传入 `Position`：单个点
 * - 传入 `Position[]`：多个点
 *
 * @example
 * createMultiPoint([0, 0])
 * createMultiPoint([[0,0],[1,1],[2,2]])
 */
function createMultiPoint(coordinates) {
    return _builder.createMultiPoint(coordinates);
}
/**
 * 创建 MultiLineString。
 * - 传入 `Position[]`：单条线
 * - 传入 `Position[][]`：多条线
 *
 * @example
 * createMultiLineString([[0,0],[1,1]])
 * createMultiLineString([[[0,0],[1,1]], [[2,2],[3,3]]])
 */
function createMultiLineString(coordinates) {
    return _builder.createMultiLineString(coordinates);
}
/**
 * 创建 MultiPolygon。
 * - 传入 `Position[][]`：单个多边形（环列表）
 * - 传入 `Position[][][]`：多个多边形
 *
 * @example
 * createMultiPolygon([[[0,0],[1,0],[1,1],[0,1],[0,0]]])
 * createMultiPolygon([[[[0,0],[1,0],[1,1],[0,1],[0,0]]], [[[2,2],[3,2],[3,3],[2,3],[2,2]]]])
 */
function createMultiPolygon(coordinates) {
    return _builder.createMultiPolygon(coordinates);
}
/**
 * 创建 GeometryCollection。
 * - 传入单个 `Geometry`：自动包装
 * - 传入 `Geometry[]`：直接使用
 *
 * @example
 * createGeometryCollection(createPoint(0, 0))
 * createGeometryCollection([createPoint(0,0), createLineString([[0,0],[1,1]])])
 */
function createGeometryCollection(geometries) {
    return _builder.createGeometryCollection(geometries);
}

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
function wktToGeoJSON(wkt) {
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
function wktToFeatureCollection(wkts, properties) {
    const features = wkts.map((wkt, i) => wktToFeature(wkt, properties ? (properties[i] ?? null) : null));
    return { type: 'FeatureCollection', features };
}

/**
 * 将 GeoJSON Geometry 对象转换为 WKT 字符串。
 *
 * @example
 * geojsonToWkt({ type: 'Point', coordinates: [30.5, 40.5] })
 * // → 'POINT (30.5 40.5)'
 *
 * geojsonToWkt({ type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] })
 * // → 'POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))'
 */
function geojsonToWkt(geojson) {
    return build(geojson);
}
/**
 * 将 GeoJSON Feature 对象转换为 WKT 字符串（取 geometry 部分）。
 *
 * @throws 若 Feature.geometry 为 null，则抛出错误
 *
 * @example
 * featureToWkt({ type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: null })
 * // → 'POINT (0 0)'
 */
function featureToWkt(feature) {
    if (!feature.geometry) {
        throw new Error('Feature.geometry is null, cannot convert to WKT');
    }
    return build(feature.geometry);
}
/**
 * 将 GeoJSON FeatureCollection 中所有 Feature 转换为 WKT 字符串数组。
 *
 * geometry 为 null 的 Feature 会被跳过（返回数组中对应位置为 null）。
 *
 * @example
 * featureCollectionToWkt({ type: 'FeatureCollection', features: [...] })
 * // → ['POINT (0 0)', 'LINESTRING (0 0, 1 1)', ...]
 */
function featureCollectionToWkt(fc) {
    return fc.features.map((f) => {
        if (!f.geometry)
            return null;
        return build(f.geometry);
    });
}

/**
 * 校验 WKT 字符串格式是否合法
 */
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
/**
 * 校验 GeoJSON Geometry 对象是否合法
 */
function validateGeoJSON(geojson) {
    if (!geojson || typeof geojson !== 'object') {
        return { valid: false, error: 'GeoJSON must be an object' };
    }
    const obj = geojson;
    // 检查 type 字段
    if (!obj.type || typeof obj.type !== 'string') {
        return { valid: false, error: 'GeoJSON must have a "type" property' };
    }
    const type = obj.type;
    const validTypes = [
        'Point', 'LineString', 'Polygon',
        'MultiPoint', 'MultiLineString', 'MultiPolygon',
        'GeometryCollection'
    ];
    if (!validTypes.includes(type)) {
        return { valid: false, error: `Invalid geometry type: "${type}". Must be one of: ${validTypes.join(', ')}` };
    }
    // GeometryCollection 特殊处理
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
    // 其他几何类型必须要有 coordinates
    if (obj.coordinates === undefined) {
        return { valid: false, error: `${type} must have "coordinates"` };
    }
    // 校验坐标格式
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
/**
 * 尝试从可能不规范的 WKT 中恢复出有效结果
 * 主要处理尾部多余字符的情况
 */
function tryFixWKT(wkt) {
    const trimmed = wkt.trim();
    if (!trimmed) {
        return { fixed: wkt, changed: false };
    }
    // 检查是否有尾部多余字符
    const result = validateWKT(trimmed);
    if (result.valid) {
        return { fixed: trimmed, changed: false };
    }
    // 尝试找到最后一个有效的 geometry 结束位置
    const patterns = [
        /\)\s*[A-Z]/i, // 括号后跟字母 (如 POLYGON ((...)) POINT )
        /EMPTY\s+[A-Z]/i, // EMPTY 后跟字母
        /\)\s*$/, // 括号结尾后有多余内容
    ];
    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match) {
            const fixed = trimmed.slice(0, match.index + (match[0].match(/\)/)?.[0].length || 0));
            if (validateWKT(fixed).valid) {
                return { fixed, changed: true };
            }
        }
    }
    // 尝试去除尾部垃圾字符
    const lastValidIndex = findLastValidPosition(trimmed);
    if (lastValidIndex > 0) {
        const fixed = trimmed.slice(0, lastValidIndex + 1);
        if (validateWKT(fixed).valid) {
            return { fixed, changed: true };
        }
    }
    return { fixed: wkt, changed: false };
}
function findLastValidPosition(wkt) {
    // 从后往前找第一个有效的右括号位置
    let depth = 0;
    for (let i = wkt.length - 1; i >= 0; i--) {
        const c = wkt[i];
        if (c === ')')
            depth++;
        else if (c === '(')
            depth--;
        else if (c === ' ' && depth === 0 && i < wkt.length - 1) {
            // 检查这个空格是否在有效位置
            const afterSpace = wkt.slice(i + 1).trim();
            if (!afterSpace)
                continue;
            if (!/^[A-Z]/.test(afterSpace))
                continue;
            // 如果空格后面是字母开头，可能是垃圾字符
            if (i > 5 && /[A-Z]$/.test(wkt.slice(0, i).trim())) {
                return i - 1;
            }
        }
    }
    return wkt.length - 1;
}
/**
 * 深度克隆 GeoJSON 对象（用于避免意外修改原对象）
 */
function cloneGeometry(geometry) {
    return JSON.parse(JSON.stringify(geometry));
}
/**
 * 判断两个几何对象是否相等（坐标对比）
 */
function geometryEquals(a, b) {
    if (a.type !== b.type)
        return false;
    return JSON.stringify(a) === JSON.stringify(b);
}

exports.GeoJSONBuilder = GeoJSONBuilder;
exports.WKTBuilder = WKTBuilder;
exports.WKTParser = WKTParser;
exports.build = build;
exports.cloneGeometry = cloneGeometry;
exports.createGeometryCollection = createGeometryCollection;
exports.createLineString = createLineString;
exports.createMultiLineString = createMultiLineString;
exports.createMultiPoint = createMultiPoint;
exports.createMultiPolygon = createMultiPolygon;
exports.createPoint = createPoint;
exports.createPolygon = createPolygon;
exports.featureCollectionToWkt = featureCollectionToWkt;
exports.featureToWkt = featureToWkt;
exports.geojsonToWkt = geojsonToWkt;
exports.geometryEquals = geometryEquals;
exports.parse = parse;
exports.tryFixWKT = tryFixWKT;
exports.validateGeoJSON = validateGeoJSON;
exports.validateWKT = validateWKT;
exports.wktToFeature = wktToFeature;
exports.wktToFeatureCollection = wktToFeatureCollection;
exports.wktToGeoJSON = wktToGeoJSON;
