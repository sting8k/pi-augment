import { SENTINEL_CLOSE, SENTINEL_OPEN } from "./constants.js";

export function parseEnhancedPrompt(responseText: string): string {
  const text = responseText.trim();

  // Strategy 1: try the text as-is (clean output)
  const result = tryParse(text);
  if (result !== null) return result;

  // Strategy 2: strip outer markdown fences (common with Claude wrapping output in fences)
  const stripped = stripOuterMarkdownFences(text);
  const result2 = tryParse(stripped);
  if (result2 !== null) return result2;

  // Strategy 3: strip ALL fence delimiter lines (handles nested/misaligned fences)
  const defenced = stripAllFenceLines(text);
  const result3 = tryParse(defenced);
  if (result3 !== null) return result3;

  throw new Error(
    "Augment received invalid model output: expected exactly one sentinel block."
  );
}

/**
 * Attempt to find and extract the sentinel block. Returns null if no block found
 * or if the block is empty — does not throw.
 */
function tryParse(text: string): string | null {
  const escapedOpen = escapeRegExp(SENTINEL_OPEN);
  const escapedClose = escapeRegExp(SENTINEL_CLOSE);
  const pattern = new RegExp(`${escapedOpen}([\\s\\S]*?)${escapedClose}`, "g");
  const matches = [...text.matchAll(pattern)];

  if (matches.length === 0) return null;

  // Use the first match — relaxes spurious failures from explanatory text or
  // duplicate blocks in the output.
  const match = matches[0];
  const extracted = normalizePromptText(match[1] ?? "");
  if (!extracted.trim()) return null;

  return extracted;
}

/**
 * Strip exactly one pair of outer fences, if present.
 * Handles: ```, ```xml, ```html, ```\n at both ends.
 * Leaves inner fence lines untouched.
 */
export function stripOuterMarkdownFences(text: string): string {
  // Remove opening fence at start
  let result = text.replace(/^```[\w]*\n?/, "");
  // Remove closing fence at end
  result = result.replace(/\n?```$/, "");
  return result.trim();
}

/**
 * Strip ALL lines that are fence delimiters. Used as fallback when the model
 * produces misaligned or nested fences.
 */
function stripAllFenceLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^```[\w]*$/.test(line))
    .join("\n");
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
