const ErrorStage = {
  SYNTAX: 'syntax',
  COMPILE: 'compile',
  RUNTIME: 'runtime',
  CORE: 'core',
}

const ErrorCategory = {
  USER: 'user',
  ENGINE: 'engine',
}

const ErrorCodes = {
  SYNTAX: {
    PARSE_FAILED: 'PSYN-001',
    ILLEGAL_TOKEN: 'PSYN-002',
    RESERVED_WORD: 'PSYN-003',
    AWAIT_OUTSIDE_ASYNC: 'PSYN-004',
  },
  COMPILE: {
    COMPILE_FAILED: 'PCMP-001',
  },
  RUNTIME: {
    RUNTIME_FAILED: 'PRUN-000',
    UNDEFINED_VARIABLE: 'PRUN-101',
    CONST_REASSIGN: 'PRUN-102',
    DIVISION_BY_ZERO: 'PRUN-103',
    UNKNOWN_CLASS: 'PRUN-104',
    UNKNOWN_CALLABLE: 'PRUN-105',
    PROPERTY_ERROR: 'PRUN-106',
    ARGUMENT_MISMATCH: 'PRUN-107',
    INVALID_INPUT: 'PRUN-108',
    UNKNOWN_PACKAGE: 'PRUN-109',
    UNKNOWN_MODULE: 'PRUN-110',
  },
  ENGINE: {
    INTERNAL: 'PENG-001',
  },
}

module.exports = {
  ErrorStage,
  ErrorCategory,
  ErrorCodes,
}
