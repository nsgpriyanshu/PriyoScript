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

  it('should evaluate async functions with await', async () => {
    const code = `
      monalisa {
        prakritiWait lisaaTask addAsync(a, b) {
          priyoGiveBack prakritiPause (a + b)
        }
        priyoTell(prakritiPause addAsync(20, 22))
      }
    `
    await runSource(code)
    expect(logSpy).toHaveBeenCalledWith(42)
  })

  it('should reject await usage outside async functions', async () => {
    const code = `
      monalisa {
        lisaaTask badAwait() {
          priyoGiveBack prakritiPause 10
        }
      }
    `
    await expect(runSource(code)).rejects.toMatchObject({
      code: 'PSYN-004',
      message: expect.stringMatching(
        /prakritiPause can only be used inside prakritiWait lisaaTask/i,
      ),
    })
  })

  it('should evaluate array destructuring declarations', async () => {
    const code = `
      monalisa {
        priyoChange [first = 5, [second], third] = [11, [22], 33]
        priyoTell(first + second + third)
        priyoKeep math = priyoPackage.use("math")
        priyoChange {add, unknown = 99} = math
        priyoTell(unknown)
      }
    `
    await runSource(code)
    expect(logSpy).toHaveBeenCalledWith(66)
    expect(logSpy).toHaveBeenCalledWith(99)
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
  lisaaBring "./college.priyo": collegeModule
  lisaaBring "./college.priyo": [campus, square: sq]
  priyoTell(collegeModule.square(5))
  priyoTell(campus)
  priyoTell(sq(6))
}
      `,
      'utf8',
    )

    try {
      await runFile(appPath)
      expect(logSpy).toHaveBeenCalledWith(25)
      expect(logSpy).toHaveBeenCalledWith('NSEC')
      expect(logSpy).toHaveBeenCalledWith(36)
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should reject cyclic module imports', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'priyoscript-cycle-'))
    const aPath = path.join(tempDir, 'a.priyo')
    const bPath = path.join(tempDir, 'b.priyo')
    const appPath = path.join(tempDir, 'main.priyo')

    fs.writeFileSync(
      aPath,
      `
lisaaBox {
  lisaaBring "./b.priyo"
  lisaaShare b
}
      `,
      'utf8',
    )
    fs.writeFileSync(
      bPath,
      `
lisaaBox {
  lisaaBring "./a.priyo"
  lisaaShare a
}
      `,
      'utf8',
    )
    fs.writeFileSync(
      appPath,
      `
monalisa {
  lisaaBring "./a.priyo"
}
      `,
      'utf8',
    )

    try {
      await expect(runFile(appPath)).rejects.toMatchObject({
        message: expect.stringMatching(/Cyclic module import detected/i),
      })
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should enforce parent constructor call rules', async () => {
    const code = `
      monalisa {
        lisaaFamily Base {
          lisaaTask init(name) {
            priyoSelf.name = name
          }
        }
        lisaaFamily Child lisaaInherit Base {
          lisaaTask init(name) {
            priyoSelf.extra = "x"
            priyoParent(name)
          }
        }
      }
    `
    await expect(runSource(code)).rejects.toMatchObject({
      message: expect.stringMatching(/must call priyoParent\(\.\.\.\) as first statement in init/i),
    })
  })

  it('should reject duplicate parent constructor calls in child init', async () => {
    const code = `
      monalisa {
        lisaaFamily Base {
          lisaaTask init(name) {
            priyoSelf.name = name
          }
        }
        lisaaFamily Child lisaaInherit Base {
          lisaaTask init(name) {
            priyoParent(name)
            priyoParent(name)
          }
        }
      }
    `
    await expect(runSource(code)).rejects.toMatchObject({
      message: expect.stringMatching(/cannot call priyoParent\(\.\.\.\) more than once/i),
    })
  })

  it('should enforce strict declared-field assignment when class declares fields', async () => {
    const code = `
      monalisa {
        lisaaFamily Student {
          priyoKeep name = ""

          lisaaTask init() {
            priyoSelf.name = "Priyo"
            priyoSelf.age = 20
          }
        }
        priyoCreate Student()
      }
    `
    await expect(runSource(code)).rejects.toMatchObject({
      message: expect.stringMatching(/Field "age" is not declared on Student/i),
    })
  })

  it('should keep dynamic instance fields for classes without field declarations', async () => {
    const code = `
      monalisa {
        lisaaFamily DynamicStudent {
          lisaaTask init() {
            priyoSelf.name = "Priyo"
            priyoSelf.age = 20
          }
        }
        priyoKeep student = priyoCreate DynamicStudent()
        priyoTell(student.age)
      }
    `
    await runSource(code)
    expect(logSpy).toHaveBeenCalledWith(20)
  })
})
