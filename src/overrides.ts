import { normalize } from "./model-routing.js";
import type { ModelRef, AugmentFamily, AugmentSettings } from "./types.js";

export function upsertExactModelOverride(
  settings: AugmentSettings,
  modelRef: ModelRef,
  family: AugmentFamily
): AugmentSettings {
  return {
    ...settings,
    exactModelOverrides: [
      ...settings.exactModelOverrides.filter(
        (entry) =>
          !(
            normalize(entry.provider) === normalize(modelRef.provider) &&
            normalize(entry.id) === normalize(modelRef.id)
          )
      ),
      { ...modelRef, family },
    ],
  };
}

export function removeExactModelOverride(
  settings: AugmentSettings,
  modelRef: ModelRef
): AugmentSettings {
  return {
    ...settings,
    exactModelOverrides: settings.exactModelOverrides.filter(
      (entry) =>
        !(
          normalize(entry.provider) === normalize(modelRef.provider) &&
          normalize(entry.id) === normalize(modelRef.id)
        )
    ),
  };
}

export function upsertFamilyOverride(
  settings: AugmentSettings,
  pattern: string,
  family: AugmentFamily
): AugmentSettings {
  return {
    ...settings,
    familyOverrides: [
      ...settings.familyOverrides.filter(
        (entry) => normalize(entry.pattern) !== normalize(pattern)
      ),
      { pattern, family },
    ],
  };
}

export function removeFamilyOverride(
  settings: AugmentSettings,
  pattern: string
): AugmentSettings {
  return {
    ...settings,
    familyOverrides: settings.familyOverrides.filter(
      (entry) => normalize(entry.pattern) !== normalize(pattern)
    ),
  };
}
