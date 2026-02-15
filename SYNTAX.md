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

## 9. Loop Control

```priyo
prakritiStop    // break
prakritiGoOn    // continue
```

These are valid only inside loops.

## 10. Functions

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

## 11. Scope Rules

- `priyoChange` / `priyoPromise` are block-scoped.
- `priyoKeep` is function-scoped.
- Functions use lexical scope (closures are supported).

## 12. Classes

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
- Parent method call is supported with `priyoParent.method(...)`.
- Parent property access is supported with `priyoParent.property`.

Inheritance example:

```priyo
lisaaFamily InstagramCreator lisaaInherit YouTubeChannel {
  lisaaTask init(name) {
    priyoParent.init(name)
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

## 13. Current Limitations

- No module/import execution yet.
- `switch/case`, `try/catch`, and many reserved keywords are mapped but not fully implemented in parser/compiler/VM.
