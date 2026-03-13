import {
  buildDoneCriteria,
  buildOutputContract,
  buildToolRules,
  buildVerification,
  buildWorkStyle,
  inferIntensity,
} from "./prompt-leverage.js";
import type { AugmentContextPayload, AugmentFamily } from "./types.js";

export function buildStrategyInstructions(
  family: AugmentFamily,
  context: AugmentContextPayload
): string[] {
  return context.effectiveRewriteMode === "execution-contract"
    ? buildExecutionContractInstructions(family, context)
    : buildPlainRewriteInstructions(family, context);
}

function buildPlainRewriteInstructions(
  family: AugmentFamily,
  context: AugmentContextPayload
): string[] {
  const { intent, draft } = context;
  const intensity = inferIntensity(draft, intent);
  const familyLabel = describeFamily(family);

  return [
    `Rewrite the draft into a stronger ${familyLabel} prompt.`,
    "Keep the rewrite concise, concrete, and faithful to the user's wording and scope.",
    "Do not over-specify a simple task — keep the result proportional.",
    "",
    `Work Style:\n${buildWorkStyle(intent, intensity)}`,
    "",
    `Tool Rules:\n${buildToolRules(intent)}`,
    "",
    `Output Contract:\n${buildOutputContract(intent)}`,
    "",
    `Verification:\n${buildVerification(intent)}`,
    "",
    `Done Criteria:\n${buildDoneCriteria(intent)}`,
  ];
}

function buildExecutionContractInstructions(
  family: AugmentFamily,
  context: AugmentContextPayload
): string[] {
  const { intent, draft } = context;
  const intensity = inferIntensity(draft, intent);
  const familyLabel = describeFamily(family);

  const structureHint =
    family === "claude"
      ? "Prefer strong explicit structure. XML-like sections such as <task>, <context>, <constraints>, <verification>, and <deliverable> are allowed when they materially improve clarity."
      : "Prefer compact natural sections or bullets. Avoid XML unless the draft already uses it or it clearly improves execution clarity.";

  return [
    `Compile the draft into a concise ${familyLabel} execution contract for a Pi coding-agent workflow using the Prompt Leverage framework.`,
    "Produce the smallest strong contract that makes the task executable.",
    structureHint,
    "Do not emit empty sections, generic filler, or speculative requirements.",
    "",
    "Use the following framework blocks selectively — include only the blocks that materially improve the contract:",
    "",
    `Objective:\n- State the task and what success looks like.`,
    "",
    `Context:\n- List sources, files, constraints, and unknowns.`,
    "",
    `Work Style:\n${formatAsList(buildWorkStyle(intent, intensity))}`,
    "",
    `Tool Rules:\n- ${buildToolRules(intent)}`,
    "",
    `Output Contract:\n- ${buildOutputContract(intent)}`,
    "",
    `Verification:\n${formatAsList(buildVerification(intent))}`,
    "",
    `Done Criteria:\n- ${buildDoneCriteria(intent)}`,
  ];
}

function describeFamily(family: AugmentFamily): string {
  return family === "claude" ? "Claude-style" : "GPT-style";
}

function formatAsList(text: string): string {
  return text
    .split("\n")
    .map((line) => (line.startsWith("- ") ? line : `- ${line}`))
    .join("\n");
}
