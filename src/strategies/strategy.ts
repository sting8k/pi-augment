import type { Context, Message } from "@mariozechner/pi-ai";
import { buildStrategyInstructions } from "../contracts.js";
import { buildSharedContextSections, buildSharedSystemPrompt } from "./shared.js";
import type { AugmentContextPayload } from "../types.js";

export function buildStrategyRequest(context: AugmentContextPayload): Context {
  const targetStyle = context.targetFamily === "claude" ? "Claude-style" : "GPT-style";

  const messages: Message[] = [
    {
      role: "user",
      timestamp: Date.now(),
      content: [
        {
          type: "text",
          text: [
            ...buildStrategyInstructions(context.targetFamily, context),
            "",
            buildSharedContextSections(context),
          ].join("\n"),
        },
      ],
    },
  ];

  return {
    systemPrompt: buildSharedSystemPrompt(targetStyle),
    messages,
  };
}
