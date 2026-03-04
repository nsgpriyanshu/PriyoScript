![PriyoScript](public/priyo-script.png)

An emotional, interpreted programming language built with Node.js.

![Version](https://img.shields.io/github/package-json/v/nsgpriyanshu/PriyoScript?color=ff2056)
![downloads](https://img.shields.io/npm/dt/priyoscript?color=ff2056&label=downloads)

## Introduction

PriyoScript is a simple, interpreted programming language created for fun and as a personal project inspired by a friend.

It combines elements of Python, JavaScript, C, and Java in its syntax and code structure.

Our official website for documentation: [https://priyoscript.vercel.app](https://priyoscript.vercel.app)

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
6. Built-in package manager with `lisaaBring` shortcut and `math` package.
7. First-class arrays in language syntax (`[ ]` and index access), independent from packages.
8. Array ergonomics: slicing (`arr[1:3]`), `priyoArray` helpers, and foreach (`prakritiCount (x priyoInside arr)`).
9. Interactive REPL mode with shared runtime state and built-in REPL commands.
10. Array destructuring and higher-order helpers (`map/filter/reduce/find/some/every`).
11. User module system with `lisaaBring`, `lisaaBox`, and `lisaaShare`.
12. Module imports v2: alias and named imports with cycle guards.
13. Source-aware diagnostics with file/line context, caret span highlighting, typo suggestions, and cleaner stack previews.
14. OOP hardening: stricter constructor-chain validation and declared-member assignment checks.

> [!IMPORTANT]
> PriyoScript is currently in early development, and the syntax and features are subject to change as I continue to build and refine the language. It still lacks many features and has some quirks, but the core syntax and design principles are in place.

## Installation

```bash
npm install -g priyoscript
```

### Local development install

```bash
npm install
npm start
```

### Web docs app (Next.js + Fumadocs)

```bash
npm --prefix web install
npm --prefix web run dev
```

Then open `http://localhost:3000`.

Build docs app:

```bash
npm --prefix web run build
npm --prefix web run start
```

<!--
## Release Flows

### CLI/runtime release (root package)

```bash
npm run release
```

### Web docs release (separate versioning/changelog)

Dry run:

```bash
npm run release:web:dry
```

Actual release:

```bash
npm run release:web
```

Web release config and changelog:

- `web/.cliff-jumperrc.json`
- `web/CHANGELOG.md` -->

## Inspiration

PriyoScript is inspired by multiple mainstream languages but intentionally avoids some of their complexity.

### Feature Comparison

| Feature / Concept                      | Python       | C     | JavaScript   | Java      | PriyoScript                         |
| -------------------------------------- | ------------ | ----- | ------------ | --------- | ----------------------------------- |
| Readable high-level syntax             | Yes          | No    | Yes          | Partial   | Yes (custom keywords)               |
| Dynamic typing                         | Yes          | No    | Yes          | No        | Yes                                 |
| Static typing                          | No           | Yes   | No           | Yes       | No (planned later)                  |
| Manual memory management               | No           | Yes   | No           | No        | No                                  |
| Class-based OOP                        | Partial      | No    | Partial      | Yes       | Yes                                 |
| Prototype-based OOP                    | No           | No    | Yes          | No        | No                                  |
| Block scope                            | Yes          | Yes   | Yes          | Yes       | Yes (`priyoChange`, `priyoPromise`) |
| Function scope var-style               | No           | Yes   | Yes          | No        | Yes (`priyoKeep`)                   |
| Closures                               | Yes          | No    | Yes          | Yes       | Yes                                 |
| Switch-case                            | No (`match`) | Yes   | Yes          | Yes       | Yes                                 |
| Exceptions (`try/catch/finally/throw`) | Yes          | Basic | Yes          | Yes       | Yes                                 |
| Bytecode VM runtime                    | Yes          | No    | Yes (engine) | Yes (JVM) | Yes (custom VM)                     |
| Built-in package manager               | Yes          | No    | Yes          | Yes       | Yes (phase-1 built-ins)             |
| Large standard library                 | Yes          | Low   | Yes          | Yes       | No (minimal now)                    |
| Concurrency model                      | Yes          | Yes   | Yes          | Yes       | Not yet                             |

### Design Philosophy

| Language   | What PriyoScript Took                          | What PriyoScript Avoided                    |
| ---------- | ---------------------------------------------- | ------------------------------------------- |
| Python     | Readability, dynamic typing, simple I/O        | Indentation-based blocks                    |
| C          | Clear operator behavior, predictable execution | Pointers, manual memory, undefined behavior |
| JavaScript | Flexible functions, dynamic runtime            | Type coercion quirks, prototype model       |
| Java       | Strong class-based OOP, structured design      | Heavy verbosity, strict type declarations   |

## Language Reference

For the current implemented syntax, see [`SYNTAX.md`](SYNTAX.md).
For error code reference and docs links used in CLI/REPL diagnostics, see [`ERRORS.md`](ERRORS.md).
Install/update/uninstall commands are documented in the Installation section above.
For docs-site setup/versioning, see [`web/README.md`](web/README.md).

## Developer

This project is developed by:

<div>
  <a href="https://nsgpriyanshu.github.io">
    <img src="https://img.shields.io/badge/Developer-nsgpriyanshu-author.svg?color=f10a0a" alt="nsgpriyanshu" />
  </a>
</div>
