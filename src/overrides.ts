import type { ModelRef, PromptsmithFamily, PromptsmithSettings } from "./types.js";

export function upsertExactModelOverride(
  settings: PromptsmithSettings,
  modelRef: ModelRef,
  family: PromptsmithFamily
): PromptsmithSettings {
  return {
    ...settings,
    exactModelOverrides: [
      ...settings.exactModelOverrides.filter(
        (entry) => !(entry.provider === modelRef.provider && entry.id === modelRef.id)
      ),
      { ...modelRef, family },
    ],
  };
}
