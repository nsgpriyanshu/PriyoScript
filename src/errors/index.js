const { ErrorCodes, ErrorStage, ErrorCategory } = require('./codes')
const {
  PriyoError,
  PriyoSyntaxError,
  PriyoCompileError,
  PriyoRuntimeError,
  PriyoEngineError,
} = require('./priyo-error')
const {
  isPriyoError,
  createSyntaxError,
  createCompileError,
  createRuntimeError,
  createEngineError,
  classifySyntaxCode,
  classifyRuntimeFailure,
} = require('./factories')
const { formatErrorForUser, formatErrorForDeveloper } = require('./formatter')
const { printPriyoError } = require('./printer')

module.exports = {
  ErrorCodes,
  ErrorStage,
  ErrorCategory,
  PriyoError,
  PriyoSyntaxError,
  PriyoCompileError,
  PriyoRuntimeError,
  PriyoEngineError,
  isPriyoError,
  createSyntaxError,
  createCompileError,
  createRuntimeError,
  createEngineError,
  classifySyntaxCode,
  classifyRuntimeFailure,
  formatErrorForUser,
  formatErrorForDeveloper,
  printPriyoError,
}
