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
  config/
    keywords.json           # Priyo keyword vocabulary
  index.js                  # Dev runner entry
bin/
  monalisa.js               # CLI entry
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
- `prakritiAsLongAs` (while)
- `prakritiCount` (for)
- `prakritiStop` (break)
- `prakritiGoOn` (continue)

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
  - parent method: `priyoParent.method(...)`
  - parent property access: `priyoParent.field`
- Static members:
  - static method declaration: `lisaaStable lisaaTask ...`
  - static field read/write via class object

### 4.7 Builtins

- Output: `priyoTell(...)`
- Input:
  - `priyoListenSentence(...)`
  - `priyoListenNumber(...)`
  - `priyoListen(...)` (compatibility alias)

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

## 6. Current Limitations

The following tokens/keywords exist partially or are reserved but not fully implemented:

- Modules/import/export/package execution
- `switch/case/default`
- `try/catch/finally/throw`
- `async/await/yield`
- `interface`, `enum`, access modifiers
- full `priyoParent` constructor chaining conventions beyond current method/property dispatch

## 7. Near-Term Development Targets

1. Add module loading + import/export runtime.
2. Add structured error classes by stage (lexer/parser/compiler/vm).
3. Add automated tests by pipeline layer (lexer/parser/compiler/vm integration).
4. Expand OOP semantics (constructor chaining conventions, richer static/parent checks).
5. Implement advanced control flow and exception handling.
