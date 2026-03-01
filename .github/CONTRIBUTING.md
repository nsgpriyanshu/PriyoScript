# Contributing to PriyoScript

Thank you for contributing to PriyoScript.

This document explains how to report issues, propose improvements, and submit code changes safely.

## Project Scope

PriyoScript includes:

- Language core (`lexer`, `parser`, `compiler`, `vm`)
- Runtime and built-ins
- CLI and REPL
- Packages/modules
- Documentation (`README`, `SYNTAX.md`, `ARCHITECTURE.md`, `web/` docs)

Contributions are welcome in all these areas.

## Instructions for Logging Issues

### 1. Check existing docs first

Before opening an issue, check:

- `README.md`
- `SYNTAX.md`
- `ARCHITECTURE.md`
- `ERRORS.md`

If your question is already answered there, update your local setup and retry.

### 2. Search for duplicates

Search open and closed issues before creating a new one:

- https://github.com/nsgpriyanshu/PriyoScript/issues

Use keywords related to:

- error code (for example `PSYN-002`)
- feature area (`array`, `oop`, `module`, `repl`)
- exact command used (`monalisa -repl`)

### 3. Questions vs issues

Use GitHub issues for:

- reproducible bugs
- feature requests
- documentation corrections

If it is a usage question, add full context and code so maintainers can reproduce quickly.

### 4. Reporting a bug

Include all of the following:

- PriyoScript version (`monalisa -v`)
- OS and Node version
- exact `.priyo` code sample
- exact command used
- expected behavior
- actual behavior
- full error output (with code/stage/location if available)

### 5. Suggesting a feature

Provide:

- the problem being solved
- why current behavior is insufficient
- proposed syntax/API
- at least one concrete example program
- backward compatibility concerns (if any)

## Instructions for Contributing Code

## What you need

1. A GitHub account.
2. A fork of this repository.
3. Node.js 18+.
4. npm.
5. A code editor.

## Get started

1. Fork the repository.
2. Clone your fork locally.
3. Install dependencies:

```bash
npm install
```

4. Run lint and tests before making changes:

```bash
npm run lint
npm run test:run
```

5. Create a feature branch from `main`.

## Recommended commands

```bash
npm run lint
npm run lint:fix
npm run test:run
npm run run:examples
node bin/monalisa.js -h
```

Web docs commands:

```bash
npm --prefix web install
npm --prefix web run types:check
npm --prefix web run build
```

## PriyoScript language changes checklist

If your PR changes language behavior, verify all relevant layers:

- Lexer tokenization updated
- Parser grammar/AST updated
- Compiler bytecode/opcode path updated
- VM execution behavior updated
- Errors keep user-friendly messages and proper codes
- Tests added/updated for changed behavior
- Docs updated (`SYNTAX.md`, `ARCHITECTURE.md`, web docs)

## Pull request requirements

Your PR should:

- explain what changed and why
- link related issue(s)
- include tests for behavior changes
- keep changes focused (avoid unrelated refactors)
- pass lint and tests locally

For docs-only PRs, include clear before/after wording improvements.

## Commit guidance

- Use clear commit messages.
- Keep commits scoped to one concern.
- Prefer small, reviewable diffs.

## Security reporting

Do not open public issues for security vulnerabilities.

Please follow:

- `.github/SECURITY.md`

## Code of collaboration

- Be respectful and technical in feedback.
- Discuss tradeoffs with examples.
- Prioritize clarity and reproducibility.

## License

By contributing, you agree that your contributions are licensed under the repository license.
