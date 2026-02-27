# PriyoScript Error Code Reference

## psyn-001

Generic syntax parsing failure. Check block boundaries, brackets, and statement shape.

## psyn-002

Unexpected token/keyword. Check spelling and syntax around the shown location.

## psyn-003

Reserved or blocked word used in source. Replace with PriyoScript vocabulary.

## pcmp-001

Compilation failed after parse stage. Usually indicates unsupported compiler path or invalid AST constraints.

## prun-000

Generic runtime failure. Check details for source context and stack preview.

## prun-101

Variable used before declaration or used outside of scope.

## prun-102

Attempted to reassign `priyoPromise` (const).

## prun-103

Division or modulo by zero is not allowed.

## prun-104

Class name referenced but not declared.

## prun-105

Function/method reference was not found.

## prun-106

Invalid property read/write or missing property on object/class.

## prun-107

Invalid number/type of arguments for function/method call.

## prun-108

Input did not match required format (for example number input).

## prun-109

Package name was not found in built-in package registry.

## prun-110

Module path import failed. Check `lisaaBring` path and ensure module starts with `lisaaBox`.

## peng-001

Engine/internal fault. Usually a runtime/compiler bug, not user code.
