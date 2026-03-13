/**
 * Prompt Leverage — deterministic first-pass prompt augmentation.
 *
 * Ported from scripts/augment_prompt.py and enriched with the framework
 * defined in the prompt-leverage skill (Objective → Context → Work Style →
 * Tool Rules → Output Contract → Verification → Done Criteria).
 */

import type { AugmentTaskIntent } from "./types.js";

// ---------------------------------------------------------------------------
// Intensity
// ---------------------------------------------------------------------------

export type PromptLeverageIntensity = "Light" | "Standard" | "Deep";

const DEEP_SIGNALS = [
  /\bcareful\b/,
  /\bdeep\b/,
  /\bthorough\b/,
  /\bhigh.?stakes?\b/,
  /\bproduction\b/,
  /\bcritical\b/,
  /\barchitecture\b/,
  /\bsecurity\b/,
];

const STANDARD_INTENTS = new Set<AugmentTaskIntent>([
  "implement",
  "debug",
  "refactor",
  "review",
  "research",
  "test-fix",
]);

export function inferIntensity(
  draft: string,
  intent: AugmentTaskIntent
): PromptLeverageIntensity {
  const lowered = draft.toLowerCase();
  if (DEEP_SIGNALS.some((re) => re.test(lowered))) {
    return "Deep";
  }
  if (STANDARD_INTENTS.has(intent)) {
    return "Standard";
  }
  return "Light";
}

// ---------------------------------------------------------------------------
// Framework block builders
// ---------------------------------------------------------------------------

export function buildToolRules(intent: AugmentTaskIntent): string {
  switch (intent) {
    case "implement":
    case "refactor":
    case "debug":
    case "test-fix":
      return "Inspect the relevant files and dependencies first. Validate the final change with the narrowest useful checks before broadening scope.";
    case "research":
      return "Retrieve evidence from reliable sources before concluding. Do not guess facts that can be checked.";
    case "review":
      return "Read enough surrounding context to understand intent before critiquing. Distinguish confirmed issues from plausible risks.";
    case "docs":
      return "Read the current documentation and runtime behavior before rewriting. Keep examples and commands accurate.";
    case "explain":
      return "Use tools or extra context only when they materially improve correctness or completeness.";
    case "general":
    default:
      return "Use tools or extra context only when they materially improve correctness or completeness.";
  }
}

export function buildOutputContract(intent: AugmentTaskIntent): string {
  switch (intent) {
    case "implement":
    case "refactor":
    case "test-fix":
      return "Return the result in a practical execution format: concise summary, concrete changes or code, validation notes, and any remaining risks.";
    case "debug":
      return "Return a diagnosis with root cause, the fix, validation steps, and regression notes.";
    case "research":
      return "Return a structured synthesis with key findings, supporting evidence, uncertainty where relevant, and a concise bottom line.";
    case "docs":
      return "Return polished documentation aligned with current runtime behavior. Keep examples and commands accurate.";
    case "review":
      return "Return findings grouped by severity or importance, explain why each matters, and suggest the smallest credible next step.";
    case "explain":
      return "Return a clear, well-structured explanation matched to the question, with no unnecessary verbosity.";
    case "general":
    default:
      return "Return a clear, well-structured response matched to the task, with no unnecessary verbosity.";
  }
}

export function buildWorkStyle(
  intent: AugmentTaskIntent,
  intensity: PromptLeverageIntensity
): string {
  const lines: string[] = [`Task type: ${intent}`, `Effort level: ${intensity}`];

  switch (intent) {
    case "implement":
      lines.push(
        "Understand the problem broadly enough to avoid narrow mistakes, then go deep where the risk or complexity is highest.",
        "Use first-principles reasoning before proposing changes."
      );
      break;
    case "debug":
      lines.push(
        "Inspect before editing. Reproduce or confirm the issue first.",
        "Use first-principles reasoning to find the root cause, not just the symptom."
      );
      break;
    case "refactor":
      lines.push(
        "Preserve behavior. Improve structure without unnecessary API changes.",
        "Remove duplication or dead code when appropriate."
      );
      break;
    case "review":
      lines.push(
        "Use fresh-eyes critique. Distinguish confirmed issues from plausible risks.",
        "Order findings by severity or impact."
      );
      break;
    case "research":
      lines.push(
        "Gather evidence broadly before narrowing. Cite sources when web research is involved.",
        "End with a recommended path."
      );
      break;
    case "docs":
      lines.push(
        "Align documentation with current runtime behavior.",
        "Keep examples and commands accurate."
      );
      break;
    case "test-fix":
      lines.push(
        "Decide whether the bug or the test is wrong before fixing.",
        "Keep regression coverage close to the change."
      );
      break;
    case "explain":
      lines.push("Keep it explanatory. Do not turn it into an execution plan unless asked.");
      break;
    case "general":
    default:
      lines.push(
        "Understand the problem broadly enough to avoid narrow mistakes, then go deep where the risk or complexity is highest."
      );
      break;
  }

  if (intensity === "Deep" || intensity === "Standard") {
    lines.push("For non-trivial work, review the result once with fresh eyes before finalizing.");
  }

  return lines.join("\n");
}

