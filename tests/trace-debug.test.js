import { describe, it, expect } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'

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
  return output.trim()
}

describe('Trace/debug tooling', () => {
  it('should emit opcode trace and breakpoint logs with -trace', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'priyoscript-trace-'))
    const filePath = path.join(tempDir, 'trace.priyo')

    fs.writeFileSync(
      filePath,
      `
monalisa {
  priyoKeep x = 10
  priyoBreak("after-x")
  priyoTell(x)
}
      `,
      'utf8',
    )

    try {
      const result = spawnSync('node', ['bin/monalisa.js', '-trace', filePath], {
        cwd: process.cwd(),
        encoding: 'utf8',
      })
      const output = stripAnsi(`${result.stdout}\n${result.stderr}`)
      expect(result.status).toBe(0)
      expect(output).toContain('[TRACE #')
      expect(output).toContain('[BREAK #')
      expect(output).toContain('after-x')
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
