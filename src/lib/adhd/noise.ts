// Focus sound (F32, part 9): brown, pink or white noise made in the browser, no audio files.
// A few seconds of noise are generated once and looped. The loop is seamless: the buffer's
// first moments are cross-faded with the noise that would follow its end, so there is no click
// where it starts again. Each color is brought to the same loudness, so switching colors keeps
// the volume. Pure; the player (features/adhd/sound.ts) feeds it to Web Audio.
import type { FocusSound } from "@/lib/types";

export type NoiseColor = Exclude<FocusSound, "off">;

/** Seconds of noise in the loop. */
export const NOISE_SECONDS = 6;
/** The cross-fade at the loop point, in seconds. */
export const LOOP_FADE_SECONDS = 0.25;
/** Every color is scaled to this root-mean-square level (well below clipping). */
export const NOISE_RMS = 0.18;

/** The raw generator for a color: white is flat, pink falls 3 dB and brown 6 dB per octave. */
function generator(color: NoiseColor, random: () => number): () => number {
  if (color === "white") return () => random() * 2 - 1;
  if (color === "pink") {
    // Paul Kellet's refined filter: a sum of first-order low-passes approximating 1/f.
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    return () => {
      const white = random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      const out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
      return out;
    };
  }
  // Brown: a leaky running sum of white noise (integrated, so it falls 6 dB per octave).
  let last = 0;
  return () => {
    last = (last + 0.02 * (random() * 2 - 1)) / 1.02;
    return last;
  };
}

/** Root mean square of a signal. */
export function rms(samples: Float32Array): number {
  let sum = 0;
  for (const s of samples) sum += s * s;
  return Math.sqrt(sum / Math.max(1, samples.length));
}

/**
 * `seconds` of looping noise at `sampleRate`. `random` returns numbers in [0, 1) (seeded in
 * tests; Math.random in the app).
 */
export function noiseLoop(
  color: NoiseColor,
  sampleRate: number,
  random: () => number,
  seconds = NOISE_SECONDS,
): Float32Array {
  const length = Math.max(1, Math.round(seconds * sampleRate));
  const fade = Math.min(length, Math.round(LOOP_FADE_SECONDS * sampleRate));
  const next = generator(color, random);
  // Let the filters settle before recording, so the start isn't quieter than the rest.
  for (let i = 0; i < sampleRate; i++) next();
  const raw = new Float32Array(length + fade);
  for (let i = 0; i < raw.length; i++) raw[i] = next();
  // Remove any slow drift (brown noise wanders), then make the loop seamless.
  let mean = 0;
  for (const s of raw) mean += s;
  mean /= raw.length;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const x = raw[i]! - mean;
    if (i < fade) {
      const w = ((i + 0.5) / fade) * (Math.PI / 2);
      out[i] = x * Math.sin(w) + (raw[length + i]! - mean) * Math.cos(w);
    } else {
      out[i] = x;
    }
  }
  const level = rms(out);
  const gain = level > 0 ? NOISE_RMS / level : 0;
  for (let i = 0; i < length; i++) out[i] = Math.max(-1, Math.min(1, out[i]! * gain));
  return out;
}

/** The average squared step between neighbouring samples, relative to the signal's power: high
 *  for white noise, low for brown (a rough measure of how much high-frequency sound it has). */
export function roughness(samples: Float32Array): number {
  let diff = 0;
  for (let i = 1; i < samples.length; i++) {
    const d = samples[i]! - samples[i - 1]!;
    diff += d * d;
  }
  const power = rms(samples) ** 2;
  return power > 0 ? diff / (samples.length - 1) / power : 0;
}
