const { ErrorCodes, ErrorStage, ErrorCategory } = require('./codes')
const {
  PriyoError,
  PriyoSyntaxError,
  PriyoCompileError,
  PriyoRuntimeError,
  PriyoEngineError,
} = require('./priyo-error')

function isPriyoError(err) {
  return err instanceof PriyoError
}

function createSyntaxError(message, options = {}) {
  return new PriyoSyntaxError(message, {
    code: options.code || ErrorCodes.SYNTAX.PARSE_FAILED,
    stage: ErrorStage.SYNTAX,
    category: ErrorCategory.USER,
    metadata: options.metadata || {},
    cause: options.cause,
  })
}

function createCompileError(message, options = {}) {
  return new PriyoCompileError(message, {
    code: options.code || ErrorCodes.COMPILE.COMPILE_FAILED,
    stage: ErrorStage.COMPILE,
    category: options.category || ErrorCategory.ENGINE,
    metadata: options.metadata || {},
    cause: options.cause,
  })
}

function createRuntimeError(message, options = {}) {
  return new PriyoRuntimeError(message, {
    code: options.code || ErrorCodes.RUNTIME.RUNTIME_FAILED,
    stage: ErrorStage.RUNTIME,
    category: options.category || ErrorCategory.USER,
    metadata: options.metadata || {},
    cause: options.cause,
  })
}

function createEngineError(message, options = {}) {
  return new PriyoEngineError(message, {
    code: options.code || ErrorCodes.ENGINE.INTERNAL,
    stage: options.stage || ErrorStage.CORE,
    metadata: options.metadata || {},
    cause: options.cause,
  })
}

function classifySyntaxCode(message) {
  if (/Reserved word/i.test(message)) return ErrorCodes.SYNTAX.RESERVED_WORD
  if (/Could not understand this part|Expected .* but found|Unexpected token/i.test(message)) {
    return ErrorCodes.SYNTAX.ILLEGAL_TOKEN
  }
  return ErrorCodes.SYNTAX.PARSE_FAILED
}

function classifyRuntimeFailure(message) {
  if (/Undefined variable/i.test(message)) {
    return { code: ErrorCodes.RUNTIME.UNDEFINED_VARIABLE, category: ErrorCategory.USER }
  }
  if (/Cannot reassign constant/i.test(message)) {
    return { code: ErrorCodes.RUNTIME.CONST_REASSIGN, category: ErrorCategory.USER }
  }
  if (/Division by zero|Modulo by zero/i.test(message)) {
    return { code: ErrorCodes.RUNTIME.DIVISION_BY_ZERO, category: ErrorCategory.USER }
  }
  if (/Unknown class/i.test(message)) {
    return { code: ErrorCodes.RUNTIME.UNKNOWN_CLASS, category: ErrorCategory.USER }
  }
  if (/Unknown package/i.test(message)) {
    return { code: ErrorCodes.RUNTIME.UNKNOWN_PACKAGE, category: ErrorCategory.USER }
  }
  if (
    /Unknown module path import|Module file not found|Imported modules must start with lisaaBox|Cyclic module import detected/i.test(
      message,
    )
  ) {
    return { code: ErrorCodes.RUNTIME.UNKNOWN_MODULE, category: ErrorCategory.USER }
  }
  if (/Unknown callable|Unknown builtin function/i.test(message)) {
    return { code: ErrorCodes.RUNTIME.UNKNOWN_CALLABLE, category: ErrorCategory.USER }
  }
  if (
    /expects .* args but got|Invalid number input|Expected a callable callback function/i.test(
      message,
    )
  ) {
    return { code: ErrorCodes.RUNTIME.ARGUMENT_MISMATCH, category: ErrorCategory.USER }
  }
  if (
    /Property .* not found|Property access|Property assignment|Field .* is not declared|Static field .* is not declared|Parent field .* is not declared|Parent static field .* is not declared|Array index access|Array index assignment|Array index must be|Array index .* out of range|Array slicing requires|Array slice .* must be/i.test(
      message,
    )
  ) {
    return { code: ErrorCodes.RUNTIME.PROPERTY_ERROR, category: ErrorCategory.USER }
  }

  // These are generally runtime-engine faults, not end-user mistakes.
  if (
    /Unknown opcode|Cannot exit global scope|Scope underflow|Invalid scope unwind|Unknown expression type|Unknown statement type|Unsupported unary operator|Unsupported binary operator|Unsupported call target/i.test(
      message,
    )
  ) {
    return { code: ErrorCodes.ENGINE.INTERNAL, category: ErrorCategory.ENGINE }
  }

  return { code: ErrorCodes.RUNTIME.RUNTIME_FAILED, category: ErrorCategory.USER }
}

module.exports = {
  isPriyoError,
  createSyntaxError,
  createCompileError,
  createRuntimeError,
  createEngineError,
  classifySyntaxCode,
  classifyRuntimeFailure,
}
