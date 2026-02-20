const { ErrorCodes } = require('../errors/codes')

function normalizeErrorInput(input) {
  if (input && typeof input === 'object') {
    return {
      message: String(input.message || '').trim(),
      code: input.code || null,
      stage: input.stage || null,
      metadata: input.metadata || {},
    }
  }

  return {
    message: String(input || '').trim(),
    code: null,
    stage: null,
    metadata: {},
  }
}

function humanizeError(input) {
  const error = normalizeErrorInput(input)
  const primaryLine = error.message.split('\n')[0]

  const codeRules = {
    [ErrorCodes.SYNTAX.PARSE_FAILED]: {
      message: 'So Rude - There is a syntax issue in your code structure.',
      tip: 'Check brackets, commas, and keyword spelling near the shown location.',
    },
    [ErrorCodes.SYNTAX.ILLEGAL_TOKEN]: {
      message: 'Sorry - I could not understand part of this line.',
      tip: 'Check for typos in keywords/operators and make sure the statement is complete.',
    },
    [ErrorCodes.SYNTAX.RESERVED_WORD]: {
      message: 'So Disrespectfull - You used a reserved word that PriyoScript does not allow.',
      tip: 'Use PriyoScript keywords from `keywords.json`.',
    },
    [ErrorCodes.RUNTIME.UNDEFINED_VARIABLE]: {
      message: 'So Disrespectfull - A variable is being used before it is declared.',
      tip: 'Declare it first with `priyoKeep`, `priyoChange`, or `priyoPromise`.',
    },
    [ErrorCodes.RUNTIME.CONST_REASSIGN]: {
      message: 'So Rude - You are trying to change a constant value.',
      tip: 'Use `priyoChange` for mutable values, or avoid reassigning `priyoPromise`.',
    },
    [ErrorCodes.RUNTIME.DIVISION_BY_ZERO]: {
      message: 'Math error: dividing by zero is not allowed.',
      tip: 'Check the denominator value before division/modulo.',
    },
    [ErrorCodes.RUNTIME.UNKNOWN_CLASS]: {
      message: 'So Rude - A class name was used, but it is not declared.',
      tip: 'Define the class first using `lisaaFamily ClassName { ... }`.',
    },
    [ErrorCodes.RUNTIME.UNKNOWN_PACKAGE]: {
      message: 'So Rude - The requested package is not available.',
      tip: 'Use `priyoPackage.list()` to see available built-in packages.',
    },
    [ErrorCodes.RUNTIME.UNKNOWN_CALLABLE]: {
      message: 'So Disrespectfull - A function or method call could not be resolved.',
      tip: 'Check spelling and make sure the function/method exists before calling it.',
    },
    [ErrorCodes.RUNTIME.ARGUMENT_MISMATCH]: {
      message: 'Hmmmm - The given input/arguments do not match what this call expects.',
      tip: 'Check argument count and value types for this function or method.',
    },
    [ErrorCodes.RUNTIME.PROPERTY_ERROR]: {
      message: 'So Rude - This object/class property access is not valid.',
      tip: 'Verify the object exists and the property name is correct.',
    },
    [ErrorCodes.COMPILE.COMPILE_FAILED]: {
      message: 'Sorry - The program could not be compiled.',
      tip: 'Recheck syntax first. If syntax is fine, share this with the language maintainer.',
    },
    [ErrorCodes.ENGINE.INTERNAL]: {
      message: 'Internal runtime issue: this looks like a language engine problem.',
      tip: 'Please report this with the error code and details line.',
    },
  }

  if (error.code && codeRules[error.code]) {
    return {
      message: codeRules[error.code].message,
      tip: codeRules[error.code].tip,
      detail: primaryLine,
      code: error.code,
      stage: error.stage,
      metadata: error.metadata,
    }
  }

  const textRules = [
    {
      test: /Block comment was started with \/\* but never closed with \*\//i,
      message:
        'So Rude - Your multi-line comment is not closed. I found `/*` but did not find `*/`.',
      tip: 'Close the comment with `*/` before continuing your code.',
    },
    {
      test: /Program must start with "monalisa"/i,
      message: 'So Disrespectfull - This file must start with `monalisa { ... }`.',
      tip: 'Wrap all code inside one entry block: `monalisa { ... }`.',
    },
    {
      test: /can only be used inside loops|can only be used inside loops or switch/i,
      message: 'Hmm Hmm - This keyword is only valid inside a loop or switch block.',
      tip: 'Use `prakritiStop` inside `prakritiAsLongAs`, `prakritiCount`, or `prakritiChoose` blocks.',
    },
    {
      test: /can only be used inside functions/i,
      message:
        'So Disrespectfull - priyoGiveBack (Return) is only valid inside a lisaaTask (function).',
      tip: 'Use `priyoGiveBack` inside `lisaaTask ... { }`.',
    },
    {
      test: /Try block requires catch and\/or finally/i,
      message:
        'So Rude - `prakritiTry` must be followed by `prakritiCatch` and/or `prakritiAtEnd`.',
      tip: 'Use: `prakritiTry { ... } prakritiCatch (err) { ... }` or add `prakritiAtEnd { ... }`.',
    },
  ]

  for (const rule of textRules) {
    if (rule.test.test(error.message)) {
      return {
        message: rule.message,
        tip: rule.tip,
        detail: primaryLine,
        code: error.code,
        stage: error.stage,
        metadata: error.metadata,
      }
    }
  }

  return {
    message: 'Hmm - Could not run this PriyoScript file due to a language/runtime error.',
    tip: 'Read the detail line below and check that statement first.',
    detail: primaryLine,
    code: error.code,
    stage: error.stage,
    metadata: error.metadata,
  }
}

module.exports = { humanizeError }
