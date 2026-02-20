![PriyoScript](public/priyo-script.png)

An emotional, interpreted programming language built with Node.js.

![Version](https://img.shields.io/github/package-json/v/nsgpriyanshu/PriyoScript?color=ff2056)

## Introduction

PriyoScript is a simple, interpreted programming language created for fun and as a personal project inspired by a friend.

It combines elements of Python, JavaScript, C, and Java in its syntax and code structure.

## Motivation

PriyoScript was inspired during a Data Analysis and Algorithm lab session. While struggling with C code, my friend suggested creating a programming language with personalized keywords. I decided to bring that idea to life using my knowledge and coding experience. I want to make it an innovative, stand out language.

## Technology Used

- Node.js
- JavaScript

## Features

1. Easily readable syntax with a focus on simplicity and expressiveness.
2. Support for variables, functions, control flow, and OOP concepts.
3. Built-in I/O functions for user interaction.
4. Colorful console output for better user experience.
5. Comprehensive error handling with descriptive messages.
6. Easily extendable architecture for adding new features and built-in functions.

<!-- - Custom, human-readable PriyoScript keywords (`monalisa`, `priyoKeep`, `lisaaTask`, etc.)
- Entry-driven program structure with `monalisa { ... }`
- Variables and scope:
  - `priyoKeep` (function scope)
  - `priyoChange` (block scope)
  - `priyoPromise` (block scope, immutable binding)
- Expressions:
  - arithmetic, comparison, logical, grouping
  - function/method calls and property access
- Control flow:
  - `prakritiIf`, `prakritiElseIf`, `prakritiElse`
  - `prakritiChoose`, `prakritiCase`, `prakritiOtherwise`
  - `prakritiAsLongAs` (while), `prakritiCount` (for)
  - `prakritiTry`, `prakritiCatch`, `prakritiAtEnd`, `prakritiThrow`
  - `prakritiStop` (break), `prakritiGoOn` (continue)
- Functions:
  - declarations, return values, closures, recursion
- OOP:
  - classes, inheritance, static members, class fields, `priyoSelf`, `priyoParent`
  - parent constructor shorthand: `priyoParent(...)`
- I/O builtins:
  - `priyoTell(...)`
  - typed input with `priyoListenSentence(...)` and `priyoListenNumber(...)`
- Color output helpers:
  - `priyoTell.Build(...)`, `priyoTell.Success(...)`, `priyoTell.Info(...)`, `priyoTell.Warn(...)`, `priyoTell.Error(...)`
- Comments:
  - single-line `// ...`
  - multi-line `/* ... */` -->

> [!IMPORTANT]
> PriyoScript is currently in early development, and the syntax and features are subject to change as I continue to build and refine the language. Its still lacks many features and has some quirks, but I plan to expand and improve it over time. However, the core syntax and design principles are already in place, and I am excited to share it with others as it evolves.

## Inspiration

PriyoScript is inspired by multiple mainstream languages but intentionally avoids some of their complexities and pitfalls.

### Feature Comparison

I took small small pieces from each language, but I also intentionally avoided some features to keep the language simple and clean. Here's a comparison of key features and design decisions:

| Feature / Concept              | Python     | C        | JavaScript           | Java     | PriyoScript Decision            |
| ------------------------------ | ---------- | -------- | -------------------- | -------- | ------------------------------- |
| Simple Readable Syntax         | ✅         | ❌       | ✅                   | ❌       | ✅ Adopted (Clean & Structured) |
| Dynamic Typing                 | ✅         | ❌       | ✅                   | ❌       | ✅ Adopted                      |
| Static Typing                  | ❌         | ✅       | ❌                   | ✅       | ❌ Avoided (for simplicity)     |
| Manual Memory Management       | ❌         | ✅       | ❌                   | ❌       | ❌ Avoided                      |
| Strict OOP Structure           | ⚠️ Partial | ❌       | ⚠️ Prototype-based   | ✅       | ✅ Adopted (Class-based only)   |
| Prototype-Based OOP            | ❌         | ❌       | ✅                   | ❌       | ❌ Intentionally Avoided        |
| Deterministic Execution        | ✅         | ✅       | ❌ (coercion quirks) | ✅       | ✅ Adopted                      |
| Implicit Type Coercion         | ❌         | ❌       | ✅                   | ❌       | ❌ Intentionally Avoided        |
| Block Scope                    | ✅         | ✅       | ✅ (let/const)       | ✅       | ✅ Adopted                      |
| Function Closures              | ✅         | ❌       | ✅                   | ✅       | ✅ Adopted                      |
| Structured Error Handling      | ✅         | ⚠️ Basic | ✅                   | ✅       | ✅ Implemented                  |
| Built-in Rich Standard Library | ✅         | ❌       | ✅                   | ✅       | ⚠️ Minimal (planned expansion)  |
| Low-level Pointer Access       | ❌         | ✅       | ❌                   | ❌       | ❌ Intentionally Avoided        |
| Bytecode VM Architecture       | ✅         | ❌       | ✅ (V8 engine)       | ✅ (JVM) | ✅ Adopted                      |
| Concurrency Model              | ✅         | ✅       | ✅                   | ✅       | ❌ Not yet implemented          |
| Strict Compile-time Checks     | ❌         | ✅       | ❌                   | ✅       | ❌ Currently Dynamic Only       |
| Verbose Syntax                 | ❌         | ⚠️       | ❌                   | ✅       | ⚠️ Moderately Structured        |

### Design Philosophy

| Language       | What PriyoScript Took                          | What PriyoScript Avoided                    |
| -------------- | ---------------------------------------------- | ------------------------------------------- |
| **Python**     | Readability, dynamic typing, simple I/O        | Indentation-based blocks                    |
| **C**          | Clear operator behavior, predictable execution | Pointers, manual memory, undefined behavior |
| **JavaScript** | Flexible functions, dynamic runtime            | Type coercion quirks, prototype model       |
| **Java**       | Strong class-based OOP, structured design      | Heavy verbosity, strict type declarations   |

## Language Reference

For the current implemented syntax, see [`SYNTAX.md`](SYNTAX.md).

## Developer

<div>
  <br>
  <a href="https://nsgpriyanshu.github.io">
    <img src="https://img.shields.io/badge/Developer-nsgpriyanshu-author.svg?color=f10a0a" alt="nsgpriyanshu" />
  </a>
</div>
