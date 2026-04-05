import test from "node:test";
import assert from "node:assert/strict";
import { parseEnhancedPrompt, stripMarkdownFences } from "../src/parser.js";
import { SENTINEL_CLOSE, SENTINEL_OPEN } from "../src/constants.js";

void test("parseEnhancedPrompt extracts the enclosed prompt", () => {
  assert.equal(
    parseEnhancedPrompt(`${SENTINEL_OPEN}\nBetter prompt\n${SENTINEL_CLOSE}`),
    "Better prompt"
  );
});

void test("parseEnhancedPrompt rejects missing sentinel blocks", () => {
  assert.throws(() => parseEnhancedPrompt("plain text"), /sentinel block/i);
});

void test("parseEnhancedPrompt takes the first block when multiple are present", () => {
  assert.equal(
    parseEnhancedPrompt(
      `${SENTINEL_OPEN}first${SENTINEL_CLOSE}\n${SENTINEL_OPEN}second${SENTINEL_CLOSE}`
    ),
    "first"
  );
});

void test("parseEnhancedPrompt ignores leading explanatory text", () => {
  assert.equal(
    parseEnhancedPrompt(`Here is the enhanced prompt:\n${SENTINEL_OPEN}Better prompt${SENTINEL_CLOSE}`),
    "Better prompt"
  );
});

void test("parseEnhancedPrompt rejects empty sentinel block", () => {
  assert.throws(() => parseEnhancedPrompt(`${SENTINEL_OPEN}${SENTINEL_CLOSE}`), /empty enhanced prompt/i);
});

void test("stripMarkdownFences strips fenced output", () => {
  assert.equal(
    stripMarkdownFences("```xml\n<augment-enhanced-prompt>prompt</augment-enhanced-prompt>\n```"),
    "<augment-enhanced-prompt>prompt</augment-enhanced-prompt>"
  );
});

void test("stripMarkdownFences strips untyped fences", () => {
  assert.equal(
    stripMarkdownFences("```\n<augment-enhanced-prompt>prompt</augment-enhanced-prompt>\n```"),
    "<augment-enhanced-prompt>prompt</augment-enhanced-prompt>"
  );
});

void test("stripMarkdownFences leaves plain text unchanged", () => {
  assert.equal(stripMarkdownFences("no fences here"), "no fences here");
});
