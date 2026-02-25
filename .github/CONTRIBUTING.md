# Contributing to PriyoScript

## Setup

1. Fork and clone the repository.
2. Install dependencies:
   - `npm install`
3. Run tests:
   - `npm run test:run`
4. Run lint:
   - `npm run lint`

## Branch and Commit

1. Create a feature branch from `main`.
2. Keep commits focused and atomic.
3. Use clear commit messages (what changed and why).

## Pull Requests

1. Include a summary of behavior changes.
2. Add or update tests for parser/compiler/runtime changes.
3. Update docs (`README.md`, `SYNTAX.md`, `ARCHITECTURE.md`) when syntax/runtime behavior changes.
4. Ensure CI-related commands pass locally before opening PR.

## Language Changes Checklist

- Lexer token rules updated if syntax changed.
- Parser AST coverage added/updated.
- Compiler opcode generation updated.
- VM execution path updated.
- Error handling remains humanized for users and detailed for dev mode.
