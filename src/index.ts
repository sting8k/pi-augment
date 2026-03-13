import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { EXTENSION_COMMAND } from "./constants.js";
import { enhance } from "./enhance.js";

export default function augmentExtension(pi: ExtensionAPI): void {
  pi.registerCommand(EXTENSION_COMMAND, {
    description: "Enhance a prompt using the Prompt Leverage framework",

    async handler(args, ctx) {
      const draft = args.trim();
      if (!draft) {
        ctx.ui.notify(`Usage: /${EXTENSION_COMMAND} <your prompt>`, "info");
        return;
      }

      try {
        const result = await enhance(ctx, pi.exec.bind(pi), draft);
        if (!result) {
          ctx.ui.notify("Enhancement cancelled.", "info");
          return;
        }

        ctx.ui.setEditorText(result.enhanced);
        ctx.ui.notify(
          `Enhanced (${result.intent}, ${result.mode}, ${result.family}). Review and press Enter.`,
          "info"
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Enhancement failed.";
        ctx.ui.notify(message, "error");
      }
    },
  });
}
