const fs = require('fs')
const Runtime = require('./runtime')
const keywords = require('../config/keywords.json')
const { logBuild } = require('nstypocolors')

class Interpreter {
  constructor() {
    this.runtime = new Runtime()

    this.builtins = {
      'priyo.listen': () => this.syncInput(),
      'priyo.tell': msg => logBuild(msg), // pastel by default
    }
  }

  syncInput() {
    process.stdout.write('> ')
    const buffer = Buffer.alloc(1024)
    const bytes = fs.readSync(0, buffer, 0, 1024, null)
    return buffer.toString('utf-8', 0, bytes).trim()
  }

  execute(program) {
    for (let i = 0; i < program.length; i++) {
      const instr = program[i]
      try {
        i = this.evaluate(instr, program, i)
      } catch (err) {
        throw new Error(`${err.message} at line ${instr.number}`)
      }
      if (this.runtime.break) break
    }
  }

  evaluate({ line }, program, index) {
    line = line.trim()

    // ----------------- PRINT -----------------
    if (line.startsWith(keywords.print)) {
      let content = line
        .replace(keywords.print, '')
        .replace(/^\(|\)$/g, '')
        .trim()

      if (/^\w+\.\w+\(\)$/.test(content)) {
        // builtin function call like priyo.listen()
        const fn = content.slice(0, -2)
        if (this.builtins[fn]) logBuild(this.builtins[fn]())
        return index
      }

      try {
        const result = this.evalExpr(content)
        logBuild(result)
      } catch {
        if (/^["'].*["']$/.test(content)) logBuild(content.slice(1, -1))
        else if (content in this.runtime.variables) logBuild(this.runtime.get(content))
        else throw new Error(`Priyo can’t understand value "${content}"`)
      }
      return index
    }

    // ----------------- ASSIGNMENT -----------------
    if (line.includes('=')) {
      const [name, value] = line.split('=').map(s => s.trim())
      let evaluated

      const fnCallMatch = value.match(/^(\w+\.\w+)\(\)$/)
      if (fnCallMatch) {
        const fnName = fnCallMatch[1]
        if (this.builtins[fnName]) evaluated = this.builtins[fnName]()
        else throw new Error(`Priyo doesn’t know "${fnName}"`)
      } else if (value in this.runtime.variables) evaluated = this.runtime.get(value)
      else if (/^["'].*["']$/.test(value)) evaluated = value.slice(1, -1)
      else if (!isNaN(Number(value))) evaluated = Number(value)
      else throw new Error(`Priyo can’t understand value "${value}"`)

      this.runtime.set(name, evaluated)
      return index
    }

    // ----------------- IF / ELIF / ELSE -----------------
    if (line.startsWith(keywords.if)) return this.handleIf(line, program, index)

    return index
  }

  handleIf(line, program, index) {
    const condMatch = line.match(/\((.*)\)/)
    if (!condMatch) throw new Error('Priyo expected condition in parentheses')

    const condition = this.evalExpr(condMatch[1].trim())
    let executed = false
    let i = index + 1

    while (i < program.length) {
      const currLine = program[i].line.trim()
      if (currLine.startsWith(keywords.elif) && !executed) {
        const elifMatch = currLine.match(/\((.*)\)/)
        if (!elifMatch) throw new Error('Priyo expected condition in elif')
        if (this.evalExpr(elifMatch[1].trim())) {
          i = this.executeBlock(i + 1, program)
          executed = true
        }
      } else if (currLine.startsWith(keywords.else) && !executed) {
        i = this.executeBlock(i + 1, program)
        executed = true
      } else if (currLine === '}') break

      i++
    }

    if (condition && !executed) i = this.executeBlock(index + 1, program)
    return i
  }

  executeBlock(start, program) {
    for (let i = start; i < program.length; i++) {
      const line = program[i].line.trim()
      if (line === '}') return i
      this.evaluate(program[i], program, i)
    }
    return program.length
  }

  evalExpr(expr) {
    const replaced = expr.replace(/\b\w+\b/g, v => {
      if (v in this.runtime.variables) return this.runtime.get(v)
      return v
    })

    try {
      // eslint-disable-next-line no-eval
      return eval(replaced)
    } catch {
      throw new Error(`Priyo can’t understand value "${expr}"`)
    }
  }
}

module.exports = new Interpreter()
