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

function ensureInteger(value, methodName, argName) {
  if (!Number.isInteger(value)) {
    throw new Error(`math.${methodName} expects ${argName} to be an integer`)
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

  round(value) {
    ensureNumbers([value], 'round')
    return Math.round(value)
  },

  floor(value) {
    ensureNumbers([value], 'floor')
    return Math.floor(value)
  },

  ceil(value) {
    ensureNumbers([value], 'ceil')
    return Math.ceil(value)
  },

  random(min = 0, max = 1) {
    ensureNumbers([min, max], 'random')
    if (max < min) {
      throw new Error('math.random expects max to be >= min')
    }
    return Math.random() * (max - min) + min
  },

  lerp(start, end, t) {
    ensureNumbers([start, end, t], 'lerp')
    return start + (end - start) * t
  },

  distance2d(x1, y1, x2, y2) {
    ensureNumbers([x1, y1, x2, y2], 'distance2d')
    return Math.hypot(x2 - x1, y2 - y1)
  },

  distance3d(x1, y1, z1, x2, y2, z2) {
    ensureNumbers([x1, y1, z1, x2, y2, z2], 'distance3d')
    return Math.hypot(x2 - x1, y2 - y1, z2 - z1)
  },

  percent(value, total) {
    ensureNumbers([value, total], 'percent')
    if (total === 0) {
      throw new Error('math.percent expects total to be non-zero')
    }
    return (value / total) * 100
  },

  gcd(a, b) {
    ensureNumbers([a, b], 'gcd')
    ensureInteger(a, 'gcd', 'a')
    ensureInteger(b, 'gcd', 'b')
    let x = Math.abs(a)
    let y = Math.abs(b)
    while (y !== 0) {
      const temp = y
      y = x % y
      x = temp
    }
    return x
  },

  lcm(a, b) {
    ensureNumbers([a, b], 'lcm')
    ensureInteger(a, 'lcm', 'a')
    ensureInteger(b, 'lcm', 'b')
    if (a === 0 || b === 0) return 0
    return Math.abs(a * b) / mathPackage.gcd(a, b)
  },

  factorial(value) {
    ensureNumbers([value], 'factorial')
    ensureInteger(value, 'factorial', 'value')
    ensureNonNegative(value, 'factorial', 'value')
    let result = 1
    for (let i = 2; i <= value; i++) {
      result *= i
    }
    return result
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
