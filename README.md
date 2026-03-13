# pi-augment

Pi extension that rewrites your prompts into stronger, more structured versions before sending them to the LLM. Uses intent detection and the Prompt Leverage framework to add just enough scaffolding — objective, context, work style, tool rules, verification, and done criteria — without over-specifying simple tasks.

## Inspired by

- [pi-promptsmith](https://github.com/ayagmar/pi-promptsmith) — the original prompt rewriter extension for Pi
- [prompt-leverage](https://github.com/hoangnb24/skills/tree/main/skills/prompt-leverage) — the framework powering the rewrite logic (Objective → Context → Work Style → Tool Rules → Output Contract → Verification → Done Criteria)

## Install

```bash
pi install https://github.com/sting8k/pi-augment
```

Or try without installing:

```bash
pi -e https://github.com/sting8k/pi-augment
```

## Usage

```
/aug <your prompt here>
```

Type your prompt after `/aug`, the extension will:

1. Detect intent (implement, debug, refactor, review, research, docs, test-fix, explain)
2. Auto-select rewrite mode (plain or execution-contract) based on intent
3. Enhance the prompt with Prompt Leverage framework blocks
4. Place the enhanced prompt in the editor for you to review and send

## Examples

```
/aug fix the login bug where users get redirected to 404
/aug refactor the strategy builder to reduce branching
/aug review this PR for security issues
/aug explain how the model routing works
```

## Features

- **Intent detection** — auto-classifies prompt type and tailors the rewrite
- **Two rewrite modes** — `plain` (stronger prompt) or `execution-contract` (structured task contract), auto-selected
- **Prompt Leverage framework** — adds framework blocks (work style, tool rules, verification, done criteria) as needed
- **Intensity levels** — Light / Standard / Deep, inferred from task complexity
- **Model-family aware** — generates GPT-style or Claude-style prompts based on active model
- **Context injection** — includes recent conversation and project metadata
