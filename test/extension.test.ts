import test from "node:test";
import assert from "node:assert/strict";
import { EXTENSION_COMMAND, SHORTCUT_KEY } from "../src/constants.js";
import { createAugmentExtension } from "../src/index.js";
import { createMockPi } from "./helpers.js";

void test("extension registers the augment command and shortcut", () => {
  const harness = createMockPi();

  createAugmentExtension(harness.pi);

  assert.ok(harness.commands.has(EXTENSION_COMMAND));
  assert.ok(harness.shortcuts.has(SHORTCUT_KEY));
  assert.ok(!("toolName" in harness));
});
