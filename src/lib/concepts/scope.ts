// Which concepts count for the owner: the track (SDE, Quant or both), concepts they hid from the
// map, and the language topics of languages they don't use (section 6, language note: those are
// dimmed on the map and left out of readiness, the plan and recommendations).
import { LANGUAGE_TOPICS } from "@/lib/constants";
import type { Concept, PrimaryLanguage, Profile, Track, TrackId } from "@/lib/types";

/** A concept, topic or subject belongs to the track when it lists it ("both" takes everything). */
export function inTrack(tracks: readonly TrackId[], track: Track): boolean {
  return track === "both" || tracks.includes(track);
}

const LANGUAGE_OF_TOPIC: ReadonlyMap<string, PrimaryLanguage> = new Map(
  (Object.entries(LANGUAGE_TOPICS) as [PrimaryLanguage, string[]][]).flatMap(([lang, ids]) =>
    ids.map((id) => [id, lang] as const),
  ),
);

type LanguagePrefs = Pick<Profile, "primaryLanguage"> & {
  prefs: Pick<Profile["prefs"], "extraLanguages">;
};

/** False for another language's topics (C++, Java, Python) unless the owner added that language. */
export function languageCounts(
  topicId: string,
  profile: LanguagePrefs | null | undefined,
): boolean {
  const lang = LANGUAGE_OF_TOPIC.get(topicId);
  if (!lang || !profile) return true;
  return lang === profile.primaryLanguage || profile.prefs.extraLanguages.includes(lang);
}

export interface ScopeContext {
  track: Track;
  profile: LanguagePrefs | null | undefined;
  isHidden: (conceptId: string) => boolean;
}

/** In the owner's track, not hidden, and not another language's topic. */
export function inScope(concept: Concept, ctx: ScopeContext): boolean {
  return (
    inTrack(concept.tracks, ctx.track) &&
    !ctx.isHidden(concept.id) &&
    languageCounts(concept.topicId, ctx.profile)
  );
}
