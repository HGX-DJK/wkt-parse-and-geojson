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
    /** 数字开头字符：数字 或 负号 */
    isNumberStart(c) {
        return /[0-9\-]/.test(c);
    }
    isNumberBody(c) {
        return /[0-9\.\-eE\+]/.test(c);
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
        const rings = this.parseCoordinateListList();
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
        while (this.peek().type !== 'RPAREN' && this.peek().type !== 'EOF') {
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
            if (this.peek().type === 'COMMA') {
                this.advance();
            }
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
    parseMultiPolygon() {
        this.advance(); // consume MULTIPOLYGON
        this.skipDimensionKeyword();
        if (this.isEmptyGeometry()) {
            return { type: 'MultiPolygon', coordinates: [] };
        }
        const polys = this.parseCoordinateListListList();
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
    parseCoordinateListList() {
        if (this.peek().type !== 'LPAREN')
            return [];
        this.advance(); // consume outer (
        const lists = [];
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
    parseCoordinateListListList() {
        if (this.peek().type !== 'LPAREN')
            return [];
        this.advance(); // consume outer (
        const lists = [];
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
        return `POINT (${positionToWkt(geom.coordinates)})`;
    }
    buildLineString(geom) {
        if (geom.coordinates.length === 0)
            return 'LINESTRING EMPTY';
        return `LINESTRING (${coordsToWkt(geom.coordinates)})`;
    }
    buildPolygon(geom) {
        if (geom.coordinates.length === 0)
            return 'POLYGON EMPTY';
        const rings = geom.coordinates.map(ring => `(${coordsToWkt(ring)})`).join(', ');
        return `POLYGON (${rings})`;
    }
    /**
     * 按 OGC/ISO WKT 标准，MULTIPOINT 每个点用括号包裹：
     * MULTIPOINT ((0 0), (1 1), (2 2))
     */
    buildMultiPoint(geom) {
        if (geom.coordinates.length === 0)
            return 'MULTIPOINT EMPTY';
        const pts = geom.coordinates.map(p => `(${positionToWkt(p)})`).join(', ');
        return `MULTIPOINT (${pts})`;
    }
    buildMultiLineString(geom) {
        if (geom.coordinates.length === 0)
            return 'MULTILINESTRING EMPTY';
        const lines = geom.coordinates.map(line => `(${coordsToWkt(line)})`).join(', ');
        return `MULTILINESTRING (${lines})`;
    }
    buildMultiPolygon(geom) {
        if (geom.coordinates.length === 0)
            return 'MULTIPOLYGON EMPTY';
        const polys = geom.coordinates.map(poly => {
            const rings = poly.map(ring => `(${coordsToWkt(ring)})`).join(', ');
            return `(${rings})`;
        }).join(', ');
        return `MULTIPOLYGON (${polys})`;
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
/** 创建 Polygon（第一个环为外环，后续为内环/空洞） */
function createPolygon(coordinates) {
    return _builder.createPolygon(coordinates);
}
/** 创建 MultiPoint */
function createMultiPoint(coordinates) {
    return _builder.createMultiPoint(coordinates);
}
/** 创建 MultiLineString */
function createMultiLineString(coordinates) {
    return _builder.createMultiLineString(coordinates);
}
/** 创建 MultiPolygon */
function createMultiPolygon(coordinates) {
    return _builder.createMultiPolygon(coordinates);
}
/** 创建 GeometryCollection */
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

export { GeoJSONBuilder, WKTBuilder, WKTParser, build, createGeometryCollection, createLineString, createMultiLineString, createMultiPoint, createMultiPolygon, createPoint, createPolygon, featureCollectionToWkt, featureToWkt, geojsonToWkt, parse, wktToFeature, wktToFeatureCollection, wktToGeoJSON };
