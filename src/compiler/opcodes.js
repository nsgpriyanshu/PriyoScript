const OpCode = {
  PUSH_STRING: 0,
  PUSH_NUMBER: 1,
  PUSH_BOOLEAN: 2,
  PUSH_NULL: 3,
  DEFINE_VARIABLE: 4,
  LOAD_VARIABLE: 5,
  SET_VARIABLE: 6,
  ADD: 7,
  SUB: 8,
  MUL: 9,
  DIV: 10,
  MOD: 11,
  CALL_BUILTIN: 12,
  POP: 13,
  HALT: 14,
}

module.exports = { OpCode }
