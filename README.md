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

## Features

- **Intent detection** — auto-classifies your prompt (implement, debug, refactor, review, research, docs, test-fix, explain) and tailors the rewrite accordingly
- **Two rewrite modes** — `plain` (stronger prompt) or `execution-contract` (structured task contract for coding agents), auto-selected based on intent
- **Prompt Leverage framework** — deterministic first-pass adds framework blocks (work style, tool rules, verification, done criteria) before LLM refinement
- **Intensity levels** — Light / Standard / Deep, inferred from task complexity
- **Model-family aware** — generates GPT-style or Claude-style prompts based on target model
- **Context injection** — includes recent conversation, project metadata, and active model info
- **Undo** — revert the last enhancement
- **Shortcut** — `Alt+P` to enhance the current prompt

## Commands

| Command | Description |
|---------|-------------|
| `/augment` | Enhance the current prompt |
| `/augment undo` | Revert last enhancement |
| `/augment status` | Show current settings and state |
| `/augment settings` | Open settings menu |
| `/augment enable\|disable` | Toggle on/off |
| `/augment mode auto\|plain\|execution-contract` | Set rewrite mode |
| `/augment strength light\|balanced\|strong` | Set rewrite strength |
| `/augment family auto\|gpt\|claude` | Set target model family |
| `/augment preview on\|off` | Preview before replacing |

Run `/augment` with no args to see all available subcommands.
