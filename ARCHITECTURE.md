# PriyoScript Architecture

## Current Version Snapshot

- Version: `v1.10.0`
- CI baseline:
  - `npm run lint` passes
  - `npm run test:run` passes
- Major additions in this version:
  - module system v3 (relative/absolute resolution, optional `index.priyo`, clearer not-found diagnostics)
  - debug tooling (`monalisa -trace`, source-level Priyo stack traces, `priyoBreak(...)` debug hook)
  - diagnostics v2 (caret spans, typo suggestions, docs links per error code)
  - golden CLI/REPL tests and deep module-cycle stress tests
  - web docs app (Next.js + Fumadocs) with stable/canary docs structure
  - separate web versioning/changelog flow via Cliff-Jumper

## 1. Purpose

PriyoScript is a bytecode-interpreted language running on Node.js.
The current architecture is designed to keep syntax growth manageable while preserving runtime correctness.

## 2. Execution Pipeline

```text
.priyo source
  -> Lexer (tokens)
  -> Parser (AST)
  -> Compiler (bytecode)
  -> VM (execution)
  -> Runtime (environment + builtins)
```

No transpilation, no `eval`, no AST-walk interpreter at runtime.

## 3. Repository Structure

```text
src/
  core/
    run.js                  # Shared execute pipeline for CLI and dev entry
  repl/
    repl.js                 # Interactive REPL loop with shared runtime state
  lexer/
    lexer.js                # Tokenizer
    token.js                # Token kinds
    keywords.js             # Keyword map from config
    forbidden.js            # Forbidden host-language words
  parser/
    ast.js                  # AST node models
    parser.js               # Grammar parser
  compiler/
    compiler.js             # AST -> bytecode compiler
    opcodes.js              # VM instruction set
  vm/
    vm.js                   # Bytecode VM + call frames + class dispatch
  runtime/
    environment.js          # Lexical scopes and variable semantics
    builtins.js             # Builtin functions
  packages/
    registry.js             # Built-in package manager registry
  errors/
    priyo-error.js          # Typed throwable error objects
    codes.js                # Stable error codes and stage/category enums
    factories.js            # Error creation/classification helpers
    formatter.js            # User/dev formatting
    printer.js              # Shared printer for CLI/REPL/dev
  config/
    keywords.json           # Priyo keyword vocabulary (implemented + planned)
  index.js                  # Dev runner entry
bin/
  monalisa.js               # CLI entry
scripts/
  run-all.js                # Run all language examples
web/
  app/                      # Next.js app router pages/layout/routes
  playground/               # Browser-only lightweight playground runtime helpers
  content/docs/             # Fumadocs content (stable + canary)
  lib/                      # Docs source/layout/metadata helpers
  package.json              # Web package with its own version
  .cliff-jumperrc.json      # Separate web release config/tag template
  CHANGELOG.md              # Separate web changelog
packages/
  math/
    index.js                # Built-in math package (phase-1 package system)
  decorators/
    index.js                # Built-in string/date/time formatting package
examples/
  basics/
  io/
  control-flow/
  functions/
  oop/
  modules/
  scopes/
tests/
  lexer.test.js
  parser.test.js
  compiler.test.js
  vm.test.js
```

## 4. Implemented Language Features

### 4.0 Feature Completion Table (100% as of now)

