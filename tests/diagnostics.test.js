import { describe, it, expect } from 'vitest'
import runModule from '../src/core/run.js'
import errorsModule from '../src/errors/index.js'

const { runSource } = runModule
const { formatErrorForUser } = errorsModule

describe('Diagnostics v2', () => {
  it('should provide syntax span and typo suggestion metadata', async () => {
    const source = `
      monalsia {
        priyoTell("ok")
      }
    `

    await expect(runSource(source)).rejects.toMatchObject({
      stage: 'syntax',
      metadata: expect.objectContaining({
        line: expect.any(Number),
        column: expect.any(Number),
        endColumn: expect.any(Number),
        sourceLine: expect.any(String),
      }),
    })

    try {
      await runSource(source)
    } catch (err) {
      const formatted = formatErrorForUser(err)
      expect(formatted.details.some(line => line.startsWith('Span:'))).toBe(true)
      expect(formatted.details.some(line => line.startsWith('Docs:'))).toBe(true)
      expect(formatted.details.some(line => line.startsWith('Did you mean:'))).toBe(true)
    }
  })

  it('should render compile/runtime diagnostics with docs links', async () => {
    const compileSource = `
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

    let compileErr
    try {
      await runSource(compileSource)
    } catch (err) {
      compileErr = err
    }
    expect(compileErr).toBeTruthy()
    expect(compileErr.stage).toBe('compile')
    const compileFormatted = formatErrorForUser(compileErr)
    expect(compileFormatted.details.some(line => line.startsWith('Span:'))).toBe(true)
    expect(compileFormatted.details.some(line => line.startsWith('Docs:'))).toBe(true)

    const runtimeSource = `
      monalisa {
        priyoTell(5 / 0)
      }
    `

    let runtimeErr
    try {
      await runSource(runtimeSource)
    } catch (err) {
      runtimeErr = err
    }
    expect(runtimeErr).toBeTruthy()
    expect(runtimeErr.stage).toBe('runtime')
    const runtimeFormatted = formatErrorForUser(runtimeErr)
    expect(runtimeFormatted.details.some(line => line.startsWith('Span:'))).toBe(true)
    expect(runtimeFormatted.details.some(line => line.startsWith('Docs:'))).toBe(true)
  })
})
