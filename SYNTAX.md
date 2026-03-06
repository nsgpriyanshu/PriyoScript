# PriyoScript Syntax

This document describes the syntax that is currently implemented in this repository.

## 1. Program Entry

Every program must start with the `monalisa` entry block:

```priyo
monalisa {
  priyoTell("Hello")
}
```

## 2. Comments

Single-line comments are supported:

```priyo
// this is a comment
```

Multi-line comments are also supported:

```priyo
/*
  this is a
  multi-line comment
*/
```

## 3. Variables

```priyo
priyoKeep x = 10       // var (function-scoped)
priyoChange y = 20     // let (block-scoped)
priyoPromise z = 30    // const (block-scoped, required initializer)
```

Reassignment:

```priyo
y = y + 1
```

`priyoPromise` cannot be reassigned.

## 4. Literals

- Number: `10`, `3`
- String: `"hello"`
- Boolean: `priyoTrue`, `priyoFalse`
- Null: `priyoEmpty`

## 5. Expressions

### Arithmetic

```priyo
priyoTell(2 + 3 * 4)      // 14
priyoTell((2 + 3) * 4)    // 20
```

Supported operators:

- `+`
- `-`
- `*`
- `/`
- `%`

### Comparison

Supported operators:

- `==`
- `!=`
- `<`
- `<=`
- `>`
- `>=`

### Logical

Supported operators:

- `&&`
- `||`
- `!`

### Arrays

Array literals:

```priyo
priyoKeep scores = [10, 20, 30]
```

Index read:

```priyo
priyoTell(scores[0])
```

Index write:

```priyo
scores[1] = 99
```

Slicing:

```priyo
priyoTell(scores[1:3])   // start inclusive, end exclusive
priyoTell(scores[:2])    // from start
priyoTell(scores[2:])    // till end
```

Notes:

- Index must be an integer number.
- Out-of-range index access throws a runtime error.
- Slice bounds must be integer numbers.

Array destructuring (declaration):

```priyo
priyoChange [first, second] = [10, 20]
priyoTell(first + second)
```

Nested/default destructuring:

```priyo
priyoChange [a = 10, [b], c] = [1, [2], 3]
priyoChange {add, missing = 99} = priyoPackage.use("math")
```

## 6. Built-in I/O

### Output

```priyo
priyoTell("Hello")
```

### Input

```priyo
priyoKeep sentence = priyoListenSentence("Enter text: ")
priyoKeep number = priyoListenNumber("Enter number: ")
```

Also available (backward compatibility):

```priyo
priyoKeep raw = priyoListen("Enter input: ")
```

## 7. Conditionals

```priyo
prakritiIf (score >= 90) {
  priyoTell("A")
} prakritiElseIf (score >= 75) {
  priyoTell("B")
} prakritiElse {
  priyoTell("C")
}
```

### Switch

```priyo
prakritiChoose (platform) {
  prakritiCase ("instagram") {
    priyoTell("Reel mode")
    prakritiStop
  }

  prakritiCase ("youtube") {
    priyoTell("Long video mode")
    prakritiStop
  }

  prakritiOtherwise {
    priyoTell("Unknown platform")
  }
}
```

## 8. Loops

### While loop

```priyo
priyoChange i = 0
prakritiAsLongAs (i < 3) {
  priyoTell(i)
  i = i + 1
}
```

### For loop

```priyo
prakritiCount (priyoChange i = 0; i < 3; i = i + 1) {
  priyoTell(i)
}
```

### Foreach over arrays

```priyo
prakritiCount (item priyoInside scores) {
  priyoTell(item)
}
```

## 9. Loop Control

```priyo
prakritiStop    // break
prakritiGoOn    // continue
```

- `prakritiStop` is valid inside loops and `prakritiChoose`.
- `prakritiGoOn` is valid only inside loops.

## 10. Error Handling

