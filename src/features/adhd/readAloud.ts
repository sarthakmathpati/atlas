// Read aloud (F32, part 8): the browser's own voice (speechSynthesis), hidden where the browser
// has none. Voices installed on the device are preferred, so it works offline. Text is read a
// few sentences at a time, which keeps long parts from stopping half way in some browsers.
type Speech = Pick<SpeechSynthesis, "speak" | "cancel" | "getVoices">;

function synth(): Speech | null {
  if (typeof window === "undefined") return null;
  const s = (window as { speechSynthesis?: Speech }).speechSynthesis;
  return s && typeof SpeechSynthesisUtterance !== "undefined" ? s : null;
}

/** True where the browser can read aloud. */
export function speechAvailable(): boolean {
  return synth() !== null;
}

/** Splits text into chunks of whole sentences, about `max` characters each. */
export function speechChunks(text: string, max = 220): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let chunk = "";
  for (const s of sentences) {
    if (chunk && chunk.length + s.length > max) {
      chunks.push(chunk.trim());
      chunk = "";
    }
    chunk += s;
  }
  if (chunk.trim()) chunks.push(chunk.trim());
  return chunks;
}

function pickVoice(s: Speech): SpeechSynthesisVoice | undefined {
  const voices = s.getVoices();
  const lang = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  const fits = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
  return (
    fits.find((v) => v.localService && v.default) ?? fits.find((v) => v.localService) ?? fits[0]
  );
}

let current: { cancelled: boolean } | null = null;

/** Reads `text` aloud; `onEnd` runs when it finishes or stops. Returns a function that stops it. */
export function speak(text: string, onEnd?: () => void): () => void {
  const s = synth();
  if (!s) {
    onEnd?.();
    return () => undefined;
  }
  stopSpeaking();
  const run = { cancelled: false };
  current = run;
  const chunks = speechChunks(text);
  const voice = pickVoice(s);
  let i = 0;
  const finish = () => {
    if (current === run) current = null;
    onEnd?.();
  };
  const next = () => {
    if (run.cancelled) return;
    if (i >= chunks.length) {
      finish();
      return;
    }
    const u = new SpeechSynthesisUtterance(chunks[i++]!);
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.onend = next;
    u.onerror = () => {
      run.cancelled = true;
      finish();
    };
    s.speak(u);
  };
  next();
  return () => {
    if (run.cancelled) return;
    run.cancelled = true;
    s.cancel();
    finish();
  };
}

/** Stops anything being read. */
export function stopSpeaking(): void {
  if (!current) return;
  current.cancelled = true;
  current = null;
  synth()?.cancel();
}
