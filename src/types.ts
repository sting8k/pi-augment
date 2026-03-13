export type AugmentFamily = "gpt" | "claude";
export type AugmentRewriteMode = "plain" | "execution-contract";
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
  effectiveRewriteMode: AugmentRewriteMode;
  intent: AugmentTaskIntent;
  recentConversation: ConversationExcerpt[];
  projectMetadata?: ProjectMetadata;
}

export interface EnhancementResult {
  enhanced: string;
  intent: AugmentTaskIntent;
  mode: AugmentRewriteMode;
  family: AugmentFamily;
}
