import type { Api, Context, Model } from "@mariozechner/pi-ai";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";

export type AugmentFamily = "gpt" | "claude";
export type AugmentTargetFamilyMode = "auto" | AugmentFamily;
export type AugmentEnhancerModelMode = "active" | "fixed" | "family-linked";
export type AugmentRewriteStrength = "light" | "balanced" | "strong";
export type AugmentRewriteMode = "auto" | "plain" | "execution-contract";
export type AugmentEffectiveRewriteMode = Exclude<AugmentRewriteMode, "auto">;
export type AugmentTaskIntent =
  | "implement"
  | "debug"
  | "refactor"
  | "review"
  | "research"
  | "docs"
  | "test-fix"
  | "explain"
  | "general";

export interface ModelRef {
  provider: string;
  id: string;
}

export interface ExactModelOverride extends ModelRef {
  family: AugmentFamily;
}

export interface FamilyOverride {
  pattern: string;
  family: AugmentFamily;
}

export interface FamilyEnhancerModels {
  gpt?: ModelRef;
  claude?: ModelRef;
}

export interface AugmentSettings {
  version: 1;
  enabled: boolean;
  shortcutEnabled: boolean;
  targetFamilyMode: AugmentTargetFamilyMode;
  fallbackFamily: AugmentFamily;
  exactModelOverrides: ExactModelOverride[];
  familyOverrides: FamilyOverride[];
  enhancerModelMode: AugmentEnhancerModelMode;
  fixedEnhancerModel?: ModelRef;
  familyEnhancerModels?: FamilyEnhancerModels;
  includeRecentConversation: boolean;
  includeProjectMetadata: boolean;
  statusBarEnabled: boolean;
  rewriteStrength: AugmentRewriteStrength;
  rewriteMode: AugmentRewriteMode;
  previewBeforeReplace: boolean;
  preserveCodeBlocks: boolean;
  enhancementTimeoutMs: number;
}

export interface ResolvedTargetFamily {
  family: AugmentFamily;
  source: "forced" | "exact-override" | "pattern-override" | "builtin" | "fallback";
  matchedRule?: string;
}

export interface ResolvedEnhancerModel {
  mode: AugmentEnhancerModelMode;
  family: AugmentFamily;
  model: Model<Api>;
  apiKey: string;
  label: string;
}

export interface ConversationExcerpt {
  role: "user" | "assistant";
  text: string;
  tokens: number;
  timestamp: number;
}

export interface ProjectMetadata {
  cwd: string;
  gitBranch?: string;
}

export interface AugmentContextPayload {
  draft: string;
  activeModel?: ModelRef;
  targetFamily: AugmentFamily;
  rewriteStrength: AugmentRewriteStrength;
  configuredRewriteMode: AugmentRewriteMode;
  effectiveRewriteMode: AugmentEffectiveRewriteMode;
  intent: AugmentTaskIntent;
  preserveCodeBlocks: boolean;
  recentConversation: ConversationExcerpt[];
  projectMetadata?: ProjectMetadata;
  droppedContext: string[];
}

export interface EnhancementPreparation {
  resolvedTargetFamily: ResolvedTargetFamily;
  enhancerModel: ResolvedEnhancerModel;
  promptContext: AugmentContextPayload;
  request: Context;
}

export interface AugmentDraftResolution {
  intent: AugmentTaskIntent;
  effectiveRewriteMode: AugmentEffectiveRewriteMode;
}

export interface AugmentStatusSnapshot {
  settings: AugmentSettings;
  activeModel?: ModelRef;
  resolvedTargetFamily?: ResolvedTargetFamily;
  enhancerModeLabel: string;
  busy: boolean;
  undoAvailable: boolean;
  currentDraftResolution?: AugmentDraftResolution;
  lastDraftResolution?: AugmentDraftResolution;
}

export interface AugmentRuntimeSupport {
  interactiveTui: boolean;
  reason?: string;
}

export interface ParsedAugmentCommand {
  name: string;
  args: string[];
}

export interface BuildPromptContextOptions {
  ctx: ExtensionContext;
  draft: string;
  settings: AugmentSettings;
  activeModel: Model<Api> | undefined;
  targetFamily: AugmentFamily;
  enhancerModel: Model<Api>;
  exec: (
    command: string,
    args: string[]
  ) => Promise<{ stdout: string; stderr: string; code: number }>;
}
