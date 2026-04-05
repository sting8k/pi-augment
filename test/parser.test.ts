import test from "node:test";
import assert from "node:assert/strict";
import { parseEnhancedPrompt, stripOuterMarkdownFences } from "../src/parser.js";
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

void test("parseEnhancedPrompt handles fence wrapping", () => {
  assert.equal(
    parseEnhancedPrompt(
      "Here's the enhanced prompt:\n\n```xml\n" +
      `${SENTINEL_OPEN}Better prompt${SENTINEL_CLOSE}` +
      "\n```\n\nLet me know if you need anything else!"
    ),
    "Better prompt"
  );
});

void test("parseEnhancedPrompt handles misplaced fence lines", () => {
  // Model sometimes puts a fence in the middle of output
  assert.equal(
    parseEnhancedPrompt(
      `${SENTINEL_OPEN}Better prompt${SENTINEL_CLOSE}\n\`\`\`\nsome footer\n\`\`\``
    ),
    "Better prompt"
  );
});

void test("parseEnhancedPrompt rejects empty sentinel block", () => {
  // With multi-strategy parsing, empty blocks fall through all strategies and
  // hit the generic missing-block error (expected behavior — empty = invalid)
  assert.throws(() => parseEnhancedPrompt(`${SENTINEL_OPEN}${SENTINEL_CLOSE}`), /sentinel block/i);
});

void test("stripOuterMarkdownFences strips fenced output", () => {
  assert.equal(
    stripOuterMarkdownFences("```xml\n<augment-enhanced-prompt>prompt</augment-enhanced-prompt>\n```"),
    "<augment-enhanced-prompt>prompt</augment-enhanced-prompt>"
  );
});

void test("stripOuterMarkdownFences strips untyped fences", () => {
  assert.equal(
    stripOuterMarkdownFences("```\n<augment-enhanced-prompt>prompt</augment-enhanced-prompt>\n```"),
    "<augment-enhanced-prompt>prompt</augment-enhanced-prompt>"
  );
});

void test("stripOuterMarkdownFences leaves plain text unchanged", () => {
  assert.equal(stripOuterMarkdownFences("no fences here"), "no fences here");
});

void test("parseEnhancedPrompt accepts <execution_contract> as fallback sentinel", () => {
  assert.equal(
    parseEnhancedPrompt("<execution_contract>\nBetter prompt\n</execution_contract>"),
    "Better prompt"
  );
});

void test("parseEnhancedPrompt prefers primary sentinel over execution_contract", () => {
  assert.equal(
    parseEnhancedPrompt(
      `${SENTINEL_OPEN}primary${SENTINEL_CLOSE}\n<execution_contract>fallback</execution_contract>`
    ),
    "primary"
  );
});

void test("parseEnhancedPrompt handles heading before fence", () => {
  assert.equal(
    parseEnhancedPrompt(
      "## Execution Contract\n\n\`\`\`xml\n" +
      "<execution_contract>Better prompt</execution_contract>\n" +
      "\`\`\`\n"
    ),
    "Better prompt"
  );
});

void test("parseEnhancedPrompt extracts execution_contract amid surrounding noise", () => {
  assert.equal(
    parseEnhancedPrompt(
      "Here is the prompt you requested:\n\n" +
      "<execution_contract>\nActual prompt content\n</execution_contract>\n\n" +
      "Let me know if you need anything else!"
    ),
    "Actual prompt content"
  );
});

void test("parseEnhancedPrompt accepts raw execution-contract XML without wrapper", () => {
  assert.equal(
    parseEnhancedPrompt(
      "```xml\n" +
      "<task>Fix augment parsing</task>\n\n" +
      "<context>Anthropic returned raw execution contract</context>\n\n" +
      "<verification>Run parser tests</verification>\n" +
      "```"
    ),
    "<task>Fix augment parsing</task>\n\n<context>Anthropic returned raw execution contract</context>\n\n<verification>Run parser tests</verification>"
  );
});
