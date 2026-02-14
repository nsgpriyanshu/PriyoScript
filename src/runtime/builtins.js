const readline = require('readline/promises')
const { stdin, stdout } = require('process')

function createBuiltins(io = {}) {
  const input = io.stdin || stdin
  const output = io.stdout || stdout
  const logger = io.console || console

  return {
    priyoTell: (...args) => {
      logger.log(...args)
      return null
    },

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
