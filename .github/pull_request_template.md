## Summary

<!-- Briefly explain what changed and why. -->

## Related Issue

<!-- Example: Closes #123 -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Performance improvement
- [ ] Tests only
- [ ] Documentation update
- [ ] Build/tooling/CI update

## Scope

- [ ] Language core (lexer/parser/compiler/vm)
- [ ] Runtime/built-ins
- [ ] CLI/REPL
- [ ] Packages/modules
- [ ] Examples
- [ ] Root docs (`README.md`, `SYNTAX.md`, `ARCHITECTURE.md`)
- [ ] Web docs/app (`web/`)

## Breaking Change

- [ ] No
- [ ] Yes (explain below)

<!-- If yes, explain migration impact and required user changes. -->

## What Changed

<!-- Use short bullets. Include key files or behavior changes. -->

## Verification

### Local Checks

- [ ] `npm run lint`
- [ ] `npm run test:run`
- [ ] `npm run run:examples` (or relevant examples manually)

### Web Checks (if `web/` changed)

- [ ] `npm --prefix web run types:check`
- [ ] `npm --prefix web run build`

### Additional Validation

<!-- Paste relevant command outputs, screenshots, or sample input/output if useful. -->

## Language Change Checklist

<!-- Fill only if language behavior changed. -->

- [ ] Lexer updated (if token rules changed)
- [ ] Parser/AST updated (if grammar changed)
- [ ] Compiler updated (if bytecode emission changed)
- [ ] VM updated (if runtime execution changed)
- [ ] Error codes/messages reviewed for user clarity
- [ ] New/updated tests cover the change

## Documentation Checklist

- [ ] `README.md` updated (if user-facing behavior changed)
- [ ] `SYNTAX.md` updated (if syntax changed)
- [ ] `ARCHITECTURE.md` updated (if feature/runtime design changed)
- [ ] Web docs updated (if docs content changed)

## Reviewer Notes

<!-- Mention tradeoffs, limitations, follow-ups, or areas needing extra review. -->
