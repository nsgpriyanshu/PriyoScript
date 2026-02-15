function humanizeError(rawMessage) {
  const message = String(rawMessage || '').trim()
  const primaryLine = message.split('\n')[0]

  const rules = [
    {
      test: /Block comment was started with \/\* but never closed with \*\//i,
      userMessage:
        'So Rude - Your multi-line comment is not closed. I found `/*` but did not find `*/`.',
      tip: 'Close the comment with `*/` before continuing your code.',
    },
    {
      test: /Program must start with "monalisa"/i,
      userMessage: 'So Disrespectfull - This file must start with `monalisa { ... }`.',
      tip: 'Wrap all code inside one entry block: `monalisa { ... }`.',
    },
    {
      test: /can only be used inside loops/i,
      userMessage: 'Hmm Hmm - This keyword is only valid inside a loop block.',
      tip: 'Use `prakritiStop` / `prakritiGoOn` only inside `prakritiAsLongAs` or `prakritiCount`.',
    },
    {
      test: /can only be used inside functions/i,
      userMessage: 'So Disrespectfull - priyoGiveBack (Return) is only valid inside a lisaaTask (function).',
      tip: 'Use `priyoGiveBack` inside `lisaaTask ... { }`.',
    },
    {
      test: /Undefined variable/i,
      userMessage: 'So Disrespectfull - A variable is being used before it is declared.',
      tip: 'Declare it first with `priyoKeep`, `priyoChange`, or `priyoPromise`.',
    },
    {
      test: /Cannot reassign constant/i,
      userMessage: 'So Rude - You are trying to change a constant value.',
      tip: 'Use `priyoChange` for mutable values, or avoid reassigning `priyoPromise`.',
    },
    {
      test: /Invalid number input/i,
      userMessage: 'Hmmmm - The input is not a valid number.',
      tip: 'Use digits only, for example: `42` or `3.14`.',
    },
    {
      test: /Division by zero|Modulo by zero/i,
      userMessage: 'Math error: dividing by zero is not allowed.',
      tip: 'Check the denominator value before division/modulo.',
    },
    {
      test: /Unknown class/i,
      userMessage: 'So Rude - A class name was used, but it is not declared.',
      tip: 'Define the class first using `lisaaFamily ClassName { ... }`.',
    },
    {
      test: /Unknown callable|Unknown builtin function/i,
      userMessage: 'So Disrespectfull - A function or method call could not be resolved.',
      tip: 'Check spelling and make sure the function/method exists before calling it.',
    },
    {
      test: /Expected .* but found/i,
      userMessage: 'So Rude - There is a syntax mismatch in this line.',
      tip: 'Check missing brackets, commas, or parentheses near the shown location.',
    },
    {
      test: /Unexpected token/i,
      userMessage: 'Sorry - I could not understand part of this line.',
      tip: 'Check for typos in keywords/operators and make sure the statement is complete.',
    },
  ]

  for (const rule of rules) {
    if (rule.test.test(message)) {
      return {
        message: rule.userMessage,
        tip: rule.tip,
        detail: primaryLine,
      }
    }
  }

  return {
    message: 'Hmm - Could not run this PriyoScript file due to a language/runtime error.',
    tip: 'Read the detail line below and check that statement first.',
    detail: primaryLine,
  }
}

module.exports = { humanizeError }
