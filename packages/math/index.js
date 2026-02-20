function ensureNumbers(values, methodName) {
  for (const value of values) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new Error(`math.${methodName} expects numeric arguments only`)
    }
  }
}

function ensureNonEmpty(values, methodName) {
  if (!values.length) {
    throw new Error(`math.${methodName} expects at least one argument`)
  }
}

function ensureArray(value, methodName) {
  if (!Array.isArray(value)) {
    throw new Error(`math.${methodName} expects an array as the first argument`)
  }
}

function ensureInteger(value, methodName, argName) {
  if (!Number.isInteger(value)) {
    throw new Error(`math.${methodName} expects integer ${argName}`)
  }
}

const mathPackage = {
  __priyoHostObject: true,

  add(a, b) {
    ensureNumbers([a, b], 'add')
    return a + b
  },

  sub(a, b) {
    ensureNumbers([a, b], 'sub')
    return a - b
  },

  mul(a, b) {
    ensureNumbers([a, b], 'mul')
    return a * b
  },

  div(a, b) {
    ensureNumbers([a, b], 'div')
    if (b === 0) {
      throw new Error('math.div cannot divide by zero')
    }
    return a / b
  },

  mod(a, b) {
    ensureNumbers([a, b], 'mod')
    if (b === 0) {
      throw new Error('math.mod cannot modulo by zero')
    }
    return a % b
  },

  sum(...values) {
    ensureNonEmpty(values, 'sum')
    ensureNumbers(values, 'sum')
    return values.reduce((total, value) => total + value, 0)
  },

  average(...values) {
    ensureNonEmpty(values, 'average')
    ensureNumbers(values, 'average')
    const total = values.reduce((sum, value) => sum + value, 0)
    return total / values.length
  },

  min(...values) {
    ensureNonEmpty(values, 'min')
    ensureNumbers(values, 'min')
    return Math.min(...values)
  },

  max(...values) {
    ensureNonEmpty(values, 'max')
    ensureNumbers(values, 'max')
    return Math.max(...values)
  },

  clamp(value, minValue, maxValue) {
    ensureNumbers([value, minValue, maxValue], 'clamp')
    return Math.min(Math.max(value, minValue), maxValue)
  },

  // -------------------------
  // Array utilities (phase-1)
  // -------------------------

  array(...values) {
    return [...values]
  },

  range(start, end, step = 1) {
    ensureNumbers([start, end, step], 'range')
    if (step === 0) {
      throw new Error('math.range step cannot be zero')
    }

    const result = []
    if (start <= end) {
      for (let i = start; i <= end; i += Math.abs(step)) {
        result.push(i)
      }
      return result
    }

    for (let i = start; i >= end; i -= Math.abs(step)) {
      result.push(i)
    }
    return result
  },

  push(arr, value) {
    ensureArray(arr, 'push')
    arr.push(value)
    return arr.length
  },

  pop(arr) {
    ensureArray(arr, 'pop')
    return arr.pop()
  },

  at(arr, index) {
    ensureArray(arr, 'at')
    ensureInteger(index, 'at', 'index')
    return arr[index]
  },

  set(arr, index, value) {
    ensureArray(arr, 'set')
    ensureInteger(index, 'set', 'index')
    arr[index] = value
    return value
  },

  length(arr) {
    ensureArray(arr, 'length')
    return arr.length
  },

  sumArray(arr) {
    ensureArray(arr, 'sumArray')
    ensureNumbers(arr, 'sumArray')
    return arr.reduce((total, value) => total + value, 0)
  },

  averageArray(arr) {
    ensureArray(arr, 'averageArray')
    ensureNonEmpty(arr, 'averageArray')
    ensureNumbers(arr, 'averageArray')
    return arr.reduce((total, value) => total + value, 0) / arr.length
  },

  minArray(arr) {
    ensureArray(arr, 'minArray')
    ensureNonEmpty(arr, 'minArray')
    ensureNumbers(arr, 'minArray')
    return Math.min(...arr)
  },

  maxArray(arr) {
    ensureArray(arr, 'maxArray')
    ensureNonEmpty(arr, 'maxArray')
    ensureNumbers(arr, 'maxArray')
    return Math.max(...arr)
  },
}

module.exports = mathPackage
