/*
 * The few collection helpers the library needs, each accepting an array or a
 * plain object (and tolerating null/undefined), as the workbook model uses both.
 */

type Collection<T> = readonly T[] | Readonly<Record<string, T>> | null | undefined;

const { toString } = Object.prototype;
const escapeHtmlRegex = /["&<>]/;

/** Calls `cb(value, indexOrKey)` for each entry. */
export function each<T>(obj: Collection<T>, cb: (value: T, key: any) => void): void {
  if (obj) {
    if (Array.isArray(obj)) {
      obj.forEach(cb);
    } else {
      Object.keys(obj).forEach(key => {
        cb((obj as Record<string, T>)[key], key);
      });
    }
  }
}

export function some<T>(obj: Collection<T>, cb: (value: T, key: any) => unknown): boolean {
  if (obj) {
    if (Array.isArray(obj)) {
      return obj.some(cb);
    }
    return Object.keys(obj).some(key => cb((obj as Record<string, T>)[key], key));
  }
  return false;
}

export function every<T>(obj: Collection<T>, cb: (value: T, key: any) => unknown): boolean {
  if (obj) {
    if (Array.isArray(obj)) {
      return obj.every(cb);
    }
    return Object.keys(obj).every(key => cb((obj as Record<string, T>)[key], key));
  }
  return true;
}

export function map<T, R>(obj: Collection<T>, cb: (value: T, key: any) => R): R[] {
  if (obj) {
    if (Array.isArray(obj)) {
      return obj.map(cb);
    }
    return Object.keys(obj).map(key => cb((obj as Record<string, T>)[key], key));
  }
  return [];
}

/** Indexes `items` by the value of property `prop`. */
export function keyBy<T extends Record<string, any>>(items: readonly T[], prop: string): Record<string, T> {
  return items.reduce<Record<string, T>>((o, v) => {
    o[v[prop]] = v;
    return o;
  }, {});
}

/** Structural equality over plain data: primitives, arrays and plain objects. */
export function isEqual(a: any, b: any): boolean {
  if (typeof a !== typeof b) {
    return false;
  }
  if (typeof a !== "object") {
    return a === b;
  }
  const aArray = Array.isArray(a);
  const bArray = Array.isArray(b);
  if (aArray || bArray) {
    return aArray && bArray && a.length === b.length && a.every((aValue: any, index: number) => isEqual(aValue, b[index]));
  }
  if (a === null || b === null) {
    return a === b;
  }

  // Compare object keys and values
  const keys = Object.keys(a);
  if (Object.keys(b).length !== keys.length) {
    return false;
  }
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) {
      return false;
    }
  }
  return keys.every(key => isEqual(a[key], b[key]));
}

export function escapeHtml(html: string): string {
  const regexResult = escapeHtmlRegex.exec(html);
  if (!regexResult) return html;

  let result = "";
  let escape = "";
  let lastIndex = 0;
  let i = regexResult.index;
  for (; i < html.length; i++) {
    switch (html.charAt(i)) {
      case '"':
        escape = "&quot;";
        break;
      case "&":
        escape = "&amp;";
        break;
      case "'":
        escape = "&apos;";
        break;
      case "<":
        escape = "&lt;";
        break;
      case ">":
        escape = "&gt;";
        break;
      default:
        continue;
    }
    if (lastIndex !== i) result += html.substring(lastIndex, i);
    lastIndex = i + 1;
    result += escape;
  }
  if (lastIndex !== i) return result + html.substring(lastIndex, i);
  return result;
}

export function strcmp(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function isUndefined(val: unknown): val is undefined {
  return toString.call(val) === "[object Undefined]";
}

export function isObject(val: unknown): val is Record<string, any> {
  return toString.call(val) === "[object Object]";
}

/**
 * Merges the sources into the first one, recursing into plain objects and
 * arrays; `undefined` values are skipped. Returns the first argument (or a new
 * object if it is falsy).
 */
export function deepMerge(...args: any[]): any {
  const target = args[0] || {};

  function assignValue(val: any, key: string): void {
    const src = target[key];
    const copyIsArray = Array.isArray(val);
    if (isObject(val) || copyIsArray) {
      let clone: any;
      if (copyIsArray) {
        clone = src && Array.isArray(src) ? src : [];
      } else {
        clone = src && isObject(src) ? src : {};
      }
      target[key] = deepMerge(clone, val);
    } else if (!isUndefined(val)) {
      target[key] = val;
    }
  }

  for (const arg of args) {
    each(arg, assignValue);
  }
  return target;
}
