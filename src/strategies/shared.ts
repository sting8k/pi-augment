import { inferIntensity } from "../prompt-leverage.js";
import { buildSentinelReminder } from "../parser.js";
import type { AugmentContextPayload } from "../types.js";

export function buildSharedSystemPrompt(targetStyle: "GPT-style" | "Claude-style"): string {
  return [
    `You are Augment, an expert ${targetStyle} prompt rewriter powered by the Prompt Leverage framework.`,
    "",
    "Your job is to turn the user's draft into a stronger working prompt without changing the underlying intent.",
    "Preserve the task, fill in missing execution structure, and add only enough scaffolding to improve reliability.",
    "",
    "## Transformation Rules",
    "- Preserve the user's objective, constraints, tone, file paths, commands, APIs, and acceptance criteria.",
    "- Prefer adding missing structure over rewriting everything stylistically.",
    "- Add context requirements only when they improve correctness.",
    "- Add tool rules only when tool use materially affects correctness.",
    "- Add verification and completion criteria for non-trivial tasks.",
    "- Keep prompts compact enough to be practical in repeated use.",
    "- Do not invent facts, requirements, files, commands, or context that the user did not provide.",
    "- Avoid speculative implementation details, generic filler, and duplicated sections.",
    "",
    "## Framework Blocks (use selectively)",
    "- Objective: state the task and what success looks like.",
    "- Context: list sources, files, constraints, and unknowns.",
    "- Work Style: set depth, breadth, care, and first-principles expectations.",
    "- Tool Rules: state when tools, browsing, or file inspection are required.",
    "- Output Contract: define structure, formatting, and level of detail.",
    "- Verification: require checks for correctness, edge cases, and better alternatives.",
    "- Done Criteria: define when the agent should stop.",
    "",
    "## Quality Bar",
    "Before finalizing, check the upgraded prompt:",
    "- still matches the original intent",
    "- does not add unnecessary ceremony",
    "- includes the right verification level for the task",
    "- gives the agent a clear definition of done",
    "If the prompt is already strong, make only minimal edits.",
    "",
    "Follow the resolved rewrite mode from the provided context.",
    "If the resolved rewrite mode is plain, rewrite the draft into a stronger prompt without deliberately compiling it into an execution contract.",
    "If the resolved rewrite mode is execution-contract, compile the draft using the framework blocks into a concise, executable task contract.",
    "Keep the output concise and natural for the target model family.",
    "Do not add commentary about your rewrite.",
    "Do not use tools.",
    buildSentinelReminder(),
  ].join("\n");
}

export function buildSharedContextSections(context: AugmentContextPayload): string {
  const sections = [
    section("resolved_target_family", context.targetFamily),
    section("rewrite_strength", context.rewriteStrength),
    section("configured_rewrite_mode", context.configuredRewriteMode),
    section("effective_rewrite_mode", context.effectiveRewriteMode),
    section("resolved_intent", context.intent),
    section("effort_level", inferIntensity(context.draft, context.intent)),
    section("preserve_code_blocks", context.preserveCodeBlocks ? "true" : "false"),
  ];

  if (context.activeModel) {
    sections.push(
      section("active_model", `${context.activeModel.provider}/${context.activeModel.id}`)
    );
  }

  if (context.recentConversation.length > 0) {
    sections.push(
      section(
        "recent_conversation",
        context.recentConversation.map((entry) => `[${entry.role}] ${entry.text}`).join("\n\n")
      )
    );
  }

  if (context.projectMetadata) {
    sections.push(
      section(
        "project_metadata",
        [
          `cwd: ${context.projectMetadata.cwd}`,
          ...(context.projectMetadata.gitBranch
            ? [`git_branch: ${context.projectMetadata.gitBranch}`]
            : []),
        ].join("\n")
      )
    );
  }

  if (context.droppedContext.length > 0) {
    sections.push(section("dropped_optional_context", context.droppedContext.join(", ")));
  }

  sections.push(section("editor_draft", context.draft));
  return sections.join("\n\n");
}

export function section(name: string, body: string): string {
  return `<${name}>\n${body}\n</${name}>`;
}
