const { ErrorCategory } = require('./codes')

class PriyoError extends Error {
  constructor(message, options = {}) {
    super(message)

    this.name = options.name || 'PriyoError'
    this.code = options.code || 'PERR-000'
    this.stage = options.stage || 'core'
    this.category = options.category || ErrorCategory.USER
    this.metadata = options.metadata || {}
    this.cause = options.cause
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      stage: this.stage,
      category: this.category,
      message: this.message,
      metadata: this.metadata,
    }
  }
}

class PriyoSyntaxError extends PriyoError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      name: 'PriyoSyntaxError',
    })
  }
}

class PriyoCompileError extends PriyoError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      name: 'PriyoCompileError',
    })
  }
}

class PriyoRuntimeError extends PriyoError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      name: 'PriyoRuntimeError',
    })
  }
}

class PriyoEngineError extends PriyoError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      name: 'PriyoEngineError',
      category: ErrorCategory.ENGINE,
    })
  }
}

module.exports = {
  PriyoError,
  PriyoSyntaxError,
  PriyoCompileError,
  PriyoRuntimeError,
  PriyoEngineError,
}