| Area         | Feature                                                                              | Status |
| ------------ | ------------------------------------------------------------------------------------ | ------ |
| Core         | Entry block (`monalisa { ... }`)                                                     | 100%   |
| Core         | Comments (`//`, `/* ... */`)                                                         | 100%   |
| Core         | Literals (number, string, boolean, null)                                             | 100%   |
| Variables    | `priyoKeep`, `priyoChange`, `priyoPromise`                                           | 100%   |
| Variables    | Variable and property assignment                                                     | 100%   |
| Arrays       | Array literals and index read/write (`[]`)                                           | 100%   |
| Arrays       | Array slicing (`arr[start:end]`)                                                     | 100%   |
| Arrays       | Iteration-friendly foreach (`prakritiCount (item priyoInside arr)`)                  | 100%   |
| Arrays       | Array destructuring declarations (`priyoChange [a, b] = arr`)                        | 100%   |
| Arrays       | Higher-order helpers (`map/filter/reduce/find/some/every`)                           | 100%   |
| Arrays       | Nested/default destructuring patterns (`[]`, `{}`)                                   | 100%   |
| Expressions  | Arithmetic, comparison, logical, grouping                                            | 100%   |
| Expressions  | Function call and member access (`.`)                                                | 100%   |
| Control flow | `if / else if / else`                                                                | 100%   |
| Control flow | `switch / case / default`                                                            | 100%   |
| Control flow | `while`, `for`, `break`, `continue`                                                  | 100%   |
| Control flow | `try / catch / finally / throw`                                                      | 100%   |
| Functions    | Declaration, return, closures, recursion                                             | 100%   |
| Functions    | Async function declaration (`prakritiWait lisaaTask`) + await (`prakritiPause`)      | 100%   |
| OOP          | Classes, object creation, `priyoSelf`                                                | 100%   |
| OOP          | Inheritance and parent access (`priyoParent`)                                        | 100%   |
| OOP          | Static methods/fields and class fields                                               | 100%   |
| OOP          | Constructor-chain validation + stricter declared-member assignment checks            | 100%   |
| Builtins     | `priyoTell` and color variants                                                       | 100%   |
| Builtins     | `priyoListenSentence`, `priyoListenNumber`, `priyoListen`                            | 100%   |
| Packages     | Built-in package import (`lisaaBring`)                                               | 100%   |
| Packages     | Built-in package registry (`priyoPackage.*`)                                         | 100%   |
| Packages     | `decorators` package (string formatting + date/time helpers)                         | 100%   |
| Modules      | User modules (`lisaaBox`, `lisaaShare`, path `lisaaBring`)                           | 100%   |
| Modules      | Import alias + named imports + cycle guard                                           | 100%   |
| Modules      | Relative/absolute path resolution + `index.priyo` fallback                           | 100%   |
| Runtime      | Bytecode VM + lexical scope + call frames                                            | 100%   |
| Runtime      | REPL module cache invalidation on reset                                              | 100%   |
| Runtime      | Source-level Priyo stack traces on runtime errors                                    | 100%   |
| Errors       | Typed staged errors + codes + humanized printer                                      | 100%   |
| Errors       | Source-aware metadata (`file`, `line`, `column`, source excerpt, trimmed stack)      | 100%   |
| Errors       | Caret span highlighting + keyword typo suggestions + docs links per code             | 100%   |
| CLI          | Help, syntax help, error list, code explain (`-h`, `-syntax`, `-errors`, `-explain`) | 100%   |
| CLI          | Interactive REPL (`-repl` and no-arg launch)                                         | 100%   |
| CLI          | Trace mode (`-trace`) + breakpoint-style debug hook (`priyoBreak`)                   | 100%   |
| Distribution | npm global installation (`npm install -g priyoscript`)                               | 100%   |
| Web Docs     | Next.js + Fumadocs docs app with stable/canary sections                              | 100%   |
| Web          | Browser-only PriyoScript playground for basic programs (`/playground`)               | 100%   |
| Web          | Playground UX: syntax-highlighted editor + humanized error/tip output                | 100%   |
| Release      | Separate web versioning/changelog flow (`web-v*` tags)                               | 100%   |

### 4.1 Core syntax

- Entry block: `monalisa { ... }`
- Single-line comments: `// ...`
- Multi-line comments: `/* ... */`
- Literals: number, string, boolean, null

### 4.2 Variables and scope

- `priyoKeep` (var, function-scoped)
- `priyoChange` (let, block-scoped)
- `priyoPromise` (const, block-scoped)
- Assignment:
  - variable: `x = ...`
  - object/class property: `obj.field = ...`

### 4.3 Expressions

- Arithmetic: `+ - * / %`
- Comparison: `== != < <= > >=`
- Logical: `&& || !`
- Grouping with `(...)`
- Array literal syntax: `[1, 2, 3]`
- Array index read/write: `arr[0]`, `arr[1] = 99`
- Array slicing: `arr[1:4]`, `arr[:3]`, `arr[2:]`
- Array destructuring declaration: `priyoChange [a, b] = arr`
- Nested/default destructuring patterns:
  - array: `priyoChange [a = 1, [b]] = value`
  - object: `priyoChange {x, y: alias = 10} = value`
- Function/method call expressions
- Member access with `.`

### 4.4 Control flow

- `prakritiIf`, `prakritiElseIf`, `prakritiElse`
- `prakritiChoose`, `prakritiCase`, `prakritiOtherwise` (switch/case/default)
- `prakritiAsLongAs` (while)
- `prakritiCount` (for)
- `prakritiCount (item priyoInside items) { ... }` (foreach over arrays)
- `prakritiStop` (break)
- `prakritiGoOn` (continue)
- `prakritiTry`, `prakritiCatch`, `prakritiAtEnd`, `prakritiThrow`

