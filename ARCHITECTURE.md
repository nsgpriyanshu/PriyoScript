# PriyoScript Architecture

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
packages/
  math/
    index.js                # Built-in math package (phase-1 package system)
examples/
  basics/
  io/
  control-flow/
  functions/
  oop/
  scopes/
```

## 4. Implemented Language Features

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
- Function/method call expressions
- Member access with `.`

### 4.4 Control flow

- `prakritiIf`, `prakritiElseIf`, `prakritiElse`
- `prakritiChoose`, `prakritiCase`, `prakritiOtherwise` (switch/case/default)
- `prakritiAsLongAs` (while)
- `prakritiCount` (for)
- `prakritiStop` (break)
- `prakritiGoOn` (continue)
- `prakritiTry`, `prakritiCatch`, `prakritiAtEnd`, `prakritiThrow`

### 4.5 Functions

- Function declaration: `lisaaTask name(...) { ... }`
- Return: `priyoGiveBack ...`
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
  - current built-in package: `math` (acts as phase-1 template for upcoming array package)

## 5. Runtime Model

- Stack-based bytecode VM with explicit opcodes.
- Function and method execution use isolated call frames.
- Lexical environments are parent-linked.
- Scope enter/exit is explicit (`ENTER_SCOPE` / `EXIT_SCOPE`).
- Loop control jumps carry scope-unwind metadata to prevent leaks.
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
- CLI and future REPL share a common printer (`src/errors/printer.js`) to render humanized output consistently.
- Dev entry prints developer-oriented output with code + stage.

## 7. Current Limitations

Current language/runtime limitations that still need dedicated implementation:

- No first-class array syntax in language grammar yet:
  - no literal syntax like `[1, 2, 3]`
  - no index syntax like `arr[0]`
  - current workaround is `math` package array helpers
- Package system is phase-1 built-in only:
  - `lisaaBring` loads registered built-ins (currently `math`)
  - no user-defined package files or module resolution yet
  - `lisaaShare` / `lisaaBox` execution flow is not implemented
- No async/concurrency execution model:
  - `async/await/yield` tokens remain reserved
- Type system remains fully dynamic:
  - no static type checker
  - no compile-time type validation
- OOP semantics are strong but not exhaustive:
  - advanced constructor-chain constraints are still limited
  - access modifiers / interfaces / enums are reserved only
- Standard library is intentionally minimal:
  - only core builtins + `math` package currently exist

## 8. Future Plan (Roadmap)

Planned development sequence:

1. Add first-class array language support:
   - literals, indexing, updates, and array iteration patterns.
2. Expand package/module system:
   - `lisaaBring` for user modules, plus `lisaaShare` and `lisaaBox` runtime semantics.
3. Add automated tests by layer:
   - lexer/parser/compiler/vm unit + integration coverage.
4. Improve diagnostics:
   - richer source-mapped errors and cleaner stack traces.
5. Expand OOP semantics:
   - stronger constructor-chain validation and stricter member checks.
6. Add async and advanced runtime capabilities:
   - staged support for `async/await` and future concurrency primitives.
7. Add native distribution channels:
   - standalone binaries/installers for Windows/macOS/Linux (beyond npm global install).
