import type { AssistantMessage, UserMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext, SessionEntry } from "@mariozechner/pi-coding-agent";
import { analyzeDraftIntent } from "./intent.js";
import { detectFamily } from "./model-routing.js";
import type { AugmentContextPayload, ConversationExcerpt, ProjectMetadata } from "./types.js";

const MAX_CONVERSATION_MESSAGES = 4;
const MAX_RECENT_CONVERSATION_TOKENS = 800;

export async function buildPromptContext(
  ctx: ExtensionContext,
  exec: ExtensionAPI["exec"],
  draft: string
): Promise<AugmentContextPayload> {
  const targetFamily = detectFamily(ctx.model);
  const analysis = analyzeDraftIntent(draft, "auto");

  const recentConversation = buildRecentConversationExcerpts(
    ctx.sessionManager.getBranch(),
    MAX_RECENT_CONVERSATION_TOKENS
  );

  let projectMetadata: ProjectMetadata | undefined;
  try {
    const result = await exec("git", ["branch", "--show-current"]);
    const branch = result.code === 0 ? result.stdout.trim() : "";
    projectMetadata = branch ? { cwd: ctx.cwd, gitBranch: branch } : { cwd: ctx.cwd };
  } catch {
    projectMetadata = { cwd: ctx.cwd };
  }

  return {
    draft,
    ...(ctx.model
      ? { activeModel: { provider: ctx.model.provider, id: ctx.model.id } }
      : {}),
    targetFamily,
    effectiveRewriteMode: analysis.effectiveRewriteMode,
    intent: analysis.intent,
    recentConversation,
    projectMetadata,
  };
}

function buildRecentConversationExcerpts(
  entries: SessionEntry[],
  tokenBudget: number
): ConversationExcerpt[] {
  const selected: ConversationExcerpt[] = [];
  let remaining = tokenBudget;

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry?.type !== "message") continue;
    const msg = entry.message;
    if (msg.role !== "user" && msg.role !== "assistant") continue;

    const text = extractMessageText(msg);
    if (!text) continue;

    const tokens = Math.ceil(text.length / 4);
    if (tokens > remaining && selected.length > 0) continue;
    if (tokens > remaining) break;

    selected.push({ role: msg.role, text, tokens, timestamp: msg.timestamp });
    remaining -= tokens;
    if (selected.length >= MAX_CONVERSATION_MESSAGES) break;
  }

  return selected.reverse();
}

function extractMessageText(message: UserMessage | AssistantMessage): string {
  if (message.role === "user") {
    if (typeof message.content === "string") return message.content.trim();
    return message.content
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n")
      .trim();
  }
  if (message.stopReason === "aborted") return "";
  return message.content
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();
}
