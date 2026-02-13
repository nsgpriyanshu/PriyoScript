const OpCode = {
  PUSH_STRING: 0,
  PUSH_NUMBER: 1,
  PUSH_BOOLEAN: 2,
  PUSH_NULL: 3,
  DEFINE_VARIABLE: 4,
  LOAD_VARIABLE: 5,
  CALL_BUILTIN: 6,
  POP: 7,
  HALT: 8,
}

module.exports = { OpCode }
