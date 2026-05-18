# wkt-parse-and-geojson

一个零依赖、轻量级的 TypeScript/JavaScript 库，用于：
- **WKT 解析**：将 WKT 字符串解析为 GeoJSON Geometry 对象
- **WKT 构建**：将 GeoJSON Geometry 对象序列化为 WKT 字符串
- **WKT ↔ GeoJSON 互转**：在 WKT 与 GeoJSON Geometry / Feature / FeatureCollection 之间自由转换
- **GeoJSON 工厂方法**：快速创建各种 GeoJSON 几何对象

## 目录

- [支持的几何类型](#支持的几何类型)
- [安装与构建](#安装与构建)
- [快速上手](#快速上手)
- [API 文档](#api-文档)
  - [parse(wkt)](#1-parsewkt)
  - [build(geometry)](#2-buildgeometry)
  - [wktToGeoJSON(wkt)](#3-wkttogeojsonwkt)
  - [wktToFeature(wkt, properties?, id?)](#4-wkttofeaturewkt-properties-id)
  - [wktToFeatureCollection(wkts, properties?)](#5-wkttofeaturecollectionwkts-properties)
  - [geojsonToWkt(geometry)](#6-geojsontowktgeometry)
  - [featureToWkt(feature)](#7-featuretowktfeature)
  - [featureCollectionToWkt(fc)](#8-featurecollectiontowktfc)
  - [GeoJSON 工厂方法](#9-geojson-工厂方法)
- [类型定义](#类型定义)
- [注意事项与边界行为](#注意事项与边界行为)
- [本地调试](#本地调试)

---

## 支持的几何类型

| WKT 类型 | GeoJSON 类型 | 说明 |
|---------|-------------|------|
| `POINT` | `Point` | 点 |
| `LINESTRING` | `LineString` | 线 |
| `POLYGON` | `Polygon` | 多边形（支持空洞） |
| `MULTIPOINT` | `MultiPoint` | 点集合 |
| `MULTILINESTRING` | `MultiLineString` | 线集合 |
| `MULTIPOLYGON` | `MultiPolygon` | 多边形集合 |
| `GEOMETRYCOLLECTION` | `GeometryCollection` | 几何集合 |

支持以下 WKT 扩展语法：
- **Z 坐标**：`POINT (x y z)` / `POINT Z (x y z)`
- **维度修饰符**：`Z`、`M`、`ZM`（`M` 值会被忽略，仅保留 XYZ）
- **EMPTY**：`LINESTRING EMPTY`、`POLYGON EMPTY` 等（`POINT EMPTY` 会抛出错误，见[注意事项](#注意事项与边界行为)）

---

## 安装与构建

```bash
# 安装依赖
npm install

# 构建（生成 dist/ 目录）
npm run build

# 仅做 TypeScript 类型检查（不生成文件）
npm run typecheck
```

构建产物：

| 文件 | 格式 | 用途 |
|------|------|------|
| `dist/index.esm.js` | ES Module | 浏览器 / 现代打包工具 |
| `dist/index.cjs.js` | CommonJS | Node.js |
| `dist/index.umd.js` | UMD | `<script>` 标签直接引入 |
| `dist/index.d.ts` | TypeScript 声明 | IDE 类型提示 |

---

## 快速上手

### Node.js

```javascript
// CommonJS
const { parse, build, wktToFeature } = require('./dist/index.cjs.js');

// ES Module
import { parse, build, wktToFeature } from './dist/index.esm.js';
```

### 浏览器 (script 标签)

```html
<!-- UMD 方式：通过 script 标签直接引入，全局变量 WKTGeoJSON -->
<script src="./dist/index.umd.js"></script>
<script>
  const geom = WKTGeoJSON.parse('POINT (116.39 39.91)');
  console.log(geom);
  // → { type: 'Point', coordinates: [116.39, 39.91] }

  const wkt = WKTGeoJSON.build(geom);
  console.log(wkt);
  // → "POINT (116.39 39.91)"
</script>
```

### 浏览器 (ES Module)

```html
<script type="module">
  import { parse, build } from '../dist/index.esm.js';

  const geom = parse('POINT (116.39 39.91)');
  console.log(geom);
  // → { type: 'Point', coordinates: [116.39, 39.91] }

  const wkt = build(geom);
  console.log(wkt);
  // → "POINT (116.39 39.91)"
</script>
```

---

## API 文档

### 1. `parse(wkt)`

将 WKT 字符串解析为 GeoJSON Geometry 对象。

**参数：**
- `wkt` `string` — WKT 格式的字符串

**返回：** `Geometry`

**抛出：** 输入格式错误、未知几何类型、坐标值无效时抛出 `Error`

```javascript
// ── POINT ─────────────────────────────────────────────────────────────
parse('POINT (116.39 39.91)')
// → { type: 'Point', coordinates: [116.39, 39.91] }

// 带 Z 坐标
parse('POINT (116.39 39.91 50)')
// → { type: 'Point', coordinates: [116.39, 39.91, 50] }

// 带维度修饰符（Z 关键字）
parse('POINT Z (116.39 39.91 50)')
// → { type: 'Point', coordinates: [116.39, 39.91, 50] }

// ── LINESTRING ────────────────────────────────────────────────────────
parse('LINESTRING (0 0, 1 1, 2 0)')
// → { type: 'LineString', coordinates: [[0,0],[1,1],[2,0]] }

// ── POLYGON ───────────────────────────────────────────────────────────
// 无空洞
parse('POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0))')
// → { type: 'Polygon', coordinates: [[[0,0],[10,0],[10,10],[0,10],[0,0]]] }

// 带空洞（外环 + 内环）
parse('POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0), (2 2, 4 2, 4 4, 2 4, 2 2))')
// → { type: 'Polygon', coordinates: [
//     [[0,0],[10,0],[10,10],[0,10],[0,0]],  ← 外环
//     [[2,2],[4,2],[4,4],[2,4],[2,2]]       ← 内环（空洞）
//   ]}

// ── MULTIPOINT ────────────────────────────────────────────────────────
// 标准写法（每个点用括号包裹）
parse('MULTIPOINT ((0 0), (1 1), (2 2))')
// → { type: 'MultiPoint', coordinates: [[0,0],[1,1],[2,2]] }

// 非标准写法（兼容）
parse('MULTIPOINT (0 0, 1 1, 2 2)')
// → { type: 'MultiPoint', coordinates: [[0,0],[1,1],[2,2]] }

// ── MULTILINESTRING ───────────────────────────────────────────────────
parse('MULTILINESTRING ((0 0, 1 1), (2 2, 3 3))')
// → { type: 'MultiLineString', coordinates: [[[0,0],[1,1]], [[2,2],[3,3]]] }

// ── MULTIPOLYGON ──────────────────────────────────────────────────────
parse('MULTIPOLYGON (((0 0, 1 0, 1 1, 0 1, 0 0)), ((2 2, 3 2, 3 3, 2 3, 2 2)))')
// → { type: 'MultiPolygon', coordinates: [
//     [[[0,0],[1,0],[1,1],[0,1],[0,0]]],
//     [[[2,2],[3,2],[3,3],[2,3],[2,2]]]
//   ]}

// ── GEOMETRYCOLLECTION ────────────────────────────────────────────────
parse('GEOMETRYCOLLECTION (POINT (0 0), LINESTRING (0 0, 1 1))')
// → { type: 'GeometryCollection', geometries: [
//     { type: 'Point', coordinates: [0,0] },
//     { type: 'LineString', coordinates: [[0,0],[1,1]] }
//   ]}

// ── EMPTY ─────────────────────────────────────────────────────────────
parse('LINESTRING EMPTY')
// → { type: 'LineString', coordinates: [] }

parse('POLYGON EMPTY')
// → { type: 'Polygon', coordinates: [] }
```

---

### 2. `build(geometry)`

将 GeoJSON Geometry 对象转换为 WKT 字符串。

**参数：**
- `geometry` `Geometry` — GeoJSON Geometry 对象

**返回：** `string`

```javascript
build({ type: 'Point', coordinates: [116.39, 39.91] })
// → 'POINT (116.39 39.91)'

build({ type: 'Point', coordinates: [116.39, 39.91, 50] })
// → 'POINT Z (116.39 39.91 50)'

build({ type: 'LineString', coordinates: [[0,0],[1,1],[2,0]] })
// → 'LINESTRING (0 0, 1 1, 2 0)'

build({ type: 'Polygon', coordinates: [[[0,0],[10,0],[10,10],[0,10],[0,0]]] })
// → 'POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0))'

// 带空洞的多边形
build({
  type: 'Polygon',
  coordinates: [
    [[0,0],[10,0],[10,10],[0,10],[0,0]],
    [[2,2],[4,2],[4,4],[2,4],[2,2]]
  ]
})
// → 'POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0), (2 2, 4 2, 4 4, 2 4, 2 2))'

// MULTIPOINT 输出符合 OGC 标准（每个点带括号）
build({ type: 'MultiPoint', coordinates: [[0,0],[1,1],[2,2]] })
// → 'MULTIPOINT ((0 0), (1 1), (2 2))'

// 空几何
build({ type: 'LineString', coordinates: [] })
// → 'LINESTRING EMPTY'

build({ type: 'GeometryCollection', geometries: [] })
// → 'GEOMETRYCOLLECTION EMPTY'
```

---

### 3. `wktToGeoJSON(wkt)`

将 WKT 字符串转换为 GeoJSON Geometry 对象（`parse` 的语义化别名）。

```javascript
import { wktToGeoJSON } from './dist/index.esm.js';

const geom = wktToGeoJSON('POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))');
// → { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] }
```

---

### 4. `wktToFeature(wkt, properties?, id?)`

将 WKT 字符串转换为 GeoJSON **Feature** 对象。

**参数：**
- `wkt` `string` — WKT 字符串
- `properties` `Record<string, unknown> | null`（可选）— Feature 属性，默认 `null`
- `id` `string | number`（可选）— Feature ID

**返回：** `Feature`

```javascript
import { wktToFeature } from './dist/index.esm.js';

// 带属性
wktToFeature('POINT (116.39 39.91)', { name: '北京', pop: 21540000 })
// → {
//     type: 'Feature',
//     geometry: { type: 'Point', coordinates: [116.39, 39.91] },
//     properties: { name: '北京', pop: 21540000 }
//   }

// 带 ID
wktToFeature('LINESTRING (0 0, 1 1)', null, 42)
// → { type: 'Feature', geometry: {...}, properties: null, id: 42 }

// 无属性
wktToFeature('POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))')
// → { type: 'Feature', geometry: {...}, properties: null }
```

---

### 5. `wktToFeatureCollection(wkts, properties?)`

将多个 WKT 字符串批量转换为 GeoJSON **FeatureCollection**。

**参数：**
- `wkts` `string[]` — WKT 字符串数组
- `properties` `Array<Record<string, unknown> | null>`（可选）— 每个 Feature 的属性数组

**返回：** `FeatureCollection`

```javascript
import { wktToFeatureCollection } from './dist/index.esm.js';

const fc = wktToFeatureCollection(
  ['POINT (116.39 39.91)', 'POINT (121.47 31.23)', 'POINT (113.26 23.13)'],
  [{ name: '北京' }, { name: '上海' }, { name: '广州' }]
);
// → {
//     type: 'FeatureCollection',
//     features: [
//       { type: 'Feature', geometry: { type: 'Point', ... }, properties: { name: '北京' } },
//       { type: 'Feature', geometry: { type: 'Point', ... }, properties: { name: '上海' } },
//       { type: 'Feature', geometry: { type: 'Point', ... }, properties: { name: '广州' } }
//     ]
//   }

// 不传属性
const fc2 = wktToFeatureCollection(['POINT (0 0)', 'LINESTRING (0 0, 1 1)']);
```

---

### 6. `geojsonToWkt(geometry)`

将 GeoJSON Geometry 对象转换为 WKT 字符串（`build` 的语义化别名）。

```javascript
import { geojsonToWkt } from './dist/index.esm.js';

geojsonToWkt({ type: 'Point', coordinates: [116.39, 39.91] })
// → 'POINT (116.39 39.91)'
```

---

### 7. `featureToWkt(feature)`

将 GeoJSON **Feature** 转换为 WKT 字符串（取 `geometry` 部分）。

**抛出：** 若 `Feature.geometry` 为 `null`，则抛出 `Error`

```javascript
import { featureToWkt } from './dist/index.esm.js';

featureToWkt({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [116.39, 39.91] },
  properties: { name: '北京' }
})
// → 'POINT (116.39 39.91)'
```

---

### 8. `featureCollectionToWkt(fc)`

将 GeoJSON **FeatureCollection** 中所有 Feature 转换为 WKT 字符串数组。`geometry` 为 `null` 的 Feature 对应位置返回 `null`。

**返回：** `Array<string | null>`

```javascript
import { featureCollectionToWkt } from './dist/index.esm.js';

featureCollectionToWkt({
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: null },
    { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0,0],[1,1]] }, properties: null },
    { type: 'Feature', geometry: null, properties: null }  // ← null geometry
  ]
})
// → ['POINT (0 0)', 'LINESTRING (0 0, 1 1)', null]
```

---

### 9. GeoJSON 工厂方法

快速创建 GeoJSON Geometry 对象。所有工厂方法均支持**简化输入**（自动包装）和**完整输入**两种形式。

#### `createPoint(x, y, z?)`

```javascript
createPoint(116.39, 39.91)
// → { type: 'Point', coordinates: [116.39, 39.91] }

createPoint(116.39, 39.91, 50)
// → { type: 'Point', coordinates: [116.39, 39.91, 50] }
```

#### `createLineString(coordinates)`

```javascript
createLineString([[0,0],[1,1],[2,0]])
// → { type: 'LineString', coordinates: [[0,0],[1,1],[2,0]] }
```

#### `createPolygon(coordinates)`

支持两种输入：

```javascript
// ① 传入单个外环 Position[]（自动包装）
createPolygon([[0,0],[1,0],[1,1],[0,1],[0,0]])
// → { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] }

// ② 传入完整环列表 Position[][]（外环 + 内环/空洞）
createPolygon([
  [[0,0],[10,0],[10,10],[0,10],[0,0]],   // 外环
  [[2,2],[4,2],[4,4],[2,4],[2,2]]        // 内环（空洞）
])
// → { type: 'Polygon', coordinates: [[...外环...], [...内环...]] }
```

#### `createMultiPoint(coordinates)`

支持两种输入：

```javascript
// ① 传入单个点 Position（自动包装）
createMultiPoint([0, 0])
// → { type: 'MultiPoint', coordinates: [[0,0]] }

// ② 传入多个点 Position[]
createMultiPoint([[0,0],[1,1],[2,2]])
// → { type: 'MultiPoint', coordinates: [[0,0],[1,1],[2,2]] }
```

#### `createMultiLineString(coordinates)`

支持两种输入：

```javascript
// ① 传入单条线 Position[]（自动包装）
createMultiLineString([[0,0],[1,1],[2,0]])
// → { type: 'MultiLineString', coordinates: [[[0,0],[1,1],[2,0]]] }

// ② 传入多条线 Position[][]
createMultiLineString([[[0,0],[1,1]], [[2,2],[3,3]]])
// → { type: 'MultiLineString', coordinates: [[[0,0],[1,1]], [[2,2],[3,3]]] }
```

#### `createMultiPolygon(coordinates)`

支持两种输入：

```javascript
// ① 传入单个多边形的环列表 Position[][]（自动包装）
createMultiPolygon([[[0,0],[1,0],[1,1],[0,1],[0,0]]])
// → { type: 'MultiPolygon', coordinates: [[[[0,0],[1,0],[1,1],[0,1],[0,0]]]] }

// ② 传入多个多边形 Position[][][]
createMultiPolygon([
  [[[0,0],[1,0],[1,1],[0,1],[0,0]]],
  [[[2,2],[3,2],[3,3],[2,3],[2,2]]]
])
// → { type: 'MultiPolygon', coordinates: [...] }
```

#### `createGeometryCollection(geometries)`

支持两种输入：

```javascript
// ① 传入单个 Geometry（自动包装）
createGeometryCollection(createPoint(0, 0))
// → { type: 'GeometryCollection', geometries: [{ type: 'Point', coordinates: [0,0] }] }

// ② 传入 Geometry[]
createGeometryCollection([
  createPoint(0, 0),
  createLineString([[0,0],[1,1]]),
  createPolygon([[0,0],[10,0],[10,10],[0,10],[0,0]])
])
// → { type: 'GeometryCollection', geometries: [...] }
```

---

## 类型定义

```typescript
// 坐标点（二维或三维）
type Position = [number, number] | [number, number, number];

// 几何类型
type Geometry =
  | Point              // { type: 'Point'; coordinates: Position }
  | LineString         // { type: 'LineString'; coordinates: Position[] }
  | Polygon            // { type: 'Polygon'; coordinates: Position[][] }
  | MultiPoint         // { type: 'MultiPoint'; coordinates: Position[] }
  | MultiLineString    // { type: 'MultiLineString'; coordinates: Position[][] }
  | MultiPolygon       // { type: 'MultiPolygon'; coordinates: Position[][][] }
  | GeometryCollection // { type: 'GeometryCollection'; geometries: Geometry[] }

// Feature：包含一个 Geometry 和任意属性
interface Feature<G extends Geometry = Geometry> {
  type: 'Feature';
  geometry: G | null;
  properties: Record<string, unknown> | null;
  id?: string | number;
}

// FeatureCollection：包含多个 Feature
interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

// 所有 GeoJSON 对象的联合类型
type GeoJSONObject = Geometry | Feature | FeatureCollection;
```

---

## 注意事项与边界行为

### POINT EMPTY

`POINT EMPTY` 在 GeoJSON 规范中没有对应表示（GeoJSON Point 不允许 `null` 坐标）。
解析时会**抛出错误**，建议改用 `Feature` 的 `null geometry`：

```javascript
// ❌ 会抛出错误
parse('POINT EMPTY');

// ✅ 推荐方式：用 null geometry Feature 表示空点
const emptyFeature = {
  type: 'Feature',
  geometry: null,
  properties: null
};
```

### LINESTRING / POLYGON 等 EMPTY

其他 EMPTY 几何会解析为空坐标数组，并在构建时输出 `EMPTY`：

```javascript
parse('LINESTRING EMPTY')
// → { type: 'LineString', coordinates: [] }

build({ type: 'LineString', coordinates: [] })
// → 'LINESTRING EMPTY'
```

### 科学计数法坐标

WKT 标准不支持科学计数法（如 `1e-7`）。`build()` 内部已做格式化处理，确保输出为标准十进制：

```javascript
build({ type: 'Point', coordinates: [0.0000001, 1.0000000] })
// → 'POINT (0.0000001 1)'  而非 'POINT (1e-7 1)'
```

### MULTIPOINT 标准格式

`build()` 输出符合 OGC/ISO 标准格式（每个点用括号包裹），可被 PostGIS、QGIS 等工具正确识别：

```javascript
build({ type: 'MultiPoint', coordinates: [[0,0],[1,1]] })
// → 'MULTIPOINT ((0 0), (1 1))'  ✅ 标准
// 不是：'MULTIPOINT (0 0, 1 1)'  ❌ 非标准
```

### 尾部垃圾字符检测

解析器会严格校验输入，发现几何体后的多余字符时抛出错误：

```javascript
parse('POINT (0 0) garbage')
// → Error: Unexpected trailing token after geometry: "garbage"
```

---

## 完整示例

### WKT → GeoJSON Feature → 回写 WKT

```javascript
import { wktToFeature, featureToWkt } from './dist/index.esm.js';

const wkt = 'POLYGON ((116 39, 117 39, 117 40, 116 40, 116 39))';

// 解析为 Feature
const feature = wktToFeature(wkt, { name: '某区域', area: 12345 });

// 修改属性
feature.properties.verified = true;

// 取回 WKT
const outputWkt = featureToWkt(feature);
console.log(outputWkt);
// → 'POLYGON ((116 39, 117 39, 117 40, 116 40, 116 39))'
```

### 批量城市点构建 FeatureCollection

```javascript
import { wktToFeatureCollection } from './dist/index.esm.js';

const cities = [
  { wkt: 'POINT (116.39 39.91)', props: { name: '北京', code: 'BJ' } },
  { wkt: 'POINT (121.47 31.23)', props: { name: '上海', code: 'SH' } },
  { wkt: 'POINT (113.26 23.13)', props: { name: '广州', code: 'GZ' } },
];

const fc = wktToFeatureCollection(
  cities.map(c => c.wkt),
  cities.map(c => c.props)
);

// 直接输出为 GeoJSON 字符串
console.log(JSON.stringify(fc, null, 2));
```

### 使用工厂方法组合复杂几何

```javascript
import { createPoint, createLineString, createPolygon, createGeometryCollection, build } from './dist/index.esm.js';

const collection = createGeometryCollection([
  createPoint(0, 0),
  createPoint(10, 10),
  createLineString([[0,0],[5,5],[10,0]]),
  createPolygon([[20,0],[30,0],[30,10],[20,10],[20,0]])  // 单环，自动包装
]);

console.log(build(collection));
// → 'GEOMETRYCOLLECTION (POINT (0 0), POINT (10 10), LINESTRING (0 0, 5 5, 10 0), POLYGON ((20 0, 30 0, 30 10, 20 10, 20 0)))'
```

---

## 本地调试

启动 HTTP 服务，在浏览器中测试 debug 页面：

```bash
# 方式一：npx serve
npx serve debug

# 方式二：Python
cd debug && python -m http.server 8080

# 方式三：http-server
npx http-server debug -p 8080
```

然后访问 `http://localhost:8080/index.html`，即可在页面中交互测试所有 API。

---

## License

MIT