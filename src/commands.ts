import type { ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { HELP_LINES } from "./constants.js";
import {
  setActiveEnhancerModelMode,
  setFamilyEnhancerModel,
  setFixedEnhancerModel,
} from "./enhancer-settings.js";
import { enhanceEditorDraft, type EnhancementServices } from "./enhance.js";
import { parseModelRef } from "./model-selection.js";
import {
  removeFamilyOverride,
  upsertExactModelOverride,
  upsertFamilyOverride,
} from "./overrides.js";
import type { AugmentRuntimeState } from "./state.js";
import type {
  ParsedAugmentCommand,
  AugmentFamily,
  AugmentRewriteMode,
  AugmentSettings,
} from "./types.js";
import { openSettingsUi, resetGlobalSettings } from "./ui/settings.js";
import { buildStatusReport } from "./ui/status.js";
import { detectRuntimeSupport, parseEnhancementTimeoutSeconds, parseOnOff } from "./validation.js";

type CommandServices = EnhancementServices;

export async function handleAugmentCommand(
  rawArgs: string,
  ctx: ExtensionCommandContext,
  runtime: AugmentRuntimeState,
  services: CommandServices
): Promise<void> {
  const command = parseAugmentCommand(rawArgs);

  try {
    switch (command.name) {
      case "":
        if (shouldOpenSettingsByDefault(ctx)) {
          notify(ctx, "Editor is empty — opening Augment settings.");
          await openSettingsUi(ctx, runtime, services);
          return;
        }
        await enhanceEditorDraft(ctx, runtime, services);
        return;
      case "undo":
        handleUndo(ctx, runtime, services);
        return;
      case "status":
        notify(ctx, buildStatusReport(ctx, runtime));
        return;
      case "settings":
        await openSettingsUi(ctx, runtime, services);
        return;
      case "reset-settings":
        resetGlobalSettings(ctx, runtime, services);
        return;
      case "enable":
        persistSettings(
          ctx,
          runtime,
          services,
          { ...runtime.getSettings(), enabled: true },
          "Augment enabled."
        );
        return;
      case "disable":
        persistSettings(
          ctx,
          runtime,
          services,
          { ...runtime.getSettings(), enabled: false },
          "Augment disabled."
        );
        return;
      case "family":
        handleFamilyCommand(command, ctx, runtime, services);
        return;
      case "mode":
        handleRewriteModeCommand(command, ctx, runtime, services);
        return;
      case "enhancer-model":
        handleEnhancerModelCommand(command, ctx, runtime, services);
        return;
      case "map":
        handleMapCommand(command, ctx, runtime, services);
        return;
      case "conversation":
        handleBooleanSettingCommand(
          command,
          ctx,
          runtime,
          services,
          "includeRecentConversation",
          "Recent conversation setting updated."
        );
        return;
      case "project-metadata":
        handleBooleanSettingCommand(
          command,
          ctx,
          runtime,
          services,
          "includeProjectMetadata",
          "Project metadata setting updated."
        );
        return;
      case "status-bar":
        handleBooleanSettingCommand(
          command,
          ctx,
          runtime,
          services,
          "statusBarEnabled",
          "Status bar setting updated."
        );
        return;
      case "strength":
        handleStrengthCommand(command, ctx, runtime, services);
        return;
      case "preview":
        handleBooleanSettingCommand(
          command,
          ctx,
          runtime,
          services,
          "previewBeforeReplace",
          "Preview setting updated."
        );
        return;
      case "preserve-code":
        handleBooleanSettingCommand(
          command,
          ctx,
          runtime,
          services,
          "preserveCodeBlocks",
          "Code preservation setting updated."
        );
        return;
      case "timeout":
        handleTimeoutCommand(command, ctx, runtime, services);
        return;
      case "help":
      default:
        notify(ctx, HELP_LINES);
        return;
    }
  } catch (error) {
    notify(ctx, formatError(error), "error");
  }
}

export function parseAugmentCommand(rawArgs: string): ParsedAugmentCommand {
  const trimmed = rawArgs.trim();
  if (!trimmed) {
    return { name: "", args: [] };
  }

  const args = trimmed.split(/\s+/);
  return {
    name: args[0]?.toLowerCase() ?? "",
    args: args.slice(1),
  };
}

export function getAugmentArgumentCompletions(
  prefix: string
): { value: string; label: string }[] | null {
  const options = [
    "status",
    "settings",
    "undo",
    "reset-settings",
    "enable",
    "disable",
    "family",
    "mode",
    "enhancer-model",
    "map",
    "conversation",
    "project-metadata",
    "status-bar",
    "strength",
    "preview",
    "preserve-code",
    "timeout",
    "help",
  ];
  const loweredPrefix = prefix.toLowerCase();
  const matches = options.filter((option) => option.startsWith(loweredPrefix));
  return matches.length > 0 ? matches.map((value) => ({ value, label: value })) : null;
}

function shouldOpenSettingsByDefault(ctx: ExtensionCommandContext): boolean {
  const support = detectRuntimeSupport(ctx);
  return support.interactiveTui && !ctx.ui.getEditorText().trim();
}

function handleUndo(
  ctx: ExtensionCommandContext,
  runtime: AugmentRuntimeState,
  services: Pick<CommandServices, "refreshStatus">
): void {
  const support = detectRuntimeSupport(ctx);
  if (!support.interactiveTui) {
    throw new Error(support.reason);
  }

  const previousDraft = runtime.undo.consume();
  if (!previousDraft) {
    throw new Error("Augment undo is not available.");
  }

  ctx.ui.setEditorText(previousDraft);
  services.refreshStatus(ctx);
  notify(ctx, "Augment restored the previous draft.");
}

function handleFamilyCommand(
  command: ParsedAugmentCommand,
  ctx: ExtensionCommandContext,
  runtime: AugmentRuntimeState,
  services: CommandServices
): void {
  const family = command.args[0];
  if (family !== "auto" && family !== "gpt" && family !== "claude") {
    throw new Error("Usage: /augment family auto|gpt|claude");
  }

  persistSettings(
    ctx,
    runtime,
    services,
    { ...runtime.getSettings(), targetFamilyMode: family },
    `Target family mode set to ${family}.`
  );
}

function handleRewriteModeCommand(
  command: ParsedAugmentCommand,
  ctx: ExtensionCommandContext,
  runtime: AugmentRuntimeState,
  services: CommandServices
): void {
  const rewriteMode = parseRewriteMode(command.args[0]);
  if (!rewriteMode) {
    throw new Error("Usage: /augment mode auto|plain|execution-contract");
  }

  persistSettings(
    ctx,
    runtime,
    services,
    { ...runtime.getSettings(), rewriteMode },
    `Rewrite mode set to ${rewriteMode}.`
  );
}

function handleEnhancerModelCommand(
  command: ParsedAugmentCommand,
  ctx: ExtensionCommandContext,
  runtime: AugmentRuntimeState,
  services: CommandServices
): void {
  const mode = command.args[0];
  const settings = runtime.getSettings();

  switch (mode) {
    case "active":
      persistSettings(
        ctx,
        runtime,
        services,
        setActiveEnhancerModelMode(settings),
        "Enhancer model mode set to active."
      );
      return;
    case "fixed": {
      const modelRef = parseModelRef(command.args[1] ?? "");
      if (!modelRef) {
        throw new Error("Usage: /augment enhancer-model fixed <provider>/<id>");
      }
      persistSettings(
        ctx,
        runtime,
        services,
        setFixedEnhancerModel(settings, modelRef),
        `Fixed enhancer model set to ${modelRef.provider}/${modelRef.id}.`
      );
      return;
    }
    case "family-linked": {
      const gptModel = parseModelRef(command.args[1] ?? "");
      const claudeModel = parseModelRef(command.args[2] ?? "");
      if (!gptModel || !claudeModel) {
        throw new Error(
          "Usage: /augment enhancer-model family-linked <gpt-provider>/<gpt-id> <claude-provider>/<claude-id>"
        );
      }
      const next = setFamilyEnhancerModel(
        setFamilyEnhancerModel(settings, "gpt", gptModel),
        "claude",
        claudeModel
      );
      persistSettings(ctx, runtime, services, next, "Family-linked enhancer models updated.");
      return;
    }
    default:
      throw new Error(
        "Usage: /augment enhancer-model active|fixed <provider>/<id>|family-linked <gpt-provider>/<gpt-id> <claude-provider>/<claude-id>"
      );
  }
}

function handleMapCommand(
  command: ParsedAugmentCommand,
  ctx: ExtensionCommandContext,
  runtime: AugmentRuntimeState,
  services: CommandServices
): void {
  const action = command.args[0];
  const settings = runtime.getSettings();

  switch (action) {
    case "active": {
      const family = parseFamily(command.args[1]);
      if (!family) {
        throw new Error("Usage: /augment map active <gpt|claude>");
      }
      if (!ctx.model) {
        throw new Error("Augment needs an active model for /augment map active <family>.");
      }
      const next = upsertExactModelOverride(
        settings,
        { provider: ctx.model.provider, id: ctx.model.id },
        family
      );
      persistSettings(
        ctx,
        runtime,
        services,
        next,
        `Mapped ${ctx.model.provider}/${ctx.model.id} to ${family}.`
      );
      return;
    }
    case "set": {
      const modelRef = parseModelRef(command.args[1] ?? "");
      const family = parseFamily(command.args[2]);
      if (!modelRef || !family) {
        throw new Error("Usage: /augment map set <provider>/<id> <gpt|claude>");
      }
      const next = upsertExactModelOverride(settings, modelRef, family);
      persistSettings(
        ctx,
        runtime,
        services,
        next,
        `Mapped ${modelRef.provider}/${modelRef.id} to ${family}.`
      );
      return;
    }
    case "add": {
      const pattern = command.args[1]?.trim();
      const family = parseFamily(command.args[2]);
      if (!pattern || !family) {
        throw new Error("Usage: /augment map add <pattern> <gpt|claude>");
      }
      const next = upsertFamilyOverride(settings, pattern, family);
      persistSettings(ctx, runtime, services, next, `Pattern ${pattern} now routes to ${family}.`);
      return;
    }
    case "remove": {
      const pattern = command.args[1]?.trim();
      if (!pattern) {
        throw new Error("Usage: /augment map remove <pattern>");
      }
      const next = removeFamilyOverride(settings, pattern);
      persistSettings(ctx, runtime, services, next, `Removed pattern override ${pattern}.`);
      return;
    }
    default:
      throw new Error(
        "Usage: /augment map active <family> | set <provider>/<id> <family> | add <pattern> <family> | remove <pattern>"
      );
  }
}

function handleBooleanSettingCommand<K extends BooleanSettingKey>(
  command: ParsedAugmentCommand,
  ctx: ExtensionCommandContext,
  runtime: AugmentRuntimeState,
  services: CommandServices,
  key: K,
  message: string
): void {
  const boolValue = parseOnOff(command.args[0] ?? "");
  if (boolValue === undefined) {
    throw new Error(`Usage: /augment ${command.name} on|off`);
  }

  persistSettings(ctx, runtime, services, { ...runtime.getSettings(), [key]: boolValue }, message);
}

function handleStrengthCommand(
  command: ParsedAugmentCommand,
  ctx: ExtensionCommandContext,
  runtime: AugmentRuntimeState,
  services: CommandServices
): void {
  const strength = command.args[0];
  if (strength !== "light" && strength !== "balanced" && strength !== "strong") {
    throw new Error("Usage: /augment strength light|balanced|strong");
  }

  persistSettings(
    ctx,
    runtime,
    services,
    { ...runtime.getSettings(), rewriteStrength: strength },
    `Rewrite strength set to ${strength}.`
  );
}

function handleTimeoutCommand(
  command: ParsedAugmentCommand,
  ctx: ExtensionCommandContext,
  runtime: AugmentRuntimeState,
  services: CommandServices
): void {
  const timeoutMs = parseEnhancementTimeoutSeconds(command.args[0] ?? "");
  if (timeoutMs === undefined) {
    throw new Error("Usage: /augment timeout <seconds> (5-300)");
  }

  persistSettings(
    ctx,
    runtime,
    services,
    { ...runtime.getSettings(), enhancementTimeoutMs: timeoutMs },
    `Enhancement timeout set to ${formatTimeoutSeconds(timeoutMs)}.`
  );
}

function parseFamily(value: string | undefined): AugmentFamily | undefined {
  return value === "gpt" || value === "claude" ? value : undefined;
}

function parseRewriteMode(value: string | undefined): AugmentRewriteMode | undefined {
  return value === "auto" || value === "plain" || value === "execution-contract"
    ? value
    : undefined;
}

function formatTimeoutSeconds(timeoutMs: number): string {
  return `${Math.floor(timeoutMs / 1_000)} seconds`;
}

function persistSettings(
  ctx: ExtensionCommandContext,
  runtime: AugmentRuntimeState,
  services: Pick<CommandServices, "refreshStatus">,
  settings: AugmentSettings,
  successMessage: string
): void {
  runtime.persistSettings(settings);
  services.refreshStatus(ctx);
  notify(ctx, successMessage);
}

type BooleanSettingKey =
  | "includeRecentConversation"
  | "includeProjectMetadata"
  | "statusBarEnabled"
  | "previewBeforeReplace"
  | "preserveCodeBlocks";

function notify(
  ctx: { hasUI: boolean; ui: { notify: (message: string, type?: "info" | "error") => void } },
  message: string,
  type: "info" | "error" = "info"
): void {
  if (ctx.hasUI) {
    ctx.ui.notify(message, type);
    return;
  }

  const writer = type === "error" ? console.error : console.log;
  writer(message);
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
