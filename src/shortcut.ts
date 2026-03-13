import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { EnhancementServices } from "./enhance.js";
import { enhanceEditorDraft } from "./enhance.js";
import { detectRuntimeSupport } from "./validation.js";
import type { AugmentRuntimeState } from "./state.js";

interface ShortcutServices extends EnhancementServices {
  openSettings: (ctx: ExtensionContext) => Promise<void>;
}

export async function handleAugmentShortcut(
  ctx: ExtensionContext,
  runtime: AugmentRuntimeState,
  services: ShortcutServices
): Promise<void> {
  const settings = runtime.getSettings();
  if (!settings.enabled) {
    ctx.ui.notify("Augment is disabled globally.", "info");
    return;
  }
  if (!settings.shortcutEnabled) {
    ctx.ui.notify("Augment shortcut is disabled globally.", "info");
    return;
  }

  try {
    const support = detectRuntimeSupport(ctx);
    if (support.interactiveTui && !ctx.ui.getEditorText().trim()) {
      ctx.ui.notify("Editor is empty — opening Augment settings.", "info");
      await services.openSettings(ctx);
      return;
    }

    await enhanceEditorDraft(ctx, runtime, services);
  } catch (error) {
    ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
  }
}
