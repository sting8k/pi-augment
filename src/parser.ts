import { SENTINEL_CLOSE, SENTINEL_OPEN } from "./constants.js";

export function parseEnhancedPrompt(responseText: string): string {
  let text = responseText.trim();

  // Strip markdown code fences that some models wrap around the output
  text = stripMarkdownFences(text);

  const escapedOpen = escapeRegExp(SENTINEL_OPEN);
  const escapedClose = escapeRegExp(SENTINEL_CLOSE);
  const pattern = new RegExp(`${escapedOpen}([\\s\\S]*?)${escapedClose}`, "g");
  const matches = [...text.matchAll(pattern)];

  if (matches.length === 0) {
    throw new Error(
      "Augment received invalid model output: expected exactly one sentinel block."
    );
  }

  // Use the first match — relax strict single-block enforcement so markdown
  // wrappers, leading explanatory text, and trailing comments don't cause
  // spurious failures.
  const match = matches[0];
  if (!match) {
    throw new Error("Augment received invalid model output: missing sentinel block.");
  }

  const extracted = normalizePromptText(match[1] ?? "");
  if (!extracted.trim()) {
    throw new Error("Augment received an empty enhanced prompt.");
  }

  return extracted;
}

export function stripMarkdownFences(text: string): string {
  return text.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "").trim();
}

export function buildSentinelReminder(): string {
  return `Return exactly one ${SENTINEL_OPEN}...${SENTINEL_CLOSE} block and nothing else.`;
}

function normalizePromptText(text: string): string {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
