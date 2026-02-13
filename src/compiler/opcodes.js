const OpCode = {
  PUSH_STRING: 0,
  PUSH_NUMBER: 1,
  PUSH_BOOLEAN: 2,
  PUSH_NULL: 3,
  DEFINE_VARIABLE: 4,
  LOAD_VARIABLE: 5,
  SET_VARIABLE: 6,
  CALL_BUILTIN: 7,
  POP: 8,
  HALT: 9,
}

module.exports = { OpCode }
