import { describe, it, expect } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { Readable, Writable } from 'stream'
import { spawnSync } from 'child_process'
import replModule from '../src/repl/repl.js'

const { startRepl } = replModule

function stripAnsi(value) {
  const input = String(value || '')
  let output = ''
  let i = 0
  while (i < input.length) {
    if (input.charCodeAt(i) === 27) {
      i++
      while (i < input.length && input[i] !== 'm') i++
      if (i < input.length) i++
      continue
    }
    output += input[i]
    i++
  }
  return output
}

describe('CLI/REPL golden output', () => {
  it('should print structured syntax diagnostics with docs links', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'priyoscript-cli-'))
    const brokenPath = path.join(tempDir, 'broken.priyo')
    fs.writeFileSync(
      brokenPath,
      `
monalsia {
  priyoTell("ok")
}
      `,
      'utf8',
    )

    try {
      const result = spawnSync('node', ['bin/monalisa.js', brokenPath], {
        cwd: process.cwd(),
        encoding: 'utf8',
      })
      const output = stripAnsi(`${result.stdout}\n${result.stderr}`)
      expect(result.status).toBe(1)
      expect(output).toContain('Code: PSYN-001')
      expect(output).toContain('Did you mean:')
      expect(output).toMatch(/Span:\s+\^+/)
      expect(output).toContain(
        'Docs: https://priyoscript.vercel.app/docs/stable/reference/errors-reference#psyn-001',
      )
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should print stable help output in REPL mode', async () => {
    const input = Readable.from(['.help\n', '.exit\n'])
    let outputText = ''
    const output = new Writable({
      write(chunk, _encoding, callback) {
        outputText += String(chunk)
        callback()
      },
    })
    const logs = []

    const replPromise = startRepl({
      input,
      output,
      logger: {
        build: line => logs.push(line),
        info: line => logs.push(line),
        error: line => logs.push(line),
      },
    })

    await replPromise

    const joined = stripAnsi(`${logs.join('\n')}\n${outputText}`)
    expect(joined).toContain('PriyoScript REPL')
    expect(joined).toContain('REPL commands:')
    expect(joined).toContain('.reset')
  })
})
