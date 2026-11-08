/** A style or part of one: nested plain objects, copied one level at a time. */
type Style = any;

const oneDepthCopy = (obj: Style, nestKeys: readonly string[]) => ({
  ...obj,
  ...nestKeys.reduce((memo: Style, key) => {
    if (obj[key]) memo[key] = {...obj[key]};
    return memo;
  }, {}),
});

const setIfExists = (src: Style, dst: Style, key: string, nestKeys: readonly string[] = []) => {
  if (src[key]) dst[key] = oneDepthCopy(src[key], nestKeys);
};

const isEmptyObj = (obj: object) => Object.keys(obj).length === 0;

/** Copies a cell style so that edits to the copy never reach the original. */
const copyStyle = (style: Style) => {
  if (!style) return style;
  if (isEmptyObj(style)) return {};

  const copied = {...style};

  setIfExists(style, copied, 'font', ['color']);
  setIfExists(style, copied, 'alignment');
  setIfExists(style, copied, 'protection');
  if (style.border) {
    setIfExists(style, copied, 'border');
    setIfExists(style.border, copied.border, 'top', ['color']);
    setIfExists(style.border, copied.border, 'left', ['color']);
    setIfExists(style.border, copied.border, 'bottom', ['color']);
    setIfExists(style.border, copied.border, 'right', ['color']);
    setIfExists(style.border, copied.border, 'diagonal', ['color']);
  }

  if (style.fill) {
    setIfExists(style, copied, 'fill', ['fgColor', 'bgColor', 'center']);
    if (style.fill.stops) {
      copied.fill.stops = style.fill.stops.map((s: any) => oneDepthCopy(s, ['color']));
    }
  }

  return copied;
};

export { copyStyle };
