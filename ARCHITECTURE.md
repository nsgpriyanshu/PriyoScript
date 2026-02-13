# PriyoScript Architecture

## Goals

- Keep the language pipeline modular and testable.
- Separate compile-time and runtime responsibilities.
- Keep current features stable while enabling phase-wise expansion.

## Runtime Flow

```text
.priyo source
  -> Lexer
  -> Parser (AST)
  -> Compiler (Bytecode)
  -> VM
  -> Runtime Builtins / Environment
```

## Current Production Structure

```text
src/
  core/
    run.js              # Shared execution pipeline for CLI and dev runner
  lexer/
    lexer.js            # Token scanner
    token.js            # Token types
    keywords.js         # Generated keyword map from config/keywords.json
    forbidden.js        # Reserved external language words
  parser/
    parser.js           # Syntax parser with clear statement/expression sections
    ast.js              # AST node definitions
  compiler/
    compiler.js         # AST -> bytecode compiler
    opcodes.js          # VM instruction set
  vm/
    vm.js               # Stack VM bytecode executor
  runtime/
    builtins.js         # Built-in functions (priyoTell, priyoListen)
    environment.js      # Variable storage and mutability rules
  config/
    keywords.json       # Single source of language keywords
  index.js              # Dev entrypoint
bin/
  monalisa.js           # CLI entrypoint
```

## Key Design Decisions

- Single execution path: both `src/index.js` and `bin/monalisa.js` call `src/core/run.js`.
- Bytecode VM is stack-based and async-safe (for input builtins).
- Runtime state is isolated in `Environment`.
- Keyword duplication removed by building lexer keyword map from `src/config/keywords.json`.

## Phase 2 Implemented Features

- Variable declarations:
  - `priyoKeep` -> `var`
  - `priyoChange` -> `let`
  - `priyoPromise` -> `const`
- Builtins:
  - `priyoTell(...)` for output
  - `priyoListen(...)` for terminal input (async)
- Expressions:
  - string, number, boolean, null literals
  - identifier lookups
  - function call expressions

## Mutability Rules

- `priyoPromise` requires initializer and cannot be reassigned.
- `priyoChange` and `priyoKeep` are mutable declarations.
- `priyoKeep` redeclaration follows `var`-like behavior.

## Planned Next Steps

- Assignment statements and binary expressions.
- Control-flow statements (`if`, loops) compilation.
- Multi-file modules and import/export runtime.
- Unit and integration test suite by pipeline stage.
