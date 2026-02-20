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

function createBuiltins(io = {}) {
  const input = io.stdin || stdin
  const output = io.stdout || stdout
  const logger = io.console || console
  const priyoTell = createPriyoTell(logger)
  const priyoPackage = createPackageManager()

  return {
    priyoTell,
    priyoPackage,

    priyoListenSentence: async (prompt = '') => {
      const rl = readline.createInterface({ input, output })
      try {
        const message = prompt == null ? '' : String(prompt)
        return await rl.question(message)
      } finally {
        rl.close()
      }
    },

    priyoListenNumber: async (prompt = '') => {
      const rl = readline.createInterface({ input, output })
      try {
        const message = prompt == null ? '' : String(prompt)
        const raw = await rl.question(message)
        const value = Number(raw.trim())

        if (Number.isNaN(value)) {
          throw new Error(`Invalid number input: "${raw}"`)
        }

        return value
      } finally {
        rl.close()
      }
    },

    // Backward-compatible alias.
    priyoListen: async (prompt = '') => {
      const rl = readline.createInterface({ input, output })
      try {
        const message = prompt == null ? '' : String(prompt)
        return await rl.question(message)
      } finally {
        rl.close()
      }
    },
  }
}

module.exports = { createBuiltins }
