const readline = require('readline/promises')
const { stdin, stdout } = require('process')
const { logSuccess, logInfo, logWarn, logError, logBuild } = require('nstypocolors')
const { createPackageManager } = require('../packages/registry')

function toText(args) {
  return args
    .map(value => {
      if (typeof value === 'string') return value
      if (value === null) return 'null'
      if (value === undefined) return 'undefined'
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    })
    .join(' ')
}

function createPriyoTell(logger) {
  const priyoTell = (...args) => {
    logger.log(...args)
    return null
  }

  // Mark as host object so VM can treat member calls safely.
  priyoTell.__priyoHostObject = true

  priyoTell.Build = (...args) => {
    logBuild(toText(args))
    return null
  }
  priyoTell.Success = (...args) => {
    logSuccess(toText(args))
    return null
  }
  priyoTell.Info = (...args) => {
    logInfo(toText(args))
    return null
  }
  priyoTell.Warn = (...args) => {
    logWarn(toText(args))
    return null
  }
  priyoTell.Error = (...args) => {
    logError(toText(args))
    return null
  }

  return priyoTell
}

function ensureArray(value, methodName) {
  if (!Array.isArray(value)) {
    throw new Error(`priyoArray.${methodName} expects an array as the first argument`)
  }
}

function ensureInteger(value, methodName, argName) {
  if (!Number.isInteger(value)) {
    throw new Error(`priyoArray.${methodName} expects integer ${argName}`)
  }
}

