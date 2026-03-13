import test from "node:test";
import assert from "node:assert/strict";
import { buildStrategyRequest } from "../src/strategies/strategy.js";
import {
  analyzeDraftIntent,
  detectTaskIntent,
  resolveEffectiveRewriteMode,
} from "../src/intent.js";
import type { AugmentContextPayload } from "../src/types.js";

// ---------------------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------------------

void test("intent classification detects implement-oriented drafts", () => {
  assert.equal(
    detectTaskIntent("Implement support for rewriteMode in src/commands.ts and run tests."),
    "implement"
  );
});

void test("intent classification detects debug-oriented drafts", () => {
  assert.equal(detectTaskIntent("Debug why /augment hangs and fix the timeout bug."), "debug");
});

void test("intent classification detects refactor-oriented drafts", () => {
  assert.equal(
    detectTaskIntent("Refactor the strategy builder to simplify the branching and dedupe logic."),
    "refactor"
  );
});

void test("intent classification detects review-oriented drafts", () => {
  assert.equal(
    detectTaskIntent("Review the current implementation and report findings by severity."),
    "review"
  );
});

void test("intent classification detects research-oriented drafts", () => {
  assert.equal(
    detectTaskIntent(
      "Research the best approach for Pi extension status reporting and cite sources."
    ),
    "research"
  );
});

void test("intent classification detects docs-oriented drafts", () => {
  assert.equal(
    detectTaskIntent("Update the README docs to describe the new rewrite mode behavior."),
    "docs"
  );
});

void test("intent classification detects test-fix-oriented drafts", () => {
  assert.equal(
    detectTaskIntent(
      "Investigate the failing tests, decide whether the bug or test is wrong, and update tests."
    ),
    "test-fix"
  );
});

void test("intent classification detects explain-oriented drafts", () => {
  assert.equal(detectTaskIntent("Explain how Augment model routing works."), "explain");
});

void test("intent classification keeps explanation-first mixed prompts in explain mode when no action is requested", () => {
  assert.equal(detectTaskIntent("Explain why tests fail in CI."), "explain");
});

void test("intent classification treats polite explanation requests as explain mode", () => {
  assert.equal(detectTaskIntent("Can you explain why tests fail in CI?"), "explain");
});

void test("intent classification keeps explanation-first how-to prompts in explain mode", () => {
  assert.equal(detectTaskIntent("Explain how to add tests for this feature."), "explain");
});

void test("intent classification treats how-to fix prompts as debug work", () => {
  assert.equal(detectTaskIntent("How do we fix Alt+P hanging forever?"), "debug");
});

void test("intent classification treats how-to implementation prompts as implement work", () => {
  assert.equal(
    detectTaskIntent("How should I implement rewrite mode support in Augment?"),
    "implement"
  );
});

void test("intent classification treats why-is-it-broken prompts with a fix request as debug work", () => {
  assert.equal(detectTaskIntent("Why is Augment stuck loading and how do we fix it?"), "debug");
});

void test("intent classification still prefers execution when the draft asks to explain and fix", () => {
  assert.equal(detectTaskIntent("Explain why tests fail and fix the root cause."), "debug");
});

void test("intent classification prefers execution when a follow-up sentence requests action", () => {
  assert.equal(detectTaskIntent("Why does this test fail? Fix it."), "debug");
});

void test("intent classification falls back to general for non-operational prompts", () => {
  assert.equal(detectTaskIntent("Brainstorm names for this feature."), "general");
});

void test("rewrite mode resolution honors forced and auto modes", () => {
  assert.equal(resolveEffectiveRewriteMode("plain", "implement"), "plain");
  assert.equal(resolveEffectiveRewriteMode("execution-contract", "explain"), "execution-contract");
  assert.equal(resolveEffectiveRewriteMode("auto", "implement"), "execution-contract");
  assert.equal(resolveEffectiveRewriteMode("auto", "explain"), "plain");
});

void test("draft analysis resolves intent and effective rewrite mode together", () => {
  assert.deepEqual(analyzeDraftIntent("Review this diff and report findings.", "auto"), {
    intent: "review",
    effectiveRewriteMode: "execution-contract",
  });
});

// ---------------------------------------------------------------------------
// Strategy request building
// ---------------------------------------------------------------------------

void test("strategy request changes instructions between plain and execution-contract modes", () => {
  const plainRequest = buildStrategyRequest(
    createPromptContext({ effectiveRewriteMode: "plain", intent: "explain", targetFamily: "gpt" })
  );
  const contractRequest = buildStrategyRequest(
    createPromptContext({ effectiveRewriteMode: "execution-contract", intent: "debug", targetFamily: "gpt" })
  );

  const plainText = extractUserText(plainRequest);
  const contractText = extractUserText(contractRequest);

  assert.match(plainText, /stronger GPT-style prompt/i);
  assert.doesNotMatch(plainText, /execution contract/i);
  assert.match(contractText, /concise GPT-style execution contract/i);
  assert.match(contractText, /root cause/i);
  assert.match(contractText, /<effective_rewrite_mode>\s*execution-contract/i);
});

void test("claude execution-contract strategy allows stronger explicit structure", () => {
  const request = buildStrategyRequest(
    createPromptContext({ effectiveRewriteMode: "execution-contract", intent: "implement", targetFamily: "claude" })
  );

  const text = extractUserText(request);
  assert.match(text, /XML-like sections/i);
  assert.match(text, /smallest strong contract/i);
  assert.match(text, /framework blocks/i);
});

void test("system prompt includes Prompt Leverage framework reference", () => {
  const request = buildStrategyRequest(
    createPromptContext({ targetFamily: "claude" })
  );

  assert.ok(request.systemPrompt);
  assert.match(request.systemPrompt, /Prompt Leverage framework/);
  assert.match(request.systemPrompt, /Transformation Rules/);
  assert.match(request.systemPrompt, /Quality Bar/);
  assert.match(request.systemPrompt, /Framework Blocks/);
});

void test("context sections include effort level", () => {
  const request = buildStrategyRequest(
    createPromptContext({ draft: "Implement a new feature", intent: "implement" })
  );

  const text = extractUserText(request);
  assert.match(text, /<effort_level>/);
});

void test("extractUserText finds the user message when system messages are prepended", () => {
  assert.equal(
    extractUserText({
      messages: [
        { role: "system", content: "system guidance" },
        { role: "developer", content: "developer guidance" },
        { role: "user", content: [{ type: "text", text: "Actual user prompt" }] },
      ],
    }),
    "Actual user prompt"
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPromptContext(
  overrides: Partial<AugmentContextPayload>
): AugmentContextPayload {
  return {
    draft: "draft",
    activeModel: { provider: "openai", id: "gpt-5" },
    targetFamily: "gpt",
    effectiveRewriteMode: "plain",
    intent: "general",
    recentConversation: [],
    ...overrides,
  };
}

function extractUserText(request: {
  messages: { role: string; content: string | unknown[] }[];
}): string {
  const userMessage = request.messages.find((message) => message.role === "user");
  assert.ok(userMessage, "expected a user message");
  if (typeof userMessage.content === "string") {
    return userMessage.content;
  }
  const textPart = userMessage.content.find((part): part is { type: "text"; text: string } => {
    if (!part || typeof part !== "object") return false;
    const candidate = part as { type?: unknown; text?: unknown };
    return candidate.type === "text" && typeof candidate.text === "string";
  });
  return textPart?.text ?? "";
}
