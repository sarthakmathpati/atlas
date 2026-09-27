// Color math shared by scripts/build-subject-colors.mjs and the token tests: OKLCH to sRGB hex
// (out-of-gamut channels are clipped, which reproduces BUILD_SPEC.md 12.10.3's table exactly),
// parsing the color forms used in tokens.css, alpha compositing and WCAG 2 contrast.

/** OKLCH (L 0-1, C, hue in degrees) to linear sRGB, unclipped. */
export function oklchToLinearRgb(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const encode = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
const decode = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** OKLCH to a lowercase #rrggbb, clipping each channel into the sRGB gamut. */
export function oklchToHex(L, C, h) {
  return (
    "#" +
    oklchToLinearRgb(L, C, h)
      .map((v) =>
        Math.round(clamp01(encode(clamp01(v))) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** Parses #rgb, #rrggbb, rgb(r g b), rgb(r g b / a) and rgba(r, g, b, a) into [r, g, b, a]. */
export function parseColor(text) {
  const c = text.trim().toLowerCase();
  if (c.startsWith("#")) {
    let hex = c.slice(1);
    if (hex.length === 3)
      hex = hex
        .split("")
        .map((x) => x + x)
        .join("");
    if (!/^[0-9a-f]{6}$/.test(hex)) throw new Error(`Not a color: ${text}`);
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(1);
  }
  const m = c.match(/^rgba?\(([^)]+)\)$/);
  if (!m) throw new Error(`Not a color: ${text}`);
  const parts = m[1]
    .replace("/", " ")
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n)))
    throw new Error(`Not a color: ${text}`);
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

/** Paints `fg` (which may be translucent) over an opaque `bg`. */
export function composite(fg, bg) {
  const a = fg[3];
  return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)).concat(1);
}

/** WCAG 2 relative luminance of an opaque color. */
export function luminance([r, g, b]) {
  return 0.2126 * decode(r / 255) + 0.7152 * decode(g / 255) + 0.0722 * decode(b / 255);
}

/** WCAG 2 contrast ratio between two opaque colors (1 to 21). */
export function contrast(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** An opaque color to OKLCH [L, C, hue in degrees]. */
export function rgbToOklch([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map((c) => decode(c / 255));
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}
