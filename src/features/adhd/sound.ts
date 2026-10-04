// Sounds for ADHD mode (F32), all made with Web Audio: no audio files, so they work offline in
// both runtimes. The focus sound (brown, pink or white noise) plays while a focus block runs and
// stops at its end; the optional soft chime marks half time and 2 minutes left; the optional
// small sound marks a finished step. Everything is quiet by design, fades in and out, and does
// nothing where the browser has no Web Audio.
import { noiseLoop, type NoiseColor } from "@/lib/adhd/noise";

type AudioContextCtor = new () => AudioContext;

let factory: (() => AudioContext | null) | null = null;

/** Tests pass a fake; the app uses the browser's AudioContext. */
export function setAudioContextFactory(next: (() => AudioContext | null) | null): void {
  factory = next;
  context?.close?.().catch(() => undefined);
  context = null;
  buffers.clear();
  source = null;
  noiseGain = null;
  playing = null;
}

function browserContext(): AudioContext | null {
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

/** True where sound can play at all. */
export function soundAvailable(): boolean {
  if (factory) return true;
  const w = window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown };
  return Boolean(w.AudioContext ?? w.webkitAudioContext);
}

let context: AudioContext | null = null;
const buffers = new Map<NoiseColor, AudioBuffer>();
let source: AudioBufferSourceNode | null = null;
let noiseGain: GainNode | null = null;
let playing: NoiseColor | null = null;
let resumeArmed = false;

function audio(): AudioContext | null {
  if (!context) context = factory ? factory() : browserContext();
  if (context && context.state === "suspended") {
    context.resume().catch(() => undefined);
    // A page reloaded with a block running has no gesture yet: start on the first one.
    if (!resumeArmed) {
      resumeArmed = true;
      const resume = () => {
        resumeArmed = false;
        context?.resume().catch(() => undefined);
        window.removeEventListener("pointerdown", resume, true);
        window.removeEventListener("keydown", resume, true);
      };
      window.addEventListener("pointerdown", resume, true);
      window.addEventListener("keydown", resume, true);
    }
  }
  return context;
}

/** The volume setting (0 to 1) as a gain: squared, so the slider feels even. */
export function volumeGain(volume: number): number {
  const v = Math.max(0, Math.min(1, volume));
  return v * v * 0.9;
}

function noiseBuffer(ctx: AudioContext, color: NoiseColor): AudioBuffer {
  const cached = buffers.get(color);
  if (cached) return cached;
  const data = noiseLoop(color, ctx.sampleRate, Math.random);
  const buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
  buffer.getChannelData(0).set(data);
  buffers.set(color, buffer);
  return buffer;
}

/** Starts (or changes) the noise, fading in over 0.6 s. */
export function startNoise(color: NoiseColor, volume: number): void {
  const ctx = audio();
  if (!ctx) return;
  if (playing === color && noiseGain) {
    setNoiseVolume(volume);
    return;
  }
  stopNoise();
  const t = ctx.currentTime;
  const node = ctx.createBufferSource();
  node.buffer = noiseBuffer(ctx, color);
  node.loop = true;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volumeGain(volume), t + 0.6);
  node.connect(gain);
  gain.connect(ctx.destination);
  node.start(t);
  source = node;
  noiseGain = gain;
  playing = color;
}

export function setNoiseVolume(volume: number): void {
  if (!context || !noiseGain) return;
  const t = context.currentTime;
  noiseGain.gain.cancelScheduledValues(t);
  noiseGain.gain.setValueAtTime(noiseGain.gain.value, t);
  noiseGain.gain.linearRampToValueAtTime(volumeGain(volume), t + 0.2);
}

/** Fades the noise out over 0.4 s and stops it. */
export function stopNoise(): void {
  if (!context || !source || !noiseGain) {
    source = null;
    noiseGain = null;
    playing = null;
    return;
  }
  const t = context.currentTime;
  noiseGain.gain.cancelScheduledValues(t);
  noiseGain.gain.setValueAtTime(noiseGain.gain.value, t);
  noiseGain.gain.linearRampToValueAtTime(0, t + 0.4);
  try {
    source.stop(t + 0.45);
  } catch {
    /* already stopped */
  }
  source = null;
  noiseGain = null;
  playing = null;
}

/** The noise playing now, if any. */
export function noisePlaying(): NoiseColor | null {
  return playing;
}

let previewTimer: ReturnType<typeof setTimeout> | null = null;

/** Settings → "Play a sample": a few seconds of the chosen noise. */
export function previewNoise(color: NoiseColor, volume: number, seconds = 4): void {
  startNoise(color, volume);
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    previewTimer = null;
    if (!keepPlaying) stopNoise();
  }, seconds * 1000);
}

/** While a block runs the noise keeps going after a preview. */
let keepPlaying = false;
export function setKeepPlaying(on: boolean): void {
  keepPlaying = on;
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  length: number,
  peak: number,
  endFreq?: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + length * 0.6);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

/** A soft two-note chime (half time, 2 minutes left). */
export function playChime(volume: number): void {
  const ctx = audio();
  if (!ctx) return;
  const peak = 0.12 * volumeGain(Math.max(volume, 0.3));
  const t = ctx.currentTime + 0.01;
  tone(ctx, 784, t, 1.4, peak);
  tone(ctx, 1176, t + 0.12, 1.2, peak * 0.6);
}

/** A small, short sound for a finished step. */
export function playInk(volume: number): void {
  const ctx = audio();
  if (!ctx) return;
  tone(ctx, 660, ctx.currentTime + 0.01, 0.25, 0.08 * volumeGain(Math.max(volume, 0.3)), 990);
}
