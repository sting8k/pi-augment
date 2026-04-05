import { SENTINEL_CLOSE, SENTINEL_OPEN } from "./constants.js";

export function parseEnhancedPrompt(responseText: string): string {
  const text = responseText.trim();

  // Strategy 1: try the text as-is (clean output)
  const result = tryParse(text);
  if (result !== null) return result;

  // Strategy 2: strip outer markdown fences
  const stripped = stripOuterMarkdownFences(text);
  const result2 = tryParse(stripped);
  if (result2 !== null) return result2;

  // Strategy 3: strip ALL fence delimiter lines
  const defenced = stripAllFenceLines(text);
  const result3 = tryParse(defenced);
  if (result3 !== null) return result3;

  // Strategy 4: strip leading decorative lines (headings, blank lines) before
  // outer fences — catches "## Heading\n\n```" patterns that Strategy 2 misses
  const trimmed = stripLeadingLines(text);
  const result4 = tryParse(trimmed);
  if (result4 !== null) return result4;

  // Strategy 5: find first occurrence of any sentinel block anywhere in text
  const result5 = tryParseAnywhere(text);
  if (result5 !== null) return result5;

  throw new Error(
    "Augment received invalid model output: expected exactly one sentinel block."
  );
}

function tryParse(text: string): string | null {
  const sentinelPairs: [string, string][] = [
    [SENTINEL_OPEN, SENTINEL_CLOSE],
    ["<execution_contract>", "</execution_contract>"],
  ];

  for (const [open, close] of sentinelPairs) {
    const escapedOpen = escapeRegExp(open);
    const escapedClose = escapeRegExp(close);
    // eslint-disable-next-line no-useless-escape
    const pattern = new RegExp(escapedOpen + "([\\s\\S]*?)" + escapedClose, "g");
    const matches = [...text.matchAll(pattern)];
    if (matches.length === 0) continue;

    const match = matches[0];
    const extracted = normalizePromptText(match[1] ?? "");
    if (!extracted.trim()) continue;

    return extracted;
  }

  return null;
}

function tryParseAnywhere(text: string): string | null {
  const sentinelPairs: [string, string][] = [
    [SENTINEL_OPEN, SENTINEL_CLOSE],
    ["<execution_contract>", "</execution_contract>"],
  ];

  for (const [open, close] of sentinelPairs) {
    const escapedOpen = escapeRegExp(open);
    const escapedClose = escapeRegExp(close);
    const pattern = new RegExp(escapedOpen + "([\\s\\S]*?)" + escapedClose);
    const match = pattern.exec(text);
    if (!match) continue;
    const extracted = normalizePromptText(match[1] ?? "");
    if (!extracted.trim()) continue;
    return extracted;
  }

  return null;
}

export function stripOuterMarkdownFences(text: string): string {
  let result = text.replace(/^```[\w]*\n?/, "");
  result = result.replace(/\n?```$/, "");
  return result.trim();
}

function stripAllFenceLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^```[\w]*$/.test(line))
    .join("\n");
}

function stripLeadingLines(text: string): string {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() !== "");
  if (start === -1) return text;
  return lines.slice(start).join("\n");
}

export function buildSentinelReminder(): string {
  return "Return exactly one " + SENTINEL_OPEN + "..." + SENTINEL_CLOSE + " block and nothing else.";
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
