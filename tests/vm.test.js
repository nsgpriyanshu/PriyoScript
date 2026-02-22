import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import runModule from '../src/core/run.js'

const { runSource } = runModule

describe('VM & Runtime', () => {
    let logSpy

    beforeEach(() => {
        logSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
    })

    afterEach(() => {
        logSpy.mockRestore()
    })

    it('should evaluate variables and arithmetic', async () => {
        const code = `
      monalisa {
        priyoKeep a = 10
        priyoKeep b = 20
        priyoTell(a + b)
      }
    `
        await runSource(code)
        expect(logSpy).toHaveBeenCalledWith(30)
    })

    it('should evaluate control flow', async () => {
        const code = `
      monalisa {
        priyoKeep x = 5
        prakritiIf (x > 3) {
          priyoTell("greater")
        } prakritiElse {
          priyoTell("less")
        }
      }
    `
        await runSource(code)
        expect(logSpy).toHaveBeenCalledWith("greater")
    })

    it('should evaluate while loops', async () => {
        const code = `
      monalisa {
        priyoKeep count = 0
        prakritiAsLongAs (count < 3) {
          count = count + 1
        }
        priyoTell(count)
      }
    `
        await runSource(code)
        expect(logSpy).toHaveBeenCalledWith(3)
    })

    it('should evaluate functions', async () => {
        const code = `
      monalisa {
        lisaaTask greet(name) {
          priyoGiveBack "hello " + name
        }
        priyoTell(greet("world"))
      }
    `
        await runSource(code)
        expect(logSpy).toHaveBeenCalledWith("hello world")
    })
})