```priyo
prakritiTry {
  priyoTell(10 / 0)
} prakritiCatch (err) {
  priyoTell("Caught: " + err)
} prakritiAtEnd {
  priyoTell("Cleanup")
}
```

Catch parameter is optional:

```priyo
prakritiTry {
  priyoTell(10 / 0)
} prakritiCatch {
  priyoTell("Handled error")
}
```

Throwing custom values:

```priyo
prakritiThrow "Something went wrong"
```

Runtime errors caught with `prakritiCatch (err)` expose metadata fields:

- `err.message`
- `err.code`
- `err.stage`
- `err.category`
- `err.metadata`
- `err.stack`

## 11. Packages (Built-in Manager)

Phase-1 package system is available through `priyoPackage`:

```priyo
priyoTell(priyoPackage.list())
priyoKeep math = priyoPackage.use("math")
priyoTell(math.add(2, 3))
```

Import shortcut syntax is also available:

```priyo
lisaaBring math
priyoTell(math.add(2, 3))
```

Current built-in package:

- `math`:
  - `add(a, b)`, `sub(a, b)`, `mul(a, b)`, `div(a, b)`, `mod(a, b)`
  - `sum(...)`, `average(...)`, `min(...)`, `max(...)`, `clamp(value, min, max)`
  - utility:
    - `abs(value)`, `pow(base, exponent)`, `sqrt(value)`, `cube(value)`
  - trigonometry:
    - `sin(radians)`, `cos(radians)`, `tan(radians)`
    - `asin(value)`, `acos(value)`, `atan(value)`
    - `degToRad(degrees)`, `radToDeg(radians)`
  - geometry:
    - `areaCircle(radius)`, `areaRectangle(length, width)`
    - `areaTriangle(base, height)`, `areaSquare(side)`
    - `circumference(radius)`

`priyoPackage` helpers:

- `priyoPackage.list()`
- `priyoPackage.has(name)`
- `priyoPackage.use(name)`

Array helper object:

- `priyoArray.length(arr)`
- `priyoArray.push(arr, value)`
- `priyoArray.pop(arr)`
- `priyoArray.at(arr, index)`
- `priyoArray.slice(arr, start?, end?)`
- `priyoArray.first(arr)`
- `priyoArray.last(arr)`
- `priyoArray.reverse(arr)`
- `priyoArray.includes(arr, value)`
- `priyoArray.indexOf(arr, value)`
- `priyoArray.join(arr, separator?)`
- `priyoArray.map(arr, callback)`
- `priyoArray.filter(arr, callback)`
- `priyoArray.reduce(arr, callback, initialValue?)`
- `priyoArray.forEach(arr, callback)`
- `priyoArray.find(arr, callback)`
- `priyoArray.some(arr, callback)`
- `priyoArray.every(arr, callback)`

Callback can be a normal PriyoScript function:

```priyo
lisaaTask double(x) {
  priyoGiveBack x * 2
}

priyoKeep result = priyoArray.map([1, 2, 3], double)
```

## 12. Modules (`lisaaBring`, `lisaaBox`, `lisaaShare`)

User module file:

```priyo
lisaaBox {
  lisaaTask square(x) {
    priyoGiveBack x * x
  }

  lisaaShare square
}
```

Import module in app:

```priyo
monalisa {
  lisaaBring "./math-utils.priyo"
  priyoTell(math_utils.square(5))
}
```

Import alias:

```priyo
lisaaBring "./math-utils.priyo": utils
```

Named imports (with optional alias):

```priyo
lisaaBring "./math-utils.priyo": [square, cube: cubeFn]
```

Notes:

- Module files must start with `lisaaBox { ... }`.
- `lisaaShare name` exports a top-level binding.
- For path imports, variable name is derived from file name (sanitized).

## 13. Functions

Function declaration:

```priyo
lisaaTask add(a, b) {
  priyoGiveBack a + b
}
```

Function call:

```priyo
priyoTell(add(2, 3))
```

Return:

```priyo
priyoGiveBack value
```

