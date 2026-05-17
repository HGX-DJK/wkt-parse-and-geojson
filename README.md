# WKT Parse and GeoJSON

一个轻量级的 WKT 和 GeoJSON 解析/构建库，支持在 WKT 字符串和 Geometry 对象之间互相转换。

## 功能特性

- **WKT 解析**：将 WKT 字符串解析为 Geometry 对象
- **WKT 构建**：将 Geometry 对象转换为 WKT 字符串
- **GeoJSON 工厂**：快速创建各种 Geometry 对象
- **完整类型支持**：使用 TypeScript 编写，提供完整类型提示

## 支持的几何类型

| WKT 类型 | 说明 |
|---------|------|
| `POINT` | 点 |
| `LINESTRING` | 线 |
| `POLYGON` | 多边形 |
| `MULTIPOINT` | 点集合 |
| `MULTILINESTRING` | 线集合 |
| `MULTIPOLYGON` | 多边形集合 |
| `GEOMETRYCOLLECTION` | 几何集合 |

## 安装

```bash
npm install
```

## 构建

```bash
# 构建生产版本
npm run build

# 监听文件变化自动构建
npm run dev

# 类型检查
npm run typecheck
```

构建完成后会生成两个文件：
- `dist/index.cjs.js` - CommonJS 格式 (Node.js)
- `dist/index.esm.js` - ES Module 格式 (浏览器)

## 快速开始

### 在 Node.js 中使用

```javascript
// CommonJS
const { parse, build, createPoint } = require('./dist/index.cjs.js');

// 或 ES Module
import { parse, build, createPoint } from './dist/index.esm.js';
```

### 在浏览器中使用

```html
<script type="module">
  import { parse, build, createPoint } from '../dist/index.esm.js';

  // 解析 WKT
  const geom = parse('POINT (30.5 40.5)');
  console.log(geom);
  // { type: 'Point', coordinates: [30.5, 40.5] }

  // 构建 WKT
  const wkt = build(geom);
  console.log(wkt);
  // "POINT (30.5 40.5)"
</script>
```

## API 文档

### 1. parse(wkt)

将 WKT 字符串解析为 Geometry 对象。

**参数：**
- `wkt` (string): WKT 格式的字符串

**返回：** `Geometry` 对象

**示例：**
```javascript
// POINT
parse('POINT (30.5 40.5)')
// → { type: 'Point', coordinates: [30.5, 40.5] }

// 带 Z 坐标
parse('POINT (30.5 40.5 100)')
// → { type: 'Point', coordinates: [30.5, 40.5, 100] }

// LINESTRING
parse('LINESTRING (30.5 40.5, 31.5 41.5, 32.5 40.5)')
// → { type: 'LineString', coordinates: [[30.5, 40.5], [31.5, 41.5], [32.5, 40.5]] }

// POLYGON
parse('POLYGON ((0 0, 1 0, 1 1, 0 1, 0 0))')
// → { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }

// 带空洞的多边形
parse('POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0), (2 2, 4 2, 4 4, 2 4, 2 2))')

// MULTIPOINT
parse('MULTIPOINT ((0 0), (1 1), (2 2)')
// → { type: 'MultiPoint', coordinates: [[0, 0], [1, 1], [2, 2]] }

// MULTILINESTRING
parse('MULTILINESTRING ((0 0, 1 1), (2 2, 3 3))')

// MULTIPOLYGON
parse('MULTIPOLYGON (((0 0, 1 0, 1 1, 0 1, 0 0)))')

// GEOMETRYCOLLECTION
parse('GEOMETRYCOLLECTION (POINT (0 0), LINESTRING (0 0, 1 1))')
```

### 2. build(geometry)

将 Geometry 对象转换为 WKT 字符串。

**参数：**
- `geometry` (Geometry): Geometry 对象

**返回：** WKT 字符串

**示例：**
```javascript
// Point
build({ type: 'Point', coordinates: [30.5, 40.5] })
// → "POINT (30.5 40.5)"

// LineString
build({ type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 0]] })
// → "LINESTRING (0 0, 1 1, 2 0"

// Polygon
build({ type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] })
// → "POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0))"
```

