import { describe, it, expect } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import runModule from '../src/core/run.js'

const { runFile } = runModule

describe('Package/module cycle stress', () => {
  it('should reject deep cyclic import chains', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'priyoscript-cycle-stress-'))
    const moduleCount = 18

    try {
      for (let i = 0; i < moduleCount; i++) {
        const next = (i + 1) % moduleCount
        const content = `
lisaaBox {
  lisaaBring "./m${next}.priyo"
  priyoKeep value${i} = ${i}
  lisaaShare value${i}
}
        `
        fs.writeFileSync(path.join(tempDir, `m${i}.priyo`), content, 'utf8')
      }

      const appPath = path.join(tempDir, 'main.priyo')
      fs.writeFileSync(
        appPath,
        `
monalisa {
  lisaaBring "./m0.priyo"
}
        `,
        'utf8',
      )

      await expect(runFile(appPath)).rejects.toMatchObject({
        message: expect.stringMatching(/Cyclic module import detected/i),
      })
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
