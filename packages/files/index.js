const fs = require('fs')
const path = require('path')
const { createRuntimeError, ErrorCodes } = require('../../src/errors')

function ensurePath(value, methodName, argName = 'path') {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`files.${methodName} expects ${argName} to be a non-empty string`)
  }
}

function ensureText(value, methodName, argName = 'text') {
  if (typeof value !== 'string') {
    throw new Error(`files.${methodName} expects ${argName} to be a string`)
  }
}

function ensureEncoding(value, methodName) {
  if (value != null && typeof value !== 'string') {
    throw new Error(`files.${methodName} expects encoding to be a string`)
  }
}

function ensureLines(value, methodName) {
  if (!Array.isArray(value)) {
    throw new Error(`files.${methodName} expects lines to be an array`)
  }
}

function ensureJsonValue(value, methodName) {
  if (value === undefined || typeof value === 'function') {
    throw new Error(`files.${methodName} expects data to be a JSON-serializable value`)
  }
}

function normalizeLines(text) {
  const lines = String(text || '').split(/\r?\n/)
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines
}

function failNotFound(methodName, targetPath) {
  throw createRuntimeError(`File not found: "${targetPath}"`, {
    code: ErrorCodes.RUNTIME.FILE_NOT_FOUND,
    metadata: { file: targetPath },
  })
}

const filesPackage = {
  __priyoHostObject: true,

  cwd() {
    return process.cwd()
  },

  join(...parts) {
    const safeParts = parts.map(part => String(part))
    return path.join(...safeParts)
  },

  resolve(...parts) {
    const safeParts = parts.map(part => String(part))
    return path.resolve(...safeParts)
  },

  dirname(filePath) {
    ensurePath(filePath, 'dirname')
    return path.dirname(filePath)
  },

  basename(filePath) {
    ensurePath(filePath, 'basename')
    return path.basename(filePath)
  },

  extname(filePath) {
    ensurePath(filePath, 'extname')
    return path.extname(filePath)
  },

  exists(filePath) {
    ensurePath(filePath, 'exists')
    return fs.existsSync(filePath)
  },

  readText(filePath, encoding = 'utf8') {
    ensurePath(filePath, 'readText')
    ensureEncoding(encoding, 'readText')
    if (!fs.existsSync(filePath)) failNotFound('readText', filePath)
    return fs.readFileSync(filePath, encoding)
  },

  readLines(filePath, encoding = 'utf8') {
    ensurePath(filePath, 'readLines')
    ensureEncoding(encoding, 'readLines')
    if (!fs.existsSync(filePath)) failNotFound('readLines', filePath)
    const text = fs.readFileSync(filePath, encoding)
    return normalizeLines(text)
  },

  readJson(filePath, encoding = 'utf8') {
    ensurePath(filePath, 'readJson')
    ensureEncoding(encoding, 'readJson')
    if (!fs.existsSync(filePath)) failNotFound('readJson', filePath)
    const text = fs.readFileSync(filePath, encoding)
    try {
      return JSON.parse(text)
    } catch (err) {
      throw new Error('files.readJson expects the file to contain valid JSON')
    }
  },

  writeText(filePath, text, encoding = 'utf8') {
    ensurePath(filePath, 'writeText')
    ensureText(text, 'writeText')
    ensureEncoding(encoding, 'writeText')
    fs.writeFileSync(filePath, text, { encoding })
    return true
  },

  writeLines(filePath, lines, encoding = 'utf8') {
    ensurePath(filePath, 'writeLines')
    ensureLines(lines, 'writeLines')
    ensureEncoding(encoding, 'writeLines')
    const output = lines.map(line => String(line)).join('\n')
    fs.writeFileSync(filePath, output, { encoding })
    return true
  },

  writeJson(filePath, data, pretty = true, encoding = 'utf8') {
    ensurePath(filePath, 'writeJson')
    ensureJsonValue(data, 'writeJson')
    ensureEncoding(encoding, 'writeJson')
    const spacing = pretty ? 2 : 0
    const json = JSON.stringify(data, null, spacing)
    fs.writeFileSync(filePath, json, { encoding })
    return true
  },

  appendText(filePath, text, encoding = 'utf8') {
    ensurePath(filePath, 'appendText')
    ensureText(text, 'appendText')
    ensureEncoding(encoding, 'appendText')
    fs.appendFileSync(filePath, text, { encoding })
    return true
  },

  copy(fromPath, toPath) {
    ensurePath(fromPath, 'copy', 'from')
    ensurePath(toPath, 'copy', 'to')
    if (!fs.existsSync(fromPath)) failNotFound('copy', fromPath)
    fs.copyFileSync(fromPath, toPath)
    return true
  },

  move(fromPath, toPath) {
    ensurePath(fromPath, 'move', 'from')
    ensurePath(toPath, 'move', 'to')
    if (!fs.existsSync(fromPath)) failNotFound('move', fromPath)
    fs.renameSync(fromPath, toPath)
    return true
  },

  rename(targetPath, newName) {
    ensurePath(targetPath, 'rename', 'path')
    ensurePath(newName, 'rename', 'newName')
    if (!fs.existsSync(targetPath)) failNotFound('rename', targetPath)
    const dir = path.dirname(targetPath)
    const nextPath = path.join(dir, newName)
    fs.renameSync(targetPath, nextPath)
    return nextPath
  },

  touch(filePath) {
    ensurePath(filePath, 'touch')
    if (fs.existsSync(filePath)) {
      const now = new Date()
      fs.utimesSync(filePath, now, now)
      return true
    }
    fs.closeSync(fs.openSync(filePath, 'a'))
    return true
  },

  makeDir(dirPath) {
    ensurePath(dirPath, 'makeDir', 'dirPath')
    fs.mkdirSync(dirPath, { recursive: true })
    return true
  },

  ensureDir(dirPath) {
    ensurePath(dirPath, 'ensureDir', 'dirPath')
    fs.mkdirSync(dirPath, { recursive: true })
    return true
  },

  listDir(dirPath) {
    ensurePath(dirPath, 'listDir', 'dirPath')
    if (!fs.existsSync(dirPath)) failNotFound('listDir', dirPath)
    return fs.readdirSync(dirPath)
  },

  listDirDetailed(dirPath) {
    ensurePath(dirPath, 'listDirDetailed', 'dirPath')
    if (!fs.existsSync(dirPath)) failNotFound('listDirDetailed', dirPath)
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    return entries.map(entry => {
      const entryPath = path.join(dirPath, entry.name)
      let size = 0
      try {
        size = fs.statSync(entryPath).size
      } catch {
        size = 0
      }
      return {
        name: entry.name,
        type: entry.isDirectory() ? 'dir' : entry.isFile() ? 'file' : 'other',
        size,
      }
    })
  },

  remove(targetPath) {
    ensurePath(targetPath, 'remove', 'targetPath')
    if (!fs.existsSync(targetPath)) return false
    fs.rmSync(targetPath, { recursive: true, force: true })
    return true
  },

  stat(targetPath) {
    ensurePath(targetPath, 'stat', 'targetPath')
    if (!fs.existsSync(targetPath)) failNotFound('stat', targetPath)
    const stats = fs.statSync(targetPath)
    return {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      mtime: stats.mtime.toISOString(),
      ctime: stats.ctime.toISOString(),
    }
  },
}

module.exports = filesPackage
