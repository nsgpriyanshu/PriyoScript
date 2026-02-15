![PriyoScript](public/priyo-script.png)

An emotional, interpreted programming language built with Node.js.

## Introduction

PriyoScript is a simple, interpreted programming language created for fun and as a personal project inspired by a friend.

It combines elements of Python, JavaScript, C, and Java in its syntax and code structure.

## Motivation

PriyoScript was inspired during a Data Analysis and Algorithm lab session. While struggling with C code, my friend suggested creating a programming language with personalized keywords. I decided to bring that idea to life using my knowledge and coding experience.

## Technology Used

- Node.js
- JavaScript

## Features

- Custom, human-readable PriyoScript keywords (`monalisa`, `priyoKeep`, `lisaaTask`, etc.)
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
  - `prakritiAsLongAs` (while), `prakritiCount` (for)
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
  - multi-line `/* ... */`

## Language Reference

For the current implemented syntax, see [`SYNTAX.md`](SYNTAX.md).

## Developer

<div>
  <br>
  <a href="https://nsgpriyanshu.github.io">
    <img src="https://img.shields.io/badge/Developer-nsgpriyanshu-author.svg?color=f10a0a" alt="nsgpriyanshu" />
  </a>
</div>
