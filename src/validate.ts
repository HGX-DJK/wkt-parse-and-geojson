import { Geometry } from './types';
import { parse } from './wkt-parser';
import { build } from './wkt-builder';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 校验 WKT 字符串格式是否合法
 */
export function validateWKT(wkt: string): ValidationResult {
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
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
}

/**
 * 校验 GeoJSON Geometry 对象是否合法
 */
export function validateGeoJSON(geojson: unknown): ValidationResult {
  if (!geojson || typeof geojson !== 'object') {
    return { valid: false, error: 'GeoJSON must be an object' };
  }

  const obj = geojson as Record<string, unknown>;

  // 检查 type 字段
  if (!obj.type || typeof obj.type !== 'string') {
    return { valid: false, error: 'GeoJSON must have a "type" property' };
  }

  const type = obj.type as string;
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

function validateCoordinates(type: string, coords: unknown): ValidationResult {
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

function validatePosition(pos: unknown): ValidationResult {
  if (!Array.isArray(pos)) {
    return { valid: false, error: 'Position must be an array of numbers' };
  }

  if (pos.length < 2 || pos.length > 3) {
    return { valid: false, error: `Position must have 2 or 3 coordinates, got ${pos.length}` };
  }

  for (let i = 0; i < pos.length; i++) {
    if (typeof pos[i] !== 'number' || isNaN(pos[i] as number)) {
      return { valid: false, error: `Position[${i}] must be a valid number` };
    }
  }

  return { valid: true };
}

/**
 * 尝试从可能不规范的 WKT 中恢复出有效结果
 * 主要处理尾部多余字符的情况
 */
export function tryFixWKT(wkt: string): { fixed: string; changed: boolean } {
  const trimmed = wkt.trim();
  if (!trimmed) {
    return { fixed: wkt, changed: false };
  }

  // 先尝试直接解析，如果成功则不需要修复
  try {
    parse(trimmed);
    return { fixed: trimmed, changed: false };
  } catch {
    // 解析失败，尝试修复
  }

  // 尝试找到最后一个有效的 geometry 结束位置
  const patterns = [
    /\)\s*[A-Z]/i,           // 括号后跟字母 (如 POLYGON ((...)) POINT )
    /EMPTY\s+[A-Z]/i,        // EMPTY 后跟字母
    /\)\s*$/,                // 括号结尾后有多余内容
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const fixed = trimmed.slice(0, match.index! + (match[0].match(/\)/)?.[0].length || 0));
      try {
        parse(fixed);
        return { fixed, changed: true };
      } catch {
        // 这个修复方案不行，尝试下一个
      }
    }
  }

  // 尝试去除尾部垃圾字符
  const lastValidIndex = findLastValidPosition(trimmed);
  if (lastValidIndex > 0) {
    const fixed = trimmed.slice(0, lastValidIndex + 1);
    try {
      parse(fixed);
      return { fixed, changed: true };
    } catch {
      // 修复失败
    }
  }

  return { fixed: wkt, changed: false };
}

function findLastValidPosition(wkt: string): number {
  // 从后往前找第一个有效的右括号位置
  let depth = 0;
  for (let i = wkt.length - 1; i >= 0; i--) {
    const c = wkt[i];
    if (c === ')') depth++;
    else if (c === '(') depth--;
    else if (c === ' ' && depth === 0 && i < wkt.length - 1) {
      // 检查这个空格是否在有效位置
      const afterSpace = wkt.slice(i + 1).trim();
      if (!afterSpace) continue;
      if (!/^[A-Z]/.test(afterSpace)) continue;
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
export function cloneGeometry<G extends Geometry>(geometry: G): G {
  return JSON.parse(JSON.stringify(geometry));
}

/**
 * 判断两个几何对象是否相等（坐标对比）
 */
export function geometryEquals(a: Geometry, b: Geometry): boolean {
  if (a.type !== b.type) return false;

  // Point 比较最常见，单独优化
  if (a.type === 'Point') {
    const aCoords = (a as { coordinates: number[] }).coordinates;
    const bCoords = (b as { coordinates: number[] }).coordinates;
    return aCoords.length === bCoords.length &&
           aCoords[0] === bCoords[0] &&
           aCoords[1] === bCoords[1] &&
           (aCoords.length === 2 || aCoords[2] === bCoords[2]);
  }

  // 其他类型使用 JSON.stringify（缓存 key 优化可后续添加）
  return JSON.stringify(a) === JSON.stringify(b);
}