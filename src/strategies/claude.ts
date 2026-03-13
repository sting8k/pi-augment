import type { Context, Message } from "@mariozechner/pi-ai";
import { buildStrategyInstructions } from "../contracts.js";
import { buildSharedContextSections, buildSharedSystemPrompt } from "./shared.js";
import type { AugmentContextPayload } from "../types.js";

export function buildClaudeStrategyRequest(context: AugmentContextPayload): Context {
  const userMessage: Message = {
    role: "user",
    timestamp: Date.now(),
    content: [
      {
        type: "text",
        text: [
          ...buildStrategyInstructions("claude", context),
          buildSharedContextSections(context),
        ].join("\n\n"),
      },
    ],
  };

  return {
    systemPrompt: buildSharedSystemPrompt("Claude-style"),
    messages: [userMessage],
  };
}
