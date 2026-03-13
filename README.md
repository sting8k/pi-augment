# pi-augment

Pi extension that rewrites your prompts into stronger, more structured versions before sending them to the LLM. Uses intent detection and the [Prompt Leverage](https://github.com/hoangnb24/skills/tree/main/skills/prompt-leverage) framework to add just enough scaffolding without over-specifying simple tasks.

Inspired by [pi-promptsmith](https://github.com/ayagmar/pi-promptsmith).

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
/augment <your prompt here>
```

The extension will:

1. Detect intent (implement, debug, refactor, review, research, docs, test-fix, explain)
2. Auto-select rewrite mode — `plain` for simple tasks, `execution-contract` for complex ones
3. Enhance using Prompt Leverage framework blocks (objective, context, work style, tool rules, verification, done criteria)
4. Place the result in the editor for you to review and send

## Examples

```
/augment fix the login bug where users get redirected to 404
/augment refactor the strategy builder to reduce branching
/augment review this PR for security issues
/augment explain how the model routing works
```

## How it works

- **Intent detection** — classifies your prompt type and tailors the rewrite accordingly
- **Rewrite modes** — `plain` rewrites into a stronger prompt; `execution-contract` compiles into a structured task contract with objective, constraints, verification, and done criteria
- **Effort scaling** — Light / Standard / Deep intensity, inferred from task complexity
- **Model-family aware** — generates Claude-style or GPT-style prompts based on the active model
- **Context aware** — injects recent conversation history and project metadata (cwd, git branch)
