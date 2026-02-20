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
6. Built-in package manager with `lisaaBring` shortcut and `math` package.

> [!IMPORTANT]
> PriyoScript is currently in early development, and the syntax and features are subject to change as I continue to build and refine the language. It still lacks many features and has some quirks, but the core syntax and design principles are in place.

## Installation

### Global CLI install (recommended)

After publishing to npm:

```bash
npm install -g priyoscript
```

Run:

```bash
monalisa -v
monalisa -h
monalisa your-file.priyo
```

### Install directly from GitHub

```bash
npm install -g github:nsgpriyanshu/PriyoScript
```

### Local development install

```bash
npm install
npm start
```

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

## Developer

<div>
  <br>
  <a href="https://nsgpriyanshu.github.io">
    <img src="https://img.shields.io/badge/Developer-nsgpriyanshu-author.svg?color=f10a0a" alt="nsgpriyanshu" />
  </a>
</div>
