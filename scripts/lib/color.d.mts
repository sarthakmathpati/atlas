// Types for scripts/lib/color.mjs (used by tests).
export type Rgba = [number, number, number, number];
export function oklchToLinearRgb(L: number, C: number, h: number): [number, number, number];
export function oklchToHex(L: number, C: number, h: number): string;
export function parseColor(text: string): Rgba;
export function composite(fg: Rgba, bg: Rgba): Rgba;
export function luminance(color: Rgba): number;
export function contrast(a: Rgba, b: Rgba): number;
export function rgbToOklch(color: Rgba): [number, number, number];
