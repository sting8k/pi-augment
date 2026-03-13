import { complete } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { CompleteFn } from "./enhance.js";
import { EXTENSION_COMMAND, SHORTCUT_KEY } from "./constants.js";
import { getAugmentArgumentCompletions, handleAugmentCommand } from "./commands.js";
import { AugmentRuntimeState } from "./state.js";
import { handleAugmentShortcut } from "./shortcut.js";
import { runEnhancementWithLoader } from "./enhance.js";
import { openSettingsUi } from "./ui/settings.js";
import { refreshStatusLine } from "./ui/status.js";

export default function augmentExtension(pi: ExtensionAPI): void {
  createAugmentExtension(pi);
}

export function createAugmentExtension(
  pi: ExtensionAPI,
  options?: { completeFn?: CompleteFn }
): void {
  const runtime = new AugmentRuntimeState();

  const refreshStatus = (ctx: ExtensionContext): void => {
    refreshStatusLine(ctx, runtime);
  };

  const restorePersistedSettings = (ctx: ExtensionContext): void => {
    runtime.restoreSettings();
    refreshStatus(ctx);
  };

  pi.on("session_start", (_event, ctx) => {
    restorePersistedSettings(ctx);
  });
  pi.on("session_switch", (_event, ctx) => {
    restorePersistedSettings(ctx);
  });
  pi.on("session_tree", (_event, ctx) => {
    restorePersistedSettings(ctx);
  });
  pi.on("session_fork", (_event, ctx) => {
    restorePersistedSettings(ctx);
  });
  pi.on("model_select", (_event, ctx) => {
    refreshStatus(ctx);
  });

  pi.registerCommand(EXTENSION_COMMAND, {
    description: "Enhance the current editor prompt in-place",
    getArgumentCompletions: getAugmentArgumentCompletions,
    handler: async (args, ctx) => {
      await handleAugmentCommand(args, ctx, runtime, {
        completeFn: options?.completeFn ?? complete,
        exec: pi.exec.bind(pi),
        refreshStatus,
        runCancellableTask: runEnhancementWithLoader,
      });
    },
  });

  pi.registerShortcut(SHORTCUT_KEY, {
    description: "Enhance the current editor prompt",
    handler: async (ctx) => {
      await handleAugmentShortcut(ctx, runtime, {
        completeFn: options?.completeFn ?? complete,
        exec: pi.exec.bind(pi),
        refreshStatus,
        runCancellableTask: runEnhancementWithLoader,
        openSettings: async (settingsCtx) => {
          await openSettingsUi(settingsCtx, runtime, { refreshStatus });
        },
      });
    },
  });
}