`priyoGiveBack` is valid only inside functions.

## 14. Async and Await (Stage-1)

Async function declaration:

```priyo
prakritiWait lisaaTask addAsync(a, b) {
  priyoGiveBack prakritiPause (a + b)
}
```

Top-level await:

```priyo
monalisa {
  prakritiWait lisaaTask total(a, b) {
    priyoGiveBack a + b
  }
  priyoTell(prakritiPause total(20, 22))
}
```

Rule:

- `prakritiPause` is valid inside `prakritiWait lisaaTask ...` functions.
- `prakritiPause` is rejected inside non-async functions.
- Top-level `prakritiPause` is allowed in `monalisa`/`lisaaBox` blocks.

## 15. Scope Rules

- `priyoChange` / `priyoPromise` are block-scoped.
- `priyoKeep` is function-scoped.
- Functions use lexical scope (closures are supported).

## 16. Classes

Class declaration:

```priyo
lisaaFamily StudentProfile {
  lisaaTask init(studentName, semester) {
    priyoSelf.studentName = studentName
    priyoSelf.semester = semester
  }

  lisaaTask greet() {
    priyoTell("Hi " + priyoSelf.studentName)
  }
}
```

Create instance:

```priyo
priyoKeep student = priyoCreate StudentProfile("Priyanshu", 5)
```

Call method:

```priyo
p.greet()
```

Read/write fields:

```priyo
priyoTell(student.studentName)
student.semester = student.semester + 1
```

Notes:

- `init(...)` is the constructor method name (optional).
- `priyoSelf` is available inside class methods.
- Methods are declared with `lisaaTask` inside `lisaaFamily`.
- Inheritance is supported with `lisaaInherit`.
- Interfaces are supported:
  - `lisaaAgreement Name { lisaaTask method(args) }`
  - `lisaaFamily Child lisaaFollow Name { ... }`
- Parent constructor shorthand is supported with `priyoParent(...)` inside child `init(...)`.
- In child classes, `priyoParent(...)` must be the first statement of `init(...)`.
- In child classes, `priyoParent(...)` can appear only once in `init(...)`.
- Parent method call is supported with `priyoParent.method(...)`.
- Parent property access is supported with `priyoParent.property`.
- Parent property write is supported with `priyoParent.property = value`.
- Stricter declared-member checks:
  - If the class declares instance fields, assigning undeclared instance fields throws an error.
  - If the class declares static fields, assigning undeclared static fields throws an error.
  - If the class declares no fields, dynamic field assignment remains allowed.

Inheritance example:

```priyo
lisaaFamily InstagramCreator lisaaInherit YouTubeChannel {
  lisaaTask init(name) {
    priyoParent(name)
  }
}
```

Static methods and fields:

```priyo
lisaaFamily CollegePortal {
  lisaaStable lisaaTask add(a, b) {
    priyoGiveBack a + b
  }
}

CollegePortal.tag = "CGPA"
priyoTell(CollegePortal.add(4, 6))
priyoTell(CollegePortal.tag)
```

Class field declarations:

```priyo
lisaaFamily CollegeStudent {
  priyoKeep campus = "NSEC"                 // instance field
  lisaaStable priyoKeep portal = "Main"     // static field
}
```

Access modifiers on class members:

- `lisaaOpen` (public, default)
- `lisaaPersonal` (private, class-only access)
- `lisaaGuarded` (protected, class + subclasses)

Interface example:

```priyo
lisaaAgreement Greeter {
  lisaaTask greet(name)
}

lisaaFamily Student lisaaFollow Greeter {
  lisaaOpen lisaaTask greet(name) {
    priyoGiveBack "Hi " + name
  }
}
```

## 17. Current Limitations

- Many reserved keywords are mapped but not fully implemented in parser/compiler/VM.
- Async support is staged:
  - implemented: `prakritiWait` and `prakritiPause`
  - planned: `yield` and future concurrency primitives
