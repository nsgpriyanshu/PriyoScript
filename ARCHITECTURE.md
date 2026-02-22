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
scripts/
  build-windows-exe.ps1     # Build standalone Windows executable (pkg)
  install-windows.ps1       # Install CLI executable for current user (PATH setup)
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
| Expressions  | Arithmetic, comparison, logical, grouping                                            | 100%   |
| Expressions  | Function call and member access (`.`)                                                | 100%   |
| Control flow | `if / else if / else`                                                                | 100%   |
| Control flow | `switch / case / default`                                                            | 100%   |
| Control flow | `while`, `for`, `break`, `continue`                                                  | 100%   |
| Control flow | `try / catch / finally / throw`                                                      | 100%   |
| Functions    | Declaration, return, closures, recursion                                             | 100%   |
| OOP          | Classes, object creation, `priyoSelf`                                                | 100%   |
| OOP          | Inheritance and parent access (`priyoParent`)                                        | 100%   |
| OOP          | Static methods/fields and class fields                                               | 100%   |
| Builtins     | `priyoTell` and color variants                                                       | 100%   |
| Builtins     | `priyoListenSentence`, `priyoListenNumber`, `priyoListen`                            | 100%   |
| Packages     | Built-in package import (`lisaaBring`)                                               | 100%   |
| Packages     | Built-in package registry (`priyoPackage.*`)                                         | 100%   |
| Runtime      | Bytecode VM + lexical scope + call frames                                            | 100%   |
| Errors       | Typed staged errors + codes + humanized printer                                      | 100%   |
| CLI          | Help, syntax help, error list, code explain (`-h`, `-syntax`, `-errors`, `-explain`) | 100%   |
| Distribution | Windows standalone `.exe` build/install workflow                                     | 100%   |

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
  - current built-in package: `math` (arithmetic, trigonometry, and geometry helpers)
- Array helpers:
  - `priyoArray.length(arr)`, `priyoArray.push(arr, value)`, `priyoArray.pop(arr)`
  - `priyoArray.at(arr, index)`, `priyoArray.slice(arr, start?, end?)`
  - `priyoArray.first(arr)`, `priyoArray.last(arr)`, `priyoArray.reverse(arr)`
  - `priyoArray.includes(arr, value)`, `priyoArray.indexOf(arr, value)`, `priyoArray.join(arr, sep?)`

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

## 7. Automated Testing Architecture

We use **Vitest** for our unit testing framework, providing fast, modular test execution. Test suites are divided functionally to ensure production-grade resilience by proving each distinct phase of execution independently, making debugging easier when the pipeline breaks:

- **Lexer Tests** (\`tests/lexer.test.js\`): Verify tokenizer correctly segments raw source code into streams of tokens and handles custom PriyoScript keywords (e.g. \`priyoKeep\`, \`lisaaTask\`).
- **Parser Tests** (\`tests/parser.test.js\`): Ensure AST structures are properly generated, validating expressions, bindings, and control flow nodes.
- **Compiler Tests** (\`tests/compiler.test.js\`): Verify the AST is successfully lowered into expected linear bytecode instructions (\`OpCodes\`). Checks stack discipline and correct branch patching for \`JUMP\` instructions.
- **VM/Runtime Tests** (\`tests/vm.test.js\`): End-to-end integration tests executing source code through the pipeline into the actual \`VM\`. Validates language features and output via \`priyoTell\` by spying on the host environment output logger.

## 8. Current Limitations

Current language/runtime limitations that still need dedicated implementation:

- Array support is now expanded (phase-2 ergonomic layer):
  - slicing, helper APIs, and foreach loops are implemented
  - no destructuring patterns yet
  - no functional callback helpers (`map/filter/reduce`) yet
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

## 9. Future Plan (Roadmap)

Planned development sequence:

1. Add advanced array features beyond current ergonomics:
   - destructuring and higher-order callback helpers.
2. Expand package/module system:
   - `lisaaBring` for user modules, plus `lisaaShare` and `lisaaBox` runtime semantics.
3. Add automated tests by layer (Completed):
   - lexer/parser/compiler/vm unit + integration coverage implemented using Vitest.
4. Improve diagnostics:
   - richer source-mapped errors and cleaner stack traces.
5. Expand OOP semantics:
   - stronger constructor-chain validation and stricter member checks.
6. Add async and advanced runtime capabilities:
   - staged support for `async/await` and future concurrency primitives.
7. Add native distribution channels:
   - standalone binaries/installers for Windows/macOS/Linux (beyond npm global install).
