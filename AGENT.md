# PriyoScript Agent Guide

This file is for future contributors (human or AI) working on PriyoScript.

## Core Rules

1. Do not break existing syntax or examples unless intentionally deprecating.
2. Any parser/compiler/VM change must include tests.
3. Keep user errors humanized; keep dev diagnostics structured.
4. Update docs when language behavior changes:
   - `SYNTAX.md`
   - `ARCHITECTURE.md`
   - `README.md` (if user-facing feature changed)

## Mandatory Validation

Run before finalizing:

1. `npm run lint`
2. `npm run test:run`
3. Run at least one relevant example from `examples/`.

## Prompt Templates For Vibe Coders

Use these prompts directly with your coding assistant.

### 1. Feature Implementation Prompt

```text
Implement <feature> in PriyoScript end-to-end.
Touch lexer/parser/compiler/vm/runtime as needed.
Do not remove existing features.
Add clear code comments only where logic is non-obvious.
Add or update tests (lexer/parser/compiler/vm).
Update SYNTAX.md and ARCHITECTURE.md.
Run npm run lint and npm run test:run, then report exact outcomes.
```

### 2. Bugfix Prompt

```text
Fix this PriyoScript bug: <bug>.
First reproduce with a failing test.
Then implement the minimal robust fix.
Preserve backward compatibility unless explicitly told otherwise.
Add humanized user error messaging if the bug surfaces to end users.
Run lint + tests and summarize changed files.
```

### 3. Parser/Grammar Prompt

```text
Add grammar support for <syntax>.
Update AST models, parser rules, compiler lowering, and VM execution semantics.
Include positive and negative tests for parser/compiler/vm.
Document exact syntax in SYNTAX.md with examples.
```

### 4. Runtime/OOP Prompt

```text
Harden OOP/runtime behavior for <scenario>.
Enforce rules in compiler where possible; validate in VM at runtime.
Improve error messages for misuse with clear tips.
Add tests for valid and invalid flows.
```

### 5. Module System Prompt

```text
Extend module system behavior: <requirement>.
Support path imports safely, handle cycles, and preserve cache correctness.
Ensure REPL reset behavior remains correct.
Add integration tests using temporary module files.
```

### 6. Refactor Prompt

```text
Refactor <area> for maintainability without changing behavior.
Remove duplication, improve naming, and add brief explanatory comments.
Prove no regressions via full test run.
Do not alter public syntax or CLI semantics.
```

## Review Checklist

1. Are new tokens/keywords mapped correctly in `keywords.json` and lexer keywords?
2. Are AST changes compiled and executed correctly?
3. Are runtime errors classified into existing error code system?
4. Is REPL behavior still consistent with CLI runtime semantics?
5. Are docs and examples aligned with implemented behavior?