export function buildVerification(intent: AugmentTaskIntent): string {
  const base = "Check correctness, completeness, and edge cases.";
  switch (intent) {
    case "implement":
    case "refactor":
    case "test-fix":
      return `${base}\nRun relevant checks (tests, lint, typecheck) and verify the change does not break existing behavior.`;
    case "debug":
      return `${base}\nConfirm the root cause is addressed and add or update regression coverage when appropriate.`;
    case "review":
      return `${base}\nAvoid speculative redesign unless requested.`;
    case "research":
      return `${base}\nImprove obvious weaknesses if a better approach is available within scope.`;
    case "docs":
      return `${base}\nVerify examples and commands still work.`;
    case "explain":
    case "general":
    default:
      return `${base}\nImprove obvious weaknesses if a better approach is available within scope.`;
  }
}

export function buildDoneCriteria(intent: AugmentTaskIntent): string {
  switch (intent) {
    case "implement":
    case "refactor":
    case "test-fix":
      return "Stop only when the change is complete, tests pass, and there are no known regressions.";
    case "debug":
      return "Stop only when the root cause is confirmed fixed and regression coverage is in place.";
    case "review":
      return "Stop only when findings are delivered with severity, reasoning, and next-step suggestions.";
    case "research":
      return "Stop only when the synthesis is grounded, uncertainties are flagged, and a recommended path is provided.";
    case "docs":
      return "Stop only when documentation matches current behavior and examples are verified.";
    case "explain":
      return "Stop only when the explanation clearly answers the question.";
    case "general":
    default:
      return "Stop only when the response satisfies the task, matches the requested format, and passes the verification step.";
  }
}

// ---------------------------------------------------------------------------
// Full framework assembly
// ---------------------------------------------------------------------------

export interface PromptLeverageBlocks {
  objective: string;
  context: string;
  workStyle: string;
  toolRules: string;
  outputContract: string;
  verification: string;
  doneCriteria: string;
}

/**
 * Build all framework blocks for a given draft and intent.
 * This is the deterministic first-pass — the LLM later refines the actual
 * rewrite using these blocks as scaffolding.
 */
export function buildFrameworkBlocks(
  draft: string,
  intent: AugmentTaskIntent
): PromptLeverageBlocks {
  const intensity = inferIntensity(draft, intent);

  return {
    objective: [
      `Complete this task: ${draft.trim()}`,
      "Optimize for a correct, useful result rather than a merely plausible one.",
    ].join("\n"),
    context: [
      "Preserve the user's original intent and constraints.",
      "Surface any key assumptions if required information is missing.",
    ].join("\n"),
    workStyle: buildWorkStyle(intent, intensity),
    toolRules: buildToolRules(intent),
    outputContract: buildOutputContract(intent),
    verification: buildVerification(intent),
    doneCriteria: buildDoneCriteria(intent),
  };
}

/**
 * Format the blocks into a single string for injection into a prompt.
 */
export function formatFrameworkBlocks(blocks: PromptLeverageBlocks): string {
  return [
    `Objective:\n${indent(blocks.objective)}`,
    `Context:\n${indent(blocks.context)}`,
    `Work Style:\n${indent(blocks.workStyle)}`,
    `Tool Rules:\n${indent(blocks.toolRules)}`,
    `Output Contract:\n${indent(blocks.outputContract)}`,
    `Verification:\n${indent(blocks.verification)}`,
    `Done Criteria:\n${indent(blocks.doneCriteria)}`,
  ].join("\n\n");
}

function indent(text: string): string {
  return text
    .split("\n")
    .map((line) => `- ${line}`)
    .join("\n");
}
