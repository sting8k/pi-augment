import type { Api, Model } from "@mariozechner/pi-ai";
import type { AugmentFamily } from "./types.js";

export function detectFamily(model: Model<Api> | undefined): AugmentFamily {
  if (!model) return "claude";

  const provider = model.provider.toLowerCase();
  const id = model.id.toLowerCase();

  if (provider === "openai" || id.startsWith("gpt") || /^o[1-9]/.test(id)) {
    return "gpt";
  }

  return "claude";
}
