# Priyo Architecture

## 1️⃣ Final Decisions (Locked In)

### Core

- **Host**: Node.js
- **Execution**: Interpreted via **Bytecode VM**
- **Entry point**: `monalisa { ... }` (mandatory)
- **Syntax feel**: Python-like English, `{}` blocks
- **Whitespace**: mostly ignored (except strings)
- **Target OS**: Windows (portable anyway)

### Language properties

- **Typing**: Dynamic (best option for now)
- **Memory**: Garbage collected (via JS host)
- **Modules**: Single file for v1 (best option)
- **Concurrency**: Not now (VM-ready later)
- **Intent**: Learning + production (good balance)

### Tooling

- **CLI**: `monalisa file.priyo`
- **Logger**: ✅ use your `nstypocolors` utilities for:
  - errors
  - warnings
  - info
  - output
  - build logs

---

## 2️⃣ Final Architecture (DO NOT CHANGE THIS)

This is clean, minimal, and expandable.

```bash
.priyo source
   ↓
Lexer (tokens)
   ↓
Parser (AST)
   ↓
Bytecode Compiler
   ↓
Virtual Machine
   ↓
Runtime (builtins, logger, I/O)
```

No JS transpiling
No regex hacks
No eval
No AST walking at runtime

This is a **real language pipeline**.

---

## 3️⃣ Execution Model (Very Important)

Let’s say user runs:

```bash
monalisa examples/main.priyo
```

### Internally:

```bash
CLI
 └─ read file
     └─ Lexer
         └─ Tokens
             └─ Parser
                 └─ AST
                     └─ Compiler
                         └─ Bytecode
                             └─ VM
                                 └─ Output (logger)
```

Errors can happen at **each stage**:

- Lexer → invalid character
- Parser → syntax error
- Compiler → invalid structure
- VM → runtime error

Each uses your **colored logger**.

---

## 4️⃣ Bytecode VM (Your Core Power)

### Why bytecode (good choice)

- Faster than AST-walk
- Simple to debug
- Easy to add features
- Matches your “learning + production” goal

### VM style

- **Stack-based VM** (best option)
- Instructions are small integers / objects

Example bytecode:

```
PUSH_CONST "Hello"
PRINT
```

---

## 5️⃣ Runtime Responsibilities

Your VM does **not** talk to Node APIs directly.

Instead:

```
VM → Runtime → Node.js
```

Runtime provides:

- `print`
- `input`
- math
- comparisons
- logger

This keeps VM clean.

---

## 6️⃣ Folder Structure (Final)

Use this. Don’t improvise.

```
priyoscript/
├─ src/
│  ├─ cli/
│  │  └─ index.js        # monalisa command
│  ├─ lexer/
│  │  └─ lexer.js
│  ├─ parser/
│  │  └─ parser.js
│  ├─ ast/
│  │  └─ nodes.js
│  ├─ compiler/
│  │  └─ bytecode.js
│  ├─ vm/
│  │  └─ vm.js
│  ├─ runtime/
│  │  ├─ builtins.js
│  │  └─ logger.js  ✅ (your colors)
│  └─ config/
│     └─ tokens.js
├─ examples/
│  └─ main.priyo
└─ package.json
```

---

## 7️⃣ Logger Integration (Confirmed)

Your logger will be used like this:

- Lexer error → `logError`
- Parser error → `logError`
- VM runtime error → `logError`
- CLI success → `logSuccess`
- Program output → `logBuild` / `output`

This gives your language **identity** in the terminal.

---

## 8️⃣ Language Rules (Initial)

These are **hard rules** for v1:

1. Every program must start with:

   ```priyo
   monalisa {
     ...
   }
   ```

2. No code outside `monalisa`

3. Statements end by newline (not `;`)

4. Blocks use `{}`

5. Everything is evaluated top-down

---

## 9️⃣ HOW YOU SHOULD START (IMPORTANT)

Do **NOT** start with VM or compiler.

### Correct order (no skipping):

### STEP 1️⃣ — Token design (next task)

- token types
- keywords
- operators
- literals

👉 This decides everything else.

### STEP 2️⃣ — Lexer

- convert code → tokens
- ignore whitespace
- handle strings & comments

### STEP 3️⃣ — Parser (very small)

- expressions
- assignments
- function calls
- if / else

### STEP 4️⃣ — TEMP interpreter (AST-walk)

- just to verify grammar

### STEP 5️⃣ — Bytecode compiler

- replace AST-walk

### STEP 6️⃣ — VM

- stack
- instructions
- runtime calls

---