### 4.5 Functions

- Function declaration: `lisaaTask name(...) { ... }`
- Async function declaration: `prakritiWait lisaaTask name(...) { ... }`
- Return: `priyoGiveBack ...`
- Await expression: `prakritiPause <expression>`
- Closures and recursion are supported

### 4.6 Classes and OOP

- Class declaration: `lisaaFamily Name { ... }`
- Instance creation: `priyoCreate Name(...)`
- Constructor convention: `init(...)`
- Instance methods with `priyoSelf`
- Inheritance: `lisaaInherit`
- Parent calls:
  - parent constructor shorthand: `priyoParent(...)`
  - parent method: `priyoParent.method(...)`
  - parent property access: `priyoParent.field`
  - parent property write: `priyoParent.field = ...`
  - constructor-chain rule: in child `init(...)`, `priyoParent(...)` must be first and cannot appear more than once
- Stricter member checks:
  - if a class declares instance fields, assignment to undeclared instance fields is rejected
  - if a class declares static fields, assignment to undeclared static fields is rejected
  - dynamic field assignment remains allowed for classes with no declared fields (backward compatibility)
- Static members:
  - static method declaration: `lisaaStable lisaaTask ...`
  - static field read/write via class object
- Class fields:
  - instance fields declared directly inside class body
  - static fields declared with `lisaaStable`

### 4.7 Builtins

- Output:
  - `priyoTell(...)`
  - `priyoTell.Build(...)`
  - `priyoTell.Success(...)`
  - `priyoTell.Info(...)`
  - `priyoTell.Warn(...)`
  - `priyoTell.Error(...)`
- Input:
  - `priyoListenSentence(...)`
  - `priyoListenNumber(...)`
  - `priyoListen(...)` (compatibility alias)
- Package manager:
  - `priyoPackage.list()`
  - `priyoPackage.has(name)`
  - `priyoPackage.use(name)`
  - `lisaaBring <packageName>` (syntactic sugar for built-in package loading)
  - current built-in packages:
    - `math` (arithmetic, trigonometry, geometry helpers)
    - `decorators` (string formatting + date/time helpers)
- Array helpers:
  - `priyoArray.length(arr)`, `priyoArray.push(arr, value)`, `priyoArray.pop(arr)`
  - `priyoArray.at(arr, index)`, `priyoArray.slice(arr, start?, end?)`
  - `priyoArray.first(arr)`, `priyoArray.last(arr)`, `priyoArray.reverse(arr)`
  - `priyoArray.includes(arr, value)`, `priyoArray.indexOf(arr, value)`, `priyoArray.join(arr, sep?)`
  - higher-order: `map`, `filter`, `reduce`, `forEach`, `find`, `some`, `every`
- User modules:
  - module root: `lisaaBox { ... }`
  - export binding: `lisaaShare name`
  - import by path: `lisaaBring "./module.priyo"`
  - alias import: `lisaaBring "./module.priyo": moduleAlias`
  - named import: `lisaaBring "./module.priyo": [x, y: localY]`
  - module path resolution v3:
    - relative imports: `./` and `../` resolve from importer file
    - project-root absolute imports: `/path/to/module` resolves from current project root
    - optional fallbacks: `module`, `module.priyo`, and `module/index.priyo`
  - cycle guard for recursive module graphs
  - REPL `.reset` clears module cache to avoid stale imports during iterative development
- Debug helper:
  - `priyoBreak("label")` emits a traceable breakpoint marker while keeping execution flow

## 5. Runtime Model

- Stack-based bytecode VM with explicit opcodes.
- Function and method execution use isolated call frames.
- Stage-1 async runtime support:
  - async function declarations compile with async metadata
  - await expressions resolve via VM await opcode (`AWAIT_VALUE`)
  - top-level await is allowed in entry/module blocks
- Lexical environments are parent-linked.
- Scope enter/exit is explicit (`ENTER_SCOPE` / `EXIT_SCOPE`).
- Loop control jumps carry scope-unwind metadata to prevent leaks.
- Optional VM tracing mode prints opcode-level execution (`-trace`) with frame + stack depth context.
- Class runtime stores:
  - instance methods
  - static methods
  - static fields
  - superclass reference

## 6. Error System