### 3. 工厂方法

快速创建 Geometry 对象。

#### createPoint(x, y, z?)

创建 Point。

```javascript
createPoint(30.5, 40.5)
// → { type: 'Point', coordinates: [30.5, 40.5] }

createPoint(30.5, 40.5, 100)
// → { type: 'Point', coordinates: [30.5, 40.5, 100] }
```

#### createLineString(coordinates)

创建 LineString。

```javascript
createLineString([[0, 0], [1, 1], [2, 0]])
// → { type: 'LineString', coordinates: [[0, 0], [1, 1], [2, 0]] }
```

#### createPolygon(coordinates)

创建 Polygon。

```javascript
// 单个环（无空洞）
createPolygon([[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]])
// → { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] }

// 带空洞：外环 + 内环
createPolygon([
  [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],  // 外环
  [[2, 2], [4, 2], [4, 4], [2, 4], [2, 2]]       // 内环（空洞）
])
```

#### createMultiPoint(coordinates)

创建 MultiPoint。

```javascript
createMultiPoint([[0, 0], [1, 1], [2, 2]])
// → { type: 'MultiPoint', coordinates: [[0, 0], [1, 1], [2, 2]] }
```

#### createMultiLineString(coordinates)

创建 MultiLineString。

```javascript
createMultiLineString([[[0, 0], [1, 1]], [[2, 2], [3, 3]]])
// → { type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]], [[2, 2], [3, 3]]] }
```

#### createMultiPolygon(coordinates)

创建 MultiPolygon。

```javascript
createMultiPolygon([[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]])
```

#### createGeometryCollection(geometries)

创建 GeometryCollection。

```javascript
createGeometryCollection([
  { type: 'Point', coordinates: [0, 0] },
  { type: 'LineString', coordinates: [[0, 0], [1, 1]] }
])
// → { type: 'GeometryCollection', geometries: [...] }
```

## 完整示例

### WKT → Geometry → WKT 往返转换

```javascript
import { parse, build } from './dist/index.esm.js';

const wkt = 'POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0))';

// 解析
const geom = parse(wkt);
console.log(geom);
// { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] }

// 构建回 WKT
const rebuilt = build(geom);
console.log(rebuilt);
// "POLYGON ((0 0, 10 0, 10 10, 0 10, 0 0))"
```

### 使用工厂方法组合复杂几何

```javascript
import {
  createPoint,
  createLineString,
  createPolygon,
  createGeometryCollection,
  build
} from './dist/index.esm.js';

// 创建几何集合
const collection = createGeometryCollection([
  createPoint(0, 0),
  createPoint(10, 10),
  createLineString([[0, 0], [5, 5], [10, 0]]),
  createPolygon([[[20, 0], [30, 0], [30, 10], [20, 10], [20, 0]]])
]);

// 构建为 WKT
const wkt = build(collection);
console.log(wkt);
// "GEOMETRYCOLLECTION (POINT (0 0), POINT (10 10), LINESTRING (0 0, 5 5, 10 0), POLYGON ((20 0, 30 0, 30 10, 20 10, 20 0)))"
```

## 数据结构

### Position（坐标点）
```typescript
type Position = [number, number] | [number, number, number];
```

### Geometry 类型

| 类型 | coordinates 结构 |
|------|------------------|
| Point | `Position` |
| LineString | `Position[]` |
| Polygon | `Position[][]`（第一个是外环，后续是内环/空洞） |
| MultiPoint | `Position[]` |
| MultiLineString | `Position[][]` |
| MultiPolygon | `Position[][][]` |
| GeometryCollection | `Geometry[]` |

## 本地测试

启动一个本地服务器来测试 debug 页面：

```bash
# 使用 npx
npx serve debug

# 或使用 Python
cd debug
python -m http.server 8080

# 或使用 Node.js 内置服务器
cd debug
npx http-server -p 8080
```

然后在浏览器中打开 `http://localhost:8080/index.html`

## License

MIT