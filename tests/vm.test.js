import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import runModule from '../src/core/run.js'

const { runSource, runFile } = runModule

describe('VM & Runtime', () => {
  let logSpy

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
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
    expect(logSpy).toHaveBeenCalledWith('greater')
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
    expect(logSpy).toHaveBeenCalledWith('hello world')
  })

  it('should evaluate array destructuring declarations', async () => {
    const code = `
      monalisa {
        priyoChange [first, second] = [11, 22]
        priyoTell(first + second)
      }
    `
    await runSource(code)
    expect(logSpy).toHaveBeenCalledWith(33)
  })

  it('should evaluate priyoArray callback helpers', async () => {
    const code = `
      monalisa {
        lisaaTask double(x) {
          priyoGiveBack x * 2
        }
        lisaaTask isEven(x) {
          priyoGiveBack x % 2 == 0
        }
        priyoKeep nums = [1, 2, 3, 4]
        priyoKeep doubled = priyoArray.map(nums, double)
        priyoKeep evens = priyoArray.filter(nums, isEven)
        priyoTell(doubled[3])
        priyoTell(priyoArray.length(evens))
      }
    `
    await runSource(code)
    expect(logSpy).toHaveBeenCalledWith(8)
    expect(logSpy).toHaveBeenCalledWith(2)
  })

  it('should import user modules with lisaaBox and lisaaShare', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'priyoscript-mod-'))
    const modulePath = path.join(tempDir, 'college.priyo')
    const appPath = path.join(tempDir, 'main.priyo')

    fs.writeFileSync(
      modulePath,
      `
lisaaBox {
  lisaaTask square(x) {
    priyoGiveBack x * x
  }

  priyoKeep campus = "NSEC"
  lisaaShare square
  lisaaShare campus
}
      `,
      'utf8',
    )

    fs.writeFileSync(
      appPath,
      `
monalisa {
  lisaaBring "./college.priyo"
  priyoTell(college.square(5))
  priyoTell(college.campus)
}
      `,
      'utf8',
    )

    try {
      await runFile(appPath)
      expect(logSpy).toHaveBeenCalledWith(25)
      expect(logSpy).toHaveBeenCalledWith('NSEC')
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