- Errors are real throwable objects (`PriyoSyntaxError`, `PriyoCompileError`, `PriyoRuntimeError`, `PriyoEngineError`).
- Every error has structured metadata:
  - `code`
  - `stage` (syntax/compile/runtime/core)
  - `category` (user/engine)
  - `metadata` object
- Pipeline stages are separated:
  - parser -> syntax errors
  - compiler -> compile errors
  - VM/runtime -> runtime errors
- CLI and REPL share a common printer (`src/errors/printer.js`) to render humanized output consistently.
- Dev entry prints developer-oriented output with code + stage.
- Runtime failures now include source-level Priyo stack metadata where available.

## 7. Automated Testing Architecture

We use **Vitest** for our unit testing framework, providing fast, modular test execution. Test suites are divided functionally to ensure production-grade resilience by proving each distinct phase of execution independently, making debugging easier when the pipeline breaks:

- **Lexer Tests** (\`tests/lexer.test.js\`): Verify tokenizer correctly segments raw source code into streams of tokens and handles custom PriyoScript keywords (e.g. \`priyoKeep\`, \`lisaaTask\`).
- **Parser Tests** (\`tests/parser.test.js\`): Ensure AST structures are properly generated, validating expressions, bindings, and control flow nodes.
- **Compiler Tests** (\`tests/compiler.test.js\`): Verify the AST is successfully lowered into expected linear bytecode instructions (\`OpCodes\`). Checks stack discipline and correct branch patching for \`JUMP\` instructions.
- **VM/Runtime Tests** (\`tests/vm.test.js\`): End-to-end integration tests executing source code through the pipeline into the actual \`VM\`. Validates language features and output via \`priyoTell\` by spying on the host environment output logger.
- **Diagnostics Tests** (\`tests/diagnostics.test.js\`): Verify span highlighting, typo suggestions, and docs links for syntax/compile/runtime error formatting.
- **Golden Output Tests** (\`tests/golden-cli-repl.test.js\`): Validate stable CLI and REPL user-facing output for help/errors.
- **Cycle Stress Tests** (\`tests/module-cycle-stress.test.js\`): Validate module loader behavior under deep cyclic dependency chains.
- **Module Resolution v3 Tests** (\`tests/module-resolution-v3.test.js\`): Validate path resolution behavior (`./`, `../`, `/`, and `index.priyo` fallback) and actionable not-found diagnostics.
- **Trace/Debug Tests** (\`tests/trace-debug.test.js\`): Validate `-trace` output and `priyoBreak(...)` debug marker behavior.

## 8. Current Limitations

Current language/runtime limitations that still need dedicated implementation:

- Package + module system currently supports:
  - built-in package import (`lisaaBring math`)
  - built-in package import (`lisaaBring decorators`)
  - user modules via path import (`lisaaBring "./file.priyo"`)
  - module exports via `lisaaShare`
  - alias and named import list syntax
- Destructuring supports nested/default patterns in declarations.
- Remaining limitation:
  - no rest/spread destructuring syntax yet
- Async support is currently staged:
  - implemented: `prakritiWait` + `prakritiPause`
  - planned: `yield` and explicit concurrency primitives
- Type system remains fully dynamic:
  - no static type checker
  - no compile-time type validation
- OOP semantics are strong but not exhaustive:
  - additional inheritance invariants can still be expanded
  - access modifiers / interfaces / enums are reserved only
- Standard library is still intentionally small:
  - currently: core builtins + `math` + `decorators`
  - filesystem and system-level utilities are not added yet
- Browser playground is intentionally constrained:
  - executes only in user browser runtime (no server execution)
  - supports basic statements only (`priyoTell`, variable declarations/assignment, simple expressions)
  - hard limits on source size, statement count, and output lines

## 9. Future Plan (Roadmap)

Planned development sequence:

1. Expand async/runtime model further:
   - add `yield` semantics and explicit concurrency primitives.
2. Harden distribution pipeline:
   - keep npm global installation and published package reliability production-ready.
   - add standalone installer/binary channels later after package lifecycle stabilizes.
3. Expand module ecosystem:
   - user package publishing and lockfile/version pinning workflow.
4. Extend standard library:
   - add core filesystem and system utilities on top of current `math` and `decorators` packages.
5. Strengthen diagnostics/debug UX:
   - richer trace filtering, structured debug sessions, and improved stack readability.
6. Expand docs/release automation:
   - CI docs preview deploys and synchronized release notes between root and web changelogs.
