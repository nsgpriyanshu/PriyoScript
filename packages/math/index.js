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

function ensureNonNegative(value, methodName, argName) {
  if (value < 0) {
    throw new Error(`math.${methodName} expects non-negative ${argName}`)
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

  // General utilities
  abs(value) {
    ensureNumbers([value], 'abs')
    return Math.abs(value)
  },

  pow(base, exponent) {
    ensureNumbers([base, exponent], 'pow')
    return Math.pow(base, exponent)
  },

  sqrt(value) {
    ensureNumbers([value], 'sqrt')
    ensureNonNegative(value, 'sqrt', 'value')
    return Math.sqrt(value)
  },

  cube(value) {
    ensureNumbers([value], 'cube')
    return value * value * value
  },

  // Trigonometry (radian-based)
  sin(radians) {
    ensureNumbers([radians], 'sin')
    return Math.sin(radians)
  },

  cos(radians) {
    ensureNumbers([radians], 'cos')
    return Math.cos(radians)
  },

  tan(radians) {
    ensureNumbers([radians], 'tan')
    return Math.tan(radians)
  },

  asin(value) {
    ensureNumbers([value], 'asin')
    return Math.asin(value)
  },

  acos(value) {
    ensureNumbers([value], 'acos')
    return Math.acos(value)
  },

  atan(value) {
    ensureNumbers([value], 'atan')
    return Math.atan(value)
  },

  degToRad(degrees) {
    ensureNumbers([degrees], 'degToRad')
    return (degrees * Math.PI) / 180
  },

  radToDeg(radians) {
    ensureNumbers([radians], 'radToDeg')
    return (radians * 180) / Math.PI
  },

  // Geometry helpers
  areaCircle(radius) {
    ensureNumbers([radius], 'areaCircle')
    ensureNonNegative(radius, 'areaCircle', 'radius')
    return Math.PI * radius * radius
  },

  areaRectangle(length, width) {
    ensureNumbers([length, width], 'areaRectangle')
    ensureNonNegative(length, 'areaRectangle', 'length')
    ensureNonNegative(width, 'areaRectangle', 'width')
    return length * width
  },

  areaTriangle(base, height) {
    ensureNumbers([base, height], 'areaTriangle')
    ensureNonNegative(base, 'areaTriangle', 'base')
    ensureNonNegative(height, 'areaTriangle', 'height')
    return 0.5 * base * height
  },

  areaSquare(side) {
    ensureNumbers([side], 'areaSquare')
    ensureNonNegative(side, 'areaSquare', 'side')
    return side * side
  },

  circumference(radius) {
    ensureNumbers([radius], 'circumference')
    ensureNonNegative(radius, 'circumference', 'radius')
    return 2 * Math.PI * radius
  },
}

module.exports = mathPackage
