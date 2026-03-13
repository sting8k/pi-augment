import type { ModelRef, AugmentFamily, AugmentSettings } from "./types.js";

export function setActiveEnhancerModelMode(settings: AugmentSettings): AugmentSettings {
  const next = { ...settings, enhancerModelMode: "active" as const };
  delete next.fixedEnhancerModel;
  delete next.familyEnhancerModels;
  return next;
}

export function setFixedEnhancerModel(
  settings: AugmentSettings,
  modelRef: ModelRef
): AugmentSettings {
  return {
    ...setActiveEnhancerModelMode(settings),
    enhancerModelMode: "fixed",
    fixedEnhancerModel: modelRef,
  };
}

export function clearFixedEnhancerModel(settings: AugmentSettings): AugmentSettings {
  if (settings.enhancerModelMode === "fixed") {
    return setActiveEnhancerModelMode(settings);
  }

  const next = { ...settings };
  delete next.fixedEnhancerModel;
  return next;
}

export function setFamilyEnhancerModel(
  settings: AugmentSettings,
  family: AugmentFamily,
  modelRef: ModelRef
): AugmentSettings {
  const familyEnhancerModels = {
    ...(settings.familyEnhancerModels ?? {}),
    [family]: modelRef,
  };
  const enhancerModelMode =
    familyEnhancerModels.gpt && familyEnhancerModels.claude
      ? ("family-linked" as const)
      : settings.enhancerModelMode === "fixed"
        ? ("active" as const)
        : settings.enhancerModelMode;
  const next: AugmentSettings = {
    ...settings,
    enhancerModelMode,
    familyEnhancerModels,
  };
  delete next.fixedEnhancerModel;
  if (next.enhancerModelMode !== "family-linked") {
    delete next.familyEnhancerModels;
  }
  return next;
}

export function clearFamilyEnhancerModel(
  settings: AugmentSettings,
  family: AugmentFamily
): AugmentSettings {
  if (settings.enhancerModelMode === "family-linked") {
    return setActiveEnhancerModelMode(settings);
  }

  const nextFamilyModels = { ...(settings.familyEnhancerModels ?? {}) };
  delete nextFamilyModels[family];

  if (Object.keys(nextFamilyModels).length === 0) {
    const next = { ...settings };
    delete next.familyEnhancerModels;
    return next;
  }

  return { ...settings, familyEnhancerModels: nextFamilyModels };
}
