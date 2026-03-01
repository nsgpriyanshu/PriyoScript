import { describe, it, expect } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import runModule from '../src/core/run.js'

const { runFile } = runModule

describe('Module resolution v3', () => {
  it('should resolve directory imports through index.priyo fallback', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'priyoscript-module-v3-'))

    try {
      const libDir = path.join(tempDir, 'lib')
      fs.mkdirSync(libDir)

      fs.writeFileSync(
        path.join(libDir, 'index.priyo'),
        `
lisaaBox {
  priyoKeep label = "mona"
  lisaaShare label
}
        `,
        'utf8',
      )

      const appPath = path.join(tempDir, 'main.priyo')
      fs.writeFileSync(
        appPath,
        `
monalisa {
  lisaaBring "./lib": pkg
  priyoTell(pkg.label)
}
        `,
        'utf8',
      )

      await expect(runFile(appPath)).resolves.toBeTruthy()
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should resolve project-absolute imports from process cwd root', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'priyoscript-module-root-'))
    const previousCwd = process.cwd()

    try {
      process.chdir(tempDir)
      const coreDir = path.join(tempDir, 'modules', 'core')
      fs.mkdirSync(coreDir, { recursive: true })

      fs.writeFileSync(
        path.join(coreDir, 'index.priyo'),
        `
lisaaBox {
  priyoKeep value = 42
  lisaaShare value
}
        `,
        'utf8',
      )

      const appPath = path.join(tempDir, 'app.priyo')
      fs.writeFileSync(
        appPath,
        `
monalisa {
  lisaaBring "/modules/core": core
  priyoTell(core.value)
}
        `,
        'utf8',
      )

      await expect(runFile(appPath)).resolves.toBeTruthy()
    } finally {
      process.chdir(previousCwd)
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should provide tried paths in module-not-found diagnostics', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'priyoscript-module-missing-'))

    try {
      const appPath = path.join(tempDir, 'main.priyo')
      fs.writeFileSync(
        appPath,
        `
monalisa {
  lisaaBring "./missing/module": pkg
  priyoTell(pkg)
}
        `,
        'utf8',
      )

      await expect(runFile(appPath)).rejects.toMatchObject({
        code: 'PRUN-110',
        message: expect.stringMatching(/Module not found:/),
        metadata: expect.objectContaining({
          triedPaths: expect.any(Array),
        }),
      })
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