function createPriyoArrayHelpers() {
  return {
    __priyoHostObject: true,

    isArray(value) {
      return Array.isArray(value)
    },

    length(arr) {
      ensureArray(arr, 'length')
      return arr.length
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

    first(arr) {
      ensureArray(arr, 'first')
      return arr.length ? arr[0] : null
    },

    last(arr) {
      ensureArray(arr, 'last')
      return arr.length ? arr[arr.length - 1] : null
    },

    includes(arr, value) {
      ensureArray(arr, 'includes')
      return arr.includes(value)
    },

    indexOf(arr, value) {
      ensureArray(arr, 'indexOf')
      return arr.indexOf(value)
    },

    join(arr, separator = ',') {
      ensureArray(arr, 'join')
      return arr.join(separator)
    },

    reverse(arr) {
      ensureArray(arr, 'reverse')
      return [...arr].reverse()
    },

    at(arr, index) {
      ensureArray(arr, 'at')
      ensureInteger(index, 'at', 'index')
      if (index < 0 || index >= arr.length) return null
      return arr[index]
    },

    slice(arr, start = null, end = null) {
      ensureArray(arr, 'slice')
      if (start != null && !Number.isInteger(start)) {
        throw new Error('priyoArray.slice expects integer start')
      }
      if (end != null && !Number.isInteger(end)) {
        throw new Error('priyoArray.slice expects integer end')
      }
      return arr.slice(start == null ? 0 : start, end == null ? arr.length : end)
    },

    // Higher-order helpers are VM-aware for PriyoScript callbacks.
    map(arr, callback) {
      ensureArray(arr, 'map')
      if (typeof callback !== 'function') {
        throw new Error('priyoArray.map expects a callback function')
      }
      return arr.map(callback)
    },

    filter(arr, callback) {
      ensureArray(arr, 'filter')
      if (typeof callback !== 'function') {
        throw new Error('priyoArray.filter expects a callback function')
      }
      return arr.filter(callback)
    },

    reduce(arr, callback, initialValue) {
      ensureArray(arr, 'reduce')
      if (typeof callback !== 'function') {
        throw new Error('priyoArray.reduce expects a callback function')
      }
      return arguments.length >= 3 ? arr.reduce(callback, initialValue) : arr.reduce(callback)
    },

    forEach(arr, callback) {
      ensureArray(arr, 'forEach')
      if (typeof callback !== 'function') {
        throw new Error('priyoArray.forEach expects a callback function')
      }
      arr.forEach(callback)
      return null
    },

    find(arr, callback) {
      ensureArray(arr, 'find')
      if (typeof callback !== 'function') {
        throw new Error('priyoArray.find expects a callback function')
      }
      const value = arr.find(callback)
      return value === undefined ? null : value
    },

    some(arr, callback) {
      ensureArray(arr, 'some')
      if (typeof callback !== 'function') {
        throw new Error('priyoArray.some expects a callback function')
      }
      return arr.some(callback)
    },

    every(arr, callback) {
      ensureArray(arr, 'every')
      if (typeof callback !== 'function') {
        throw new Error('priyoArray.every expects a callback function')
      }
      return arr.every(callback)
    },
  }
}

function createPriyoConcurrencyHost() {
  return {
    __priyoHostObject: true,
    __priyoConcurrencyRoot: true,
  }
}

function createPrakritiChannel(capacity = 0, label = '') {
  if (!Number.isInteger(capacity) || capacity < 0) {
    throw new Error('prakritiChannel expects a non-negative integer capacity')
  }

  const buffer = []
  const waitingReceivers = []
  const waitingSenders = []
  let closed = false

  const flush = () => {
    while (waitingReceivers.length > 0 && buffer.length > 0) {
      const receiver = waitingReceivers.shift()
      receiver.resolve(buffer.shift())
    }

    while (waitingSenders.length > 0 && (waitingReceivers.length > 0 || buffer.length < capacity)) {
      const sender = waitingSenders.shift()
      if (waitingReceivers.length > 0) {
        const receiver = waitingReceivers.shift()
        receiver.resolve(sender.value)
      } else {
        buffer.push(sender.value)
      }
      sender.resolve(true)
    }

    if (closed && buffer.length === 0) {
      while (waitingReceivers.length > 0) {
        waitingReceivers.shift().resolve(null)
      }
      while (waitingSenders.length > 0) {
        waitingSenders.shift().reject(new Error('Cannot send on a closed prakritiChannel'))
      }
    }
  }

  const channel = {
    __priyoHostObject: true,
    __priyoConcurrencyKind: 'channel',
    label: label == null ? '' : String(label),
    capacity,

    send(value) {
      if (closed) {
        return Promise.reject(new Error('Cannot send on a closed prakritiChannel'))
      }
      if (waitingReceivers.length > 0) {
        waitingReceivers.shift().resolve(value)
        return Promise.resolve(true)
      }
      if (buffer.length < capacity) {
        buffer.push(value)
        return Promise.resolve(true)
      }
      return new Promise((resolve, reject) => {
        waitingSenders.push({ value, resolve, reject })
      })
    },

    receive() {
      if (buffer.length > 0) {
        const value = buffer.shift()
        flush()
        return Promise.resolve(value)
      }
      if (waitingSenders.length > 0) {
        const sender = waitingSenders.shift()
        sender.resolve(true)
        return Promise.resolve(sender.value)
      }
      if (closed) {
        return Promise.resolve(null)
      }
      return new Promise(resolve => {
        waitingReceivers.push({ resolve })
      })
    },

    close() {
      closed = true
      flush()
      return null
    },

    isClosed() {
      return closed
    },

    size() {
      return buffer.length
    },
  }

  return channel
}

function createBuiltins(io = {}) {
  const input = io.stdin || stdin
  const output = io.stdout || stdout
  const logger = io.console || console
  const promptReader = typeof io.prompt === 'function' ? io.prompt : null
  const priyoTell = createPriyoTell(logger)
  const priyoPackage = createPackageManager()
  const priyoArray = createPriyoArrayHelpers()
  const priyoConcurrency = createPriyoConcurrencyHost()
  const prakritiConcurrency = priyoConcurrency

  async function askUser(prompt = '') {
    const message = prompt == null ? '' : String(prompt)
    if (promptReader) {
      return await promptReader(message)
    }

    const rl = readline.createInterface({ input, output })
    try {
      return await rl.question(message)
    } finally {
      rl.close()
    }
  }

  return {
    priyoTell,
    priyoPackage,
    priyoArray,
    priyoConcurrency,
    prakritiConcurrency,
    prakritiChannel: createPrakritiChannel,

    priyoListenSentence: async (prompt = '') => {
      return askUser(prompt)
    },

    priyoListenNumber: async (prompt = '') => {
      const raw = await askUser(prompt)
      const value = Number(raw.trim())

      if (Number.isNaN(value)) {
        throw new Error(`Invalid number input: "${raw}"`)
      }
      return value
    },

    // Backward-compatible alias.
    priyoListen: async (prompt = '') => {
      return askUser(prompt)
    },
  }
}

module.exports = { createBuiltins }
