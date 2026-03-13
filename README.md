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

1. Detect intent (implement, debug, refactor, review, research, docs, test-fix, explain, general)
2. Auto-select rewrite mode — `plain` for simple tasks, `execution-contract` for complex ones
3. Enhance using Prompt Leverage framework blocks (objective, context, work style, tool rules, verification, done criteria)
4. Place the result in the editor for you to review and send

## Examples

### Debug — execution-contract, Standard effort

**You type:**
```
/augment fix the login bug where users get redirected to 404
```

**Augment produces:**
```
<task>
Fix the login flow bug where successful authentication redirects users to a 404 page
instead of the intended destination.
</task>

<context>
- Reproduce the issue first — confirm the redirect target after login.
- Inspect the auth callback handler and any post-login redirect logic.
- Check for hardcoded routes, stale path constants, or race conditions between
  session creation and navigation.
</context>

<constraints>
- Use first-principles reasoning to find the root cause, not just the symptom.
- Inspect before editing. Reproduce or confirm the issue first.
</constraints>

<verification>
- Confirm the root cause is addressed and the redirect lands on the correct page.
- Run relevant tests and add regression coverage when appropriate.
</verification>

<deliverable>
Diagnosis with root cause, the fix, validation steps, and regression notes.
Stop only when the root cause is confirmed fixed and regression coverage is in place.
</deliverable>
```

### Refactor — execution-contract, Deep effort

**You type:**
```
/augment careful refactor of the strategy builder to reduce branching and duplication
```

**Augment produces:**
```
<task>
Refactor the strategy builder module to reduce branching complexity and eliminate
code duplication while preserving all existing behavior.
</task>

<context>
- Review the current strategy builder and identify repeated patterns across branches.
- Map which branches share logic that can be extracted into shared helpers.
</context>

<constraints>
- Preserve behavior — no API surface changes unless removing genuinely dead exports.
- Improve structure without unnecessary changes. Remove duplication or dead code
  when appropriate.
- Review the result once with fresh eyes before finalizing.
</constraints>

<verification>
- Run relevant checks (tests, lint, typecheck) and verify the change does not
  break existing behavior.
- Check correctness, completeness, and edge cases.
</verification>

<deliverable>
Concise summary, concrete changes, validation notes, and any remaining risks.
Stop only when the change is complete, tests pass, and there are no known regressions.
</deliverable>
```

### Explain — plain rewrite, Light effort

**You type:**
```
/augment explain how the model routing works
```

**Augment produces:**
```
Explain how the model routing system works in this codebase. Walk through the
detection logic, what model families are recognized, and how the resolved family
affects downstream prompt generation. Keep the explanation clear and well-structured
without turning it into an execution plan.
```

### Review — execution-contract, Standard effort

**You type:**
```
/augment review this PR for security issues
```

**Augment produces:**
```
<task>
Review the current PR for security issues. Focus on confirmed vulnerabilities and
plausible risks — distinguish between the two.
</task>

<context>
- Read enough surrounding context to understand intent before critiquing.
- Check for injection vectors, auth/authz gaps, secrets in code, unsafe deserialization,
  and unvalidated inputs.
</context>

<verification>
- Check correctness and completeness. Avoid speculative redesign unless requested.
</verification>

<deliverable>
Findings grouped by severity, with reasoning for each and the smallest credible
next step. Stop only when findings are delivered with severity, reasoning, and
next-step suggestions.
</deliverable>
```

### General — plain rewrite, Light effort

**You type:**
```
/augment summarize what changed in the last 3 commits
```

**Augment produces:**
```
Summarize the changes introduced in the last 3 git commits in this repository.
For each commit, state what was changed and why. Keep the summary concise and
factual — no unnecessary verbosity.
```

## How it works

- **Intent detection** — classifies your prompt into one of 9 intents using pattern matching, then tailors the rewrite accordingly
- **Rewrite modes** — `plain` rewrites into a stronger prompt (used for explain, general); `execution-contract` compiles into a structured task contract with objective, context, constraints, verification, and deliverable (used for implement, debug, refactor, review, research, docs, test-fix)
- **Effort scaling** — Light / Standard / Deep intensity, inferred from task complexity. Keywords like "careful", "thorough", "security", "architecture" trigger Deep; operational intents default to Standard; explain and general default to Light
- **Model-family aware** — detects Claude vs GPT model family and adjusts output style: Claude-style prefers XML sections, GPT-style prefers compact bullets
- **Context aware** — injects recent conversation history and project metadata (cwd, git branch) so the rewrite is grounded in your current session
