import { clearTimeout, setTimeout } from "node:timers";
import type { Api, AssistantMessage, Context, Model } from "@mariozechner/pi-ai";
import { complete } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";
import { BorderedLoader } from "@mariozechner/pi-coding-agent";
import { ENHANCER_MAX_OUTPUT_TOKENS, DEFAULT_ENHANCEMENT_TIMEOUT_MS } from "./constants.js";
import { buildPromptContext } from "./context.js";
import { buildSentinelReminder, parseEnhancedPrompt } from "./parser.js";
import { buildStrategyRequest } from "./strategies/strategy.js";
import type { EnhancementResult } from "./types.js";

export async function enhance(
  ctx: ExtensionCommandContext,
  exec: ExtensionAPI["exec"],
  draft: string
): Promise<EnhancementResult | null> {
  const model = ctx.model as Model<Api> | undefined;
  if (!model) {
    throw new Error("No active model. Select a model first.");
  }

  const apiKey = await ctx.modelRegistry.getApiKey(model);
  if (!apiKey) {
    throw new Error(`No API key for ${model.provider}/${model.id}.`);
  }

  const promptContext = await buildPromptContext(ctx, exec, draft);
  const request = buildStrategyRequest(promptContext);

  const enhanced = await runWithLoader(
    ctx,
    `Augmenting (${promptContext.intent}, ${promptContext.targetFamily})...`,
    async (signal) => {
      const response = await callLLM(model, apiKey, request, signal);
      if (!response) return null;

      const text = extractText(response);
      try {
        return parseEnhancedPrompt(text);
      } catch {
        // Retry once with stronger sentinel reminder
        const retryRequest = addSentinelReminder(request);
        const retryResponse = await callLLM(model, apiKey, retryRequest, signal);
        if (!retryResponse) return null;
        return parseEnhancedPrompt(extractText(retryResponse));
      }
    }
  );

  if (!enhanced) return null;

  return {
    enhanced,
    intent: promptContext.intent,
    mode: promptContext.effectiveRewriteMode,
    family: promptContext.targetFamily,
  };
}

async function callLLM(
  model: Model<Api>,
  apiKey: string,
  request: Context,
  signal: AbortSignal
): Promise<AssistantMessage | null> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), DEFAULT_ENHANCEMENT_TIMEOUT_MS);
  const combined = AbortSignal.any([signal, timeoutController.signal]);

  try {
    const response = await complete(model, request, {
      apiKey,
      signal: combined,
      maxTokens: Math.min(model.maxTokens, ENHANCER_MAX_OUTPUT_TOKENS),
    });
    if (signal.aborted || response.stopReason === "aborted") return null;
    return response;
  } catch (error) {
    if (signal.aborted) return null;
    if (timeoutController.signal.aborted) {
      throw new Error("Augment timed out. Try again or use a faster model.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function runWithLoader<T>(
  ctx: ExtensionCommandContext,
  message: string,
  task: (signal: AbortSignal) => Promise<T | null>
): Promise<T | null> {
  if (!ctx.hasUI) {
    // No UI — just run the task directly
    const controller = new AbortController();
    return task(controller.signal);
  }

  let taskError: Error | undefined;

  const result = await ctx.ui.custom<T | null>((tui, theme, _keybindings, done) => {
    const loader = new BorderedLoader(tui, theme, message, { cancellable: true });
    loader.onAbort = () => done(null);

    void task(loader.signal)
      .then((r) => {
        if (!loader.signal.aborted) done(r);
      })
      .catch((err: unknown) => {
        if (loader.signal.aborted) {
          done(null);
          return;
        }
        taskError = err instanceof Error ? err : new Error("Enhancement failed.");
        done(null);
      });

    return loader;
  });

  if (taskError) throw taskError;
  return result;
}

function addSentinelReminder(request: Context): Context {
  return {
    ...request,
    systemPrompt: `${request.systemPrompt}\n${buildSentinelReminder()} Do not add markdown fences, explanations, or any text before or after the sentinel block.`,
  };
}

function extractText(response: AssistantMessage): string {
  return response.content
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();
}
