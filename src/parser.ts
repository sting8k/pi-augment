import { SENTINEL_CLOSE, SENTINEL_OPEN } from "./constants.js";

const EXECUTION_CONTRACT_OPEN = "<execution_contract>";
const EXECUTION_CONTRACT_CLOSE = "</execution_contract>";
const RAW_EXECUTION_TAGS = [
  "task",
  "context",
  "constraints",
  "diagnosis",
  "fix",
  "work_style",
  "tool_rules",
  "verification",
  "done_criteria",
  "deliverable",
] as const;

export function parseEnhancedPrompt(responseText: string): string {
  const text = normalizePromptText(responseText);

  const primary = extractWrappedBlock(text, SENTINEL_OPEN, SENTINEL_CLOSE);
  if (primary !== null) return primary;

  const executionContract = extractWrappedBlock(
    text,
    EXECUTION_CONTRACT_OPEN,
    EXECUTION_CONTRACT_CLOSE
  );
  if (executionContract !== null) return executionContract;

  const rawExecutionContract = extractRawExecutionContract(text);
  if (rawExecutionContract !== null) return rawExecutionContract;

  throw new Error(
    "Augment received invalid model output: expected exactly one sentinel block."
  );
}

function extractWrappedBlock(text: string, open: string, close: string): string | null {
  if (!text) return null;

  const pattern = new RegExp(escapeRegExp(open) + "([\\s\\S]*?)" + escapeRegExp(close));
  const match = pattern.exec(text);
  if (!match) return null;

  const extracted = normalizePromptText(match[1] ?? "");
  return extracted || null;
}

function extractRawExecutionContract(text: string): string | null {
  if (!text) return null;

  const block = sliceRawExecutionContract(text);
  if (!block) return null;
  if (!looksLikeExecutionContract(block)) return null;

  return block;
}

function sliceRawExecutionContract(text: string): string | null {
  const start = findFirstTagStart(text);
  if (start === -1) return null;

  const end = findLastTagEnd(text);
  if (end === -1 || end <= start) return null;

  const block = normalizePromptText(text.slice(start, end));
  return block || null;
}

function findFirstTagStart(text: string): number {
  let start = -1;

  for (const tag of RAW_EXECUTION_TAGS) {
    const index = text.indexOf(`<${tag}>`);
    if (index === -1) continue;
    if (start === -1 || index < start) start = index;
  }

  return start;
}

function findLastTagEnd(text: string): number {
  let end = -1;

  for (const tag of RAW_EXECUTION_TAGS) {
    const close = `</${tag}>`;
    const index = text.lastIndexOf(close);
    if (index === -1) continue;

    const candidateEnd = index + close.length;
    if (candidateEnd > end) end = candidateEnd;
  }

  return end;
}

function looksLikeExecutionContract(text: string): boolean {
  for (const tag of ["task", "context"]) {
    if (!hasWrappedTag(text, tag)) return false;
  }

  let matches = 0;
  for (const tag of RAW_EXECUTION_TAGS) {
    if (hasWrappedTag(text, tag)) matches += 1;
  }

  return matches >= 2;
}

function hasWrappedTag(text: string, tag: string): boolean {
  return new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`).test(text);
}

export function stripOuterMarkdownFences(text: string): string {
  let result = text.replace(/^```[\w]*\n?/, "");
  result = result.replace(/\n?```$/, "");
  return result.trim();
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
