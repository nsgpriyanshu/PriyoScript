const { OpCode } = require('../compiler/opcodes')
const { Environment } = require('../runtime/environment')
const { createBuiltins } = require('../runtime/builtins')
const { createRuntimeError, ErrorCodes } = require('../errors')

class PriyoThrownValue {
  constructor(value) {
    this.__priyoThrown = true
    this.value = value
  }
}

class VM {
  constructor(instructions, options = {}) {
    this.instructions = instructions
    this.environment = options.environment || new Environment(null, { isFunctionScope: true })
    this.builtins = options.builtins || createBuiltins(options.io)
    this.moduleLoader = options.moduleLoader || null
    this.currentFile = options.currentFile || null
    this.moduleContext = options.moduleContext || null
    this.traceEnabled = !!options.trace
    this.traceLogger = typeof options.traceLogger === 'function' ? options.traceLogger : null
    this.traceFormat = options.traceFormat || 'text'
    this.traceFilter = options.traceFilter || null
    this.debugHooks = options.debugHooks || {}
    this.debugSessionId =
      options.debugSessionId || `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    this.traceSessionEmitted = false
    this.sourceCallStack = []
    this.debugSequence = 0
    this.registerBuiltinGlobals()
  }

  async run() {
    this.emitTraceSessionHeader()
    await this.executeFrame(this.instructions, this.environment, false, '<main>')
  }

  async executeFrame(
    bytecode,
    frameEnvironment,
    isFunctionFrame,
    frameName = '<frame>',
    executionOptions = {},
  ) {
    const normalizedBytecode = this.normalizeBytecode(bytecode)
    const instructions = normalizedBytecode.instructions
    const previousEnvironment = this.environment
    this.environment = frameEnvironment
    this.sourceCallStack.push({
      file: this.currentFile || '<memory>',
      frame: frameName,
    })

    const registers = new Array(normalizedBytecode.maxRegisters || 0).fill(null)
    const tryStack = []
    const yieldBuffer = Array.isArray(executionOptions.yieldBuffer)
      ? executionOptions.yieldBuffer
      : null
    let scopeDepth = 0
    let ip = 0

    try {
      while (ip < instructions.length) {
        const instr = instructions[ip]
        this.traceInstruction(ip, instr, registers, frameName)

        try {
          switch (instr.op) {
            case OpCode.LOAD_CONST:
              registers[instr.operand.dest] = instr.operand.value
              break

            case OpCode.BUILD_ARRAY: {
              const { dest, elements } = instr.operand
              registers[dest] = Array.isArray(elements) ? elements.map(reg => registers[reg]) : []
              break
            }

            case OpCode.DEFINE_VARIABLE: {
              const { name, kind, src } = instr.operand
              const value = registers[src]
              this.environment.define(name, value, kind)
              break
            }

            case OpCode.LOAD_VARIABLE: {
              const { dest, name } = instr.operand
              registers[dest] = this.environment.get(name)
              break
            }

            case OpCode.SET_VARIABLE: {
              const { name, src } = instr.operand
              this.environment.set(name, registers[src])
              break
            }

            case OpCode.ADD: {
              const { dest, left, right } = instr.operand
              const leftValue = registers[left]
              const rightValue = registers[right]
              if (typeof leftValue === 'string' || typeof rightValue === 'string') {
                registers[dest] = String(leftValue) + String(rightValue)
                break
              }
              this.ensureNumbers(leftValue, rightValue, 'ADD')
              registers[dest] = leftValue + rightValue
              break
            }

            case OpCode.SUB: {
              const { dest, left, right } = instr.operand
              const leftValue = registers[left]
              const rightValue = registers[right]
              this.ensureNumbers(leftValue, rightValue, 'SUB')
              registers[dest] = leftValue - rightValue
              break
            }

            case OpCode.MUL: {
              const { dest, left, right } = instr.operand
              const leftValue = registers[left]
              const rightValue = registers[right]
              this.ensureNumbers(leftValue, rightValue, 'MUL')
              registers[dest] = leftValue * rightValue
              break
            }

            case OpCode.DIV: {
              const { dest, left, right } = instr.operand
              const leftValue = registers[left]
              const rightValue = registers[right]
              this.ensureNumbers(leftValue, rightValue, 'DIV')
              if (rightValue === 0) throw new Error('Division by zero')
              registers[dest] = leftValue / rightValue
              break
            }

            case OpCode.MOD: {
              const { dest, left, right } = instr.operand
              const leftValue = registers[left]
              const rightValue = registers[right]
              this.ensureNumbers(leftValue, rightValue, 'MOD')
              if (rightValue === 0) throw new Error('Modulo by zero')
              registers[dest] = leftValue % rightValue
              break
            }

            case OpCode.EQ: {
              const { dest, left, right } = instr.operand
              registers[dest] = registers[left] === registers[right]
              break
            }

            case OpCode.NOT_EQ: {
              const { dest, left, right } = instr.operand
              registers[dest] = registers[left] !== registers[right]
              break
            }

            case OpCode.LT: {
              const { dest, left, right } = instr.operand
              const leftValue = registers[left]
              const rightValue = registers[right]
              this.ensureNumbers(leftValue, rightValue, 'LT')
              registers[dest] = leftValue < rightValue
              break
            }

            case OpCode.LTE: {
              const { dest, left, right } = instr.operand
              const leftValue = registers[left]
              const rightValue = registers[right]
              this.ensureNumbers(leftValue, rightValue, 'LTE')
              registers[dest] = leftValue <= rightValue
              break
            }

            case OpCode.GT: {
              const { dest, left, right } = instr.operand
              const leftValue = registers[left]
              const rightValue = registers[right]
              this.ensureNumbers(leftValue, rightValue, 'GT')
              registers[dest] = leftValue > rightValue
              break
            }

            case OpCode.GTE: {
              const { dest, left, right } = instr.operand
              const leftValue = registers[left]
              const rightValue = registers[right]
              this.ensureNumbers(leftValue, rightValue, 'GTE')
              registers[dest] = leftValue >= rightValue
              break
            }

            case OpCode.AND: {
              const { dest, left, right } = instr.operand
              registers[dest] = this.isTruthy(registers[left]) && this.isTruthy(registers[right])
              break
            }

            case OpCode.OR: {
              const { dest, left, right } = instr.operand
              registers[dest] = this.isTruthy(registers[left]) || this.isTruthy(registers[right])
              break
            }

            case OpCode.NOT: {
              const { dest, src } = instr.operand
              registers[dest] = !this.isTruthy(registers[src])
              break
            }

            case OpCode.JUMP_IF_FALSE: {
              const condition = registers[instr.operand.condition]
              if (!this.isTruthy(condition)) {
                ip = instr.operand.target
                continue
              }
              break
            }

            case OpCode.JUMP: {
              const target =
                instr.operand && typeof instr.operand === 'object' ? instr.operand : null
              if (target) {
                const unwind = target.unwind || 0
                this.unwindScopes(unwind)
                scopeDepth -= unwind
                ip = target.target
                continue
              }
              ip = instr.operand
              continue
            }

            case OpCode.ENTER_SCOPE:
              this.environment = new Environment(this.environment, { isFunctionScope: false })
              scopeDepth++
              break

            case OpCode.EXIT_SCOPE:
              if (!this.environment.parent) throw new Error('Cannot exit global scope')
              this.environment = this.environment.parent
              scopeDepth--
              break

            case OpCode.DEFINE_FUNCTION: {
              const fnObj = {
                type: 'user_function',
                name: instr.operand.name,
                isAsync: !!instr.operand.isAsync,
                isGenerator: !!instr.operand.isGenerator,
                params: instr.operand.params,
                instructions: instr.operand.instructions,
                closure: this.environment,
              }
              this.environment.define(instr.operand.name, fnObj, 'const')
              break
            }

            case OpCode.DEFINE_CLASS: {
              let superClass = null
              if (instr.operand.superClassName) {
                const resolved = this.environment.get(instr.operand.superClassName)
                if (!resolved || resolved.type !== 'class') {
                  throw new Error(`Parent class "${instr.operand.superClassName}" not found`)
                }
                superClass = resolved
              }

              const methods = this.createMethodMap(instr.operand.methods)
              const staticMethods = this.createMethodMap(instr.operand.staticMethods || [])

              const classObj = {
                type: 'class',
                name: instr.operand.name,
                methods,
                staticMethods,
                resolvedMethodCache: new Map(),
                resolvedStaticMethodCache: new Map(),
                staticFields: new Map(),
                staticFieldKinds: new Map(),
                staticFieldAccess: new Map(),
                instanceFieldAccess: new Map(),
                instanceFieldInitializers: instr.operand.instanceFields || [],
                strictInstanceFields: false,
                strictStaticFields: false,
                definitionEnv: this.environment,
                superClass,
              }

              for (const method of [...methods.values(), ...staticMethods.values()]) {
                method.ownerClass = classObj
              }
              this.environment.define(instr.operand.name, classObj, 'const')
              await this.applyStaticFieldInitializers(classObj, instr.operand.staticFields || [])
              break
            }

            case OpCode.CREATE_INSTANCE: {
              const { dest, name, argRegs } = instr.operand
              const args = Array.isArray(argRegs) ? argRegs.map(reg => registers[reg]) : []
              const classObj = this.environment.get(name)
              if (!classObj || classObj.type !== 'class') {
                throw new Error(`Unknown class: ${name}`)
              }

              const instance = {
                type: 'instance',
                classRef: classObj,
                fields: new Map(),
                constFields: new Set(),
                fieldAccess: new Map(),
              }

              await this.applyInstanceFieldInitializers(instance)

              if (this.findMethod(classObj, 'init')) {
                await this.callMethod(instance, 'init', args)
              } else if (args.length > 0) {
                throw new Error(`Class "${name}" does not define init(${args.length} args)`)
              }

              registers[dest] = instance
              break
            }

            case OpCode.GET_PROPERTY: {
              const { dest, object, name } = instr.operand
              registers[dest] = this.resolveProperty(registers[object], name)
              break
            }

            case OpCode.SET_PROPERTY: {
              const { object, name, src } = instr.operand
              this.setProperty(registers[object], name, registers[src])
              break
            }

            case OpCode.GET_INDEX: {
              const { dest, target, index } = instr.operand
              registers[dest] = this.getIndexValue(registers[target], registers[index])
              break
            }

            case OpCode.SET_INDEX: {
              const { target, index, src } = instr.operand
              this.setIndexValue(registers[target], registers[index], registers[src])
              break
            }

            case OpCode.SLICE_ARRAY: {
              const { dest, target, start, end } = instr.operand
              registers[dest] = this.sliceArrayValue(
                registers[target],
                registers[start],
                registers[end],
              )
              break
            }

            case OpCode.IMPORT_MODULE: {
              if (!this.moduleLoader) {
                throw new Error('Module loader is not configured for lisaaBring path imports')
              }
              registers[instr.operand.dest] = await this.moduleLoader(
                instr.operand.source,
                this.currentFile,
                instr.operand.location || null,
              )
              break
            }

            case OpCode.EXPORT_NAME: {
              if (!this.moduleContext || !this.moduleContext.exports) {
                throw new Error('lisaaShare can only be used inside lisaaBox modules')
              }
              this.moduleContext.exports[instr.operand.name] = registers[instr.operand.src]
              break
            }

            case OpCode.DESTRUCTURE_DEFINE:
              this.applyDestructurePattern(
                instr.operand.pattern,
                registers[instr.operand.src],
                instr.operand.kind,
              )
              break

            case OpCode.AWAIT_VALUE: {
              const { dest, src } = instr.operand
              const resolved = await Promise.resolve(registers[src])
              registers[dest] = resolved == null ? null : resolved
              break
            }

            case OpCode.YIELD_VALUE: {
              if (!yieldBuffer) {
                throw new Error('prakritiGiveSome can only be used inside generator functions')
              }
              const yieldedValue = registers[instr.operand.src]
              yieldBuffer.push(yieldedValue == null ? null : yieldedValue)
              break
            }

            case OpCode.DEBUGGER: {
              const label =
                instr.operand && instr.operand.usesValue ? registers[instr.operand.src] : null
              this.triggerBreakpoint(label)
              break
            }

            case OpCode.CALL_NAMED: {
              const args = this.readRegisterList(registers, instr.operand.argRegs)
              const result = await this.callNamed(instr.operand.name, args)
              registers[instr.operand.dest] = result == null ? null : result
              break
            }

            case OpCode.CALL_METHOD: {
              const args = this.readRegisterList(registers, instr.operand.argRegs)
              const receiver = registers[instr.operand.receiver]
              const result = await this.callMember(receiver, instr.operand.name, args)
              registers[instr.operand.dest] = result == null ? null : result
              break
            }

            case OpCode.CALL_SUPER_METHOD: {
              const args = this.readRegisterList(registers, instr.operand.argRegs)
              const receiver = this.environment.get('priyoSelf')
              const currentMethod = this.environment.get('__priyoCurrentMethod')
              const currentOwner = this.environment.get('__priyoCurrentClass')
              if (!currentOwner || currentOwner.type !== 'class') {
                throw new Error('priyoParent call outside class method')
              }
              if (instr.operand.name === 'init' && currentMethod !== 'init') {
                throw new Error(
                  'priyoParent(...) constructor call is only allowed inside init as the first statement',
                )
              }
              if (receiver && receiver.type === 'class' && instr.operand.name === 'init') {
                throw new Error(
                  'priyoParent(...) constructor call is not allowed inside static methods',
                )
              }
              const superClass = currentOwner.superClass
              if (!superClass) {
                throw new Error(`Class "${currentOwner.name}" has no parent class`)
              }
              const result =
                receiver && receiver.type === 'class'
                  ? await this.callStaticMethod(receiver, instr.operand.name, args, superClass)
                  : await this.callMethod(receiver, instr.operand.name, args, superClass)
              registers[instr.operand.dest] = result == null ? null : result
              break
            }

            case OpCode.RETURN: {
              if (!isFunctionFrame) {
                throw new Error('Return statement cannot execute outside function')
              }
              const returnValue = registers[instr.operand.src]
              return { returned: true, value: returnValue == null ? null : returnValue }
            }

            case OpCode.HALT:
              return { returned: false, value: null }

            case OpCode.PUSH_TRY:
              tryStack.push({
                catchTarget: instr.operand.catchTarget,
                finallyTarget: instr.operand.finallyTarget,
                scopeDepth: instr.operand.scopeDepth,
                state: 'try',
                pendingException: null,
              })
              break

            case OpCode.BEGIN_CATCH: {
              const handler = tryStack[tryStack.length - 1]
              if (!handler) {
                throw new Error('No active try handler for catch block')
              }
              handler.state = 'catch'
              const caught = this.normalizeCaughtValue(handler.pendingException)
              handler.pendingException = null
              if (instr.operand) {
                this.environment.define(instr.operand, caught, 'let')
              }
              break
            }

            case OpCode.BEGIN_FINALLY: {
              const handler = tryStack[tryStack.length - 1]
              if (!handler) {
                throw new Error('No active try handler for finally block')
              }
              handler.state = 'finally'
              break
            }

            case OpCode.END_TRY: {
              const handler = tryStack.pop()
              if (!handler) {
                throw new Error('No active try handler to end')
              }
              if (handler.pendingException != null) {
                throw handler.pendingException
              }
              break
            }

            case OpCode.THROW:
              throw new PriyoThrownValue(registers[instr.operand.src])

            default:
              throw new Error(`Unknown opcode: ${instr.op}`)
          }
        } catch (caughtError) {
          let pendingException = caughtError
          let handled = false

          while (tryStack.length > 0) {
            const handler = tryStack[tryStack.length - 1]

            const unwind = scopeDepth - handler.scopeDepth
            if (unwind > 0) {
              this.unwindScopes(unwind)
              scopeDepth = handler.scopeDepth
            }

            if (handler.state === 'try') {
              if (handler.catchTarget != null) {
                handler.pendingException = pendingException
                ip = handler.catchTarget
                handled = true
                break
              }

              if (handler.finallyTarget != null) {
                handler.pendingException = pendingException
                handler.state = 'finally'
                ip = handler.finallyTarget
                handled = true
                break
              }

              tryStack.pop()
              continue
            }

            if (handler.state === 'catch') {
              if (handler.finallyTarget != null) {
                handler.pendingException = pendingException
                handler.state = 'finally'
                ip = handler.finallyTarget
                handled = true
                break
              }

              tryStack.pop()
              continue
            }

            if (handler.state === 'finally') {
              tryStack.pop()
              continue
            }

            tryStack.pop()
          }

          if (handled) {
            continue
          }

          if (pendingException && pendingException.__priyoThrown) {
            throw new Error(
              `Unhandled throw value: ${this.formatThrownValue(pendingException.value)}`,
              { cause: caughtError },
            )
          }

          throw pendingException
        }

        ip++
      }

      return { returned: false, value: null }
    } finally {
      this.sourceCallStack.pop()
      this.environment = previousEnvironment
    }
  }

  async callNamed(name, args) {
    if (this.builtins[name]) {
      return await this.builtins[name](...args)
    }

    const callee = this.environment.get(name)

    if (callee && callee.type === 'bound_method') {
      return this.callMethod(callee.receiver, callee.methodName, args)
    }
    if (callee && callee.type === 'bound_super_method') {
      return this.callMethod(callee.receiver, callee.methodName, args, callee.startClass)
    }
    if (callee && callee.type === 'bound_static_method') {
      return this.callStaticMethod(
        callee.classRef,
        callee.methodName,
        args,
        callee.startClass || null,
      )
    }

    if (!callee || callee.type !== 'user_function') {
      throw new Error(`Unknown callable: ${name}`)
    }

    if (args.length !== callee.params.length) {
      throw new Error(
        `Function "${name}" expects ${callee.params.length} args but got ${args.length}`,
      )
    }

    const callEnv = new Environment(callee.closure, { isFunctionScope: true })
    for (let i = 0; i < callee.params.length; i++) {
      callEnv.define(callee.params[i], args[i], 'let')
    }

    return this.executeUserCallable(callee, callEnv, `fn:${name}`)
  }

  async callMember(receiver, methodName, args) {
    if (receiver && receiver.type === 'class') {
      return this.callStaticMethod(receiver, methodName, args)
    }

    if (receiver && receiver.type === 'instance') {
      return this.callMethod(receiver, methodName, args)
    }

    if (receiver === this.builtins.priyoArray && this.isArrayHigherOrderHelper(methodName)) {
      return this.callArrayHigherOrderHelper(methodName, args)
    }

    if (receiver && receiver.__priyoConcurrencyRoot) {
      return this.callConcurrencyRootMethod(methodName, args)
    }

    if (receiver && receiver.__priyoConcurrencyKind === 'group') {
      return this.callConcurrencyGroupMethod(receiver, methodName, args)
    }

    if (receiver && receiver.__priyoConcurrencyKind === 'task') {
      return this.callConcurrencyTaskMethod(receiver, methodName, args)
    }

    if (receiver && receiver.__priyoConcurrencyKind === 'token') {
      return this.callConcurrencyTokenMethod(receiver, methodName, args)
    }

    if (
      receiver &&
      (receiver.__priyoHostObject || typeof receiver === 'function' || typeof receiver === 'object')
    ) {
      const member = receiver[methodName]
      if (member == null) {
        throw new Error(`Method "${methodName}" not found on this object`)
      }

      if (typeof member === 'function') {
        return await member(...args)
      }

      return this.invokeCallableValue(member, args)
    }

    throw new Error(`Method call requires an instance/class/object for "${methodName}"`)
  }

  isArrayHigherOrderHelper(methodName) {
    return ['map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every'].includes(methodName)
  }

  async callArrayHigherOrderHelper(methodName, args) {
    const arrayValue = args[0]
    const callback = args[1]

    if (!Array.isArray(arrayValue)) {
      throw new Error(`priyoArray.${methodName} expects an array as the first argument`)
    }

    if (methodName === 'reduce') {
      const hasInitial = args.length >= 3
      if (!hasInitial && arrayValue.length === 0) {
        throw new Error('priyoArray.reduce requires a non-empty array or an initial value')
      }

      let index = hasInitial ? 0 : 1
      let accumulator = hasInitial ? args[2] : arrayValue[0]
      for (; index < arrayValue.length; index++) {
        accumulator = await this.invokeCallableValue(callback, [accumulator, arrayValue[index]])
      }
      return accumulator
    }

    if (methodName === 'forEach') {
      for (let index = 0; index < arrayValue.length; index++) {
        await this.invokeCallableValue(callback, [arrayValue[index]])
      }
      return null
    }

    if (methodName === 'map') {
      const result = []
      for (let index = 0; index < arrayValue.length; index++) {
        result.push(await this.invokeCallableValue(callback, [arrayValue[index]]))
      }
      return result
    }

    if (methodName === 'filter') {
      const result = []
      for (let index = 0; index < arrayValue.length; index++) {
        const keep = await this.invokeCallableValue(callback, [arrayValue[index]])
        if (this.isTruthy(keep)) result.push(arrayValue[index])
      }
      return result
    }

    if (methodName === 'find') {
      for (let index = 0; index < arrayValue.length; index++) {
        const keep = await this.invokeCallableValue(callback, [arrayValue[index]])
        if (this.isTruthy(keep)) return arrayValue[index]
      }
      return null
    }

    if (methodName === 'some') {
      for (let index = 0; index < arrayValue.length; index++) {
        const keep = await this.invokeCallableValue(callback, [arrayValue[index]])
        if (this.isTruthy(keep)) return true
      }
      return false
    }

    if (methodName === 'every') {
      for (let index = 0; index < arrayValue.length; index++) {
        const keep = await this.invokeCallableValue(callback, [arrayValue[index]])
        if (!this.isTruthy(keep)) return false
      }
      return true
    }

    throw new Error(`Unknown priyoArray helper: ${methodName}`)
  }

  async callConcurrencyRootMethod(methodName, args) {
    switch (methodName) {
      case 'group': {
        const label = args.length > 0 && args[0] != null ? String(args[0]) : ''
        return this.createTaskGroup(label)
      }
      case 'after': {
        const delayMs = this.normalizeDelayMs(args[0], 'priyoConcurrency.after')
        const value = args.length >= 2 ? args[1] : null
        return new Promise(resolve => {
          setTimeout(() => resolve(value), delayMs)
        })
      }
      case 'token': {
        const reason = args.length > 0 && args[0] != null ? String(args[0]) : 'Task cancelled'
        return this.createCancellationToken(reason)
      }
      default:
        throw new Error(`Method "${methodName}" not found on priyoConcurrency`)
    }
  }

  async callConcurrencyGroupMethod(group, methodName, args) {
    switch (methodName) {
      case 'token':
        return group.token

      case 'run':
        return this.startGroupTask(group, args, 0)

      case 'schedule': {
        const delayMs = this.normalizeDelayMs(args[0], 'group.schedule')
        return this.startGroupTask(group, args.slice(1), delayMs)
      }

      case 'all':
        return Promise.all(group.tasks.map(task => task.promise))

      case 'cancel': {
        const reason =
          args.length > 0 && args[0] != null ? String(args[0]) : group.token.defaultReason
        this.cancelToken(group.token, reason)
        return null
      }

      case 'isCancelled':
        return group.token.cancelled

      case 'reason':
        return group.token.reason

      case 'pending':
        return group.tasks.filter(task => task.state === 'pending' || task.state === 'scheduled')
          .length

      case 'doneCount':
        return group.tasks.filter(
          task =>
            task.state === 'fulfilled' || task.state === 'rejected' || task.state === 'cancelled',
        ).length

      case 'size':
        return group.tasks.length

      default:
        throw new Error(`Method "${methodName}" not found on task group`)
    }
  }

  async callConcurrencyTaskMethod(task, methodName, args) {
    switch (methodName) {
      case 'join':
        return task.promise
      case 'status':
        return task.state
      case 'label':
        return task.label
      case 'error':
        return task.error ? this.buildCaughtErrorPayload(task.error) : null
      case 'cancel': {
        const reason =
          args.length > 0 && args[0] != null ? String(args[0]) : task.group.token.defaultReason
        this.cancelToken(task.group.token, reason)
        return null
      }
      default:
        throw new Error(`Method "${methodName}" not found on task handle`)
    }
  }

  async callConcurrencyTokenMethod(token, methodName, args) {
    switch (methodName) {
      case 'cancel': {
        const reason = args.length > 0 && args[0] != null ? String(args[0]) : token.defaultReason
        this.cancelToken(token, reason)
        return null
      }
      case 'isCancelled':
        return token.cancelled
      case 'reason':
        return token.reason
      case 'throwIfCancelled':
        if (token.cancelled) {
          throw this.createTaskCancelledError(token.reason, token.label || '')
        }
        return null
      default:
        throw new Error(`Method "${methodName}" not found on cancellation token`)
    }
  }

  createTaskGroup(label = '') {
    const token = this.createCancellationToken(
      label ? `Task group "${label}" was cancelled` : 'Task group was cancelled',
      label,
    )
    return {
      __priyoHostObject: true,
      __priyoConcurrencyKind: 'group',
      label,
      token,
      tasks: [],
      createdAt: Date.now(),
    }
  }

  createCancellationToken(defaultReason = 'Task cancelled', label = '') {
    return {
      __priyoHostObject: true,
      __priyoConcurrencyKind: 'token',
      defaultReason,
      label,
      cancelled: false,
      reason: null,
      cancelledAt: null,
    }
  }

  cancelToken(token, reason) {
    if (token.cancelled) return
    token.cancelled = true
    token.reason = reason || token.defaultReason
    token.cancelledAt = Date.now()
  }

  startGroupTask(group, args, delayMs) {
    if (args.length === 0) {
      throw new Error('Task group run/schedule requires a callable task')
    }

    const [callable, ...callArgs] = args
    const task = {
      __priyoHostObject: true,
      __priyoConcurrencyKind: 'task',
      group,
      label: this.describeTaskCallable(callable),
      state: delayMs > 0 ? 'scheduled' : 'pending',
      startedAt: null,
      finishedAt: null,
      error: null,
      result: null,
      promise: null,
    }

    const executor = async () => {
      if (group.token.cancelled) {
        task.state = 'cancelled'
        task.finishedAt = Date.now()
        throw this.createTaskCancelledError(group.token.reason, task.label)
      }

      task.state = 'pending'
      task.startedAt = Date.now()
      try {
        const result = await this.executeCallableInChild(callable, callArgs, task.label)
        if (group.token.cancelled) {
          task.state = 'cancelled'
          task.finishedAt = Date.now()
          throw this.createTaskCancelledError(group.token.reason, task.label)
        }
        task.state = 'fulfilled'
        task.result = result == null ? null : result
        task.finishedAt = Date.now()
        return task.result
      } catch (error) {
        task.error = error
        task.finishedAt = Date.now()
        if (task.state !== 'cancelled') {
          task.state = this.isTaskCancelledError(error) ? 'cancelled' : 'rejected'
        }
        throw error
      }
    }

    task.promise =
      delayMs > 0
        ? new Promise((resolve, reject) => {
            setTimeout(() => {
              executor().then(resolve).catch(reject)
            }, delayMs)
          })
        : executor()

    group.tasks.push(task)
    return task
  }

  normalizeDelayMs(value, methodName) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${methodName} expects a non-negative integer delay in milliseconds`)
    }
    return value
  }

  describeTaskCallable(callable) {
    if (callable && callable.type === 'user_function') {
      return callable.name || 'task'
    }
    if (callable && callable.type === 'bound_method') {
      return callable.methodName || 'task'
    }
    if (callable && callable.type === 'bound_super_method') {
      return callable.methodName || 'task'
    }
    if (callable && callable.type === 'bound_static_method') {
      return callable.methodName || 'task'
    }
    if (typeof callable === 'function' && callable.name) {
      return callable.name
    }
    return 'task'
  }

  createChildVm(environment) {
    return new VM([], {
      environment,
      builtins: this.builtins,
      moduleLoader: this.moduleLoader,
      currentFile: this.currentFile,
      moduleContext: this.moduleContext,
      trace: this.traceEnabled,
      traceLogger: this.traceLogger,
      traceFormat: this.traceFormat,
      traceFilter: this.traceFilter,
      debugSessionId: this.debugSessionId,
      debugHooks: this.debugHooks,
    })
  }

  async executeCallableInChild(callee, args, frameLabel) {
    if (typeof callee === 'function') {
      return await callee(...args)
    }

    const child = this.createChildVm(this.environment)

    if (callee && callee.type === 'bound_method') {
      return child.callMethod(callee.receiver, callee.methodName, args)
    }
    if (callee && callee.type === 'bound_super_method') {
      return child.callMethod(callee.receiver, callee.methodName, args, callee.startClass)
    }
    if (callee && callee.type === 'bound_static_method') {
      return child.callStaticMethod(
        callee.classRef,
        callee.methodName,
        args,
        callee.startClass || null,
      )
    }
    if (callee && callee.type === 'user_function') {
      if (args.length !== callee.params.length) {
        throw new Error(
          `Function "${frameLabel}" expects ${callee.params.length} args but got ${args.length}`,
        )
      }
      const callEnv = new Environment(callee.closure, { isFunctionScope: true })
      for (let i = 0; i < callee.params.length; i++) {
        callEnv.define(callee.params[i], args[i], 'let')
      }
      return child.executeUserCallable(callee, callEnv, `task:${frameLabel}`)
    }

    throw new Error(`Unknown callable: ${frameLabel}`)
  }

  createTaskCancelledError(reason, label = '') {
    return createRuntimeError(
      label ? `Task "${label}" cancelled: ${reason}` : `Task cancelled: ${reason}`,
      {
        code: ErrorCodes.RUNTIME.TASK_CANCELLED,
        metadata: {
          taskLabel: label || null,
          reason,
        },
      },
    )
  }

  isTaskCancelledError(error) {
    return Boolean(error && error.code === ErrorCodes.RUNTIME.TASK_CANCELLED)
  }

  async invokeCallableValue(callee, args) {
    if (typeof callee === 'function') {
      return await callee(...args)
    }

    if (callee && callee.type === 'bound_method') {
      return this.callMethod(callee.receiver, callee.methodName, args)
    }
    if (callee && callee.type === 'bound_super_method') {
      return this.callMethod(callee.receiver, callee.methodName, args, callee.startClass)
    }
    if (callee && callee.type === 'bound_static_method') {
      return this.callStaticMethod(
        callee.classRef,
        callee.methodName,
        args,
        callee.startClass || null,
      )
    }

    if (callee && callee.type === 'user_function') {
      if (args.length !== callee.params.length) {
        throw new Error(`Callback expects ${callee.params.length} args but got ${args.length}`)
      }

      const callEnv = new Environment(callee.closure, { isFunctionScope: true })
      for (let i = 0; i < callee.params.length; i++) {
        callEnv.define(callee.params[i], args[i], 'let')
      }
      return this.executeUserCallable(callee, callEnv, 'fn:<callback>')
    }

    throw new Error('Expected a callable callback function')
  }

  async callMethod(receiver, methodName, args, startClass = null) {
    if (!receiver || receiver.type !== 'instance') {
      throw new Error(`Method call requires an instance for "${methodName}"`)
    }

    const method = this.findMethod(startClass || receiver.classRef, methodName)
    if (!method) {
      throw new Error(`Method "${methodName}" not found on ${receiver.classRef.name}`)
    }

    if (args.length !== method.params.length) {
      throw new Error(
        `Method "${receiver.classRef.name}.${methodName}" expects ${method.params.length} args but got ${args.length}`,
      )
    }

    const callEnv = new Environment(method.closure, { isFunctionScope: true })
    callEnv.define('priyoSelf', receiver, 'const')
    callEnv.define('__priyoCurrentClass', method.ownerClass, 'const')
    callEnv.define('__priyoCurrentMethod', method.name, 'const')
    callEnv.define(
      '__priyoSuperMarker',
      {
        type: 'super_ref',
        receiver,
        startClass: method.ownerClass.superClass,
        isStatic: false,
      },
      'const',
    )
    for (let i = 0; i < method.params.length; i++) {
      callEnv.define(method.params[i], args[i], 'let')
    }

    return this.executeUserCallable(
      method,
      callEnv,
      `method:${receiver.classRef.name}.${methodName}`,
    )
  }

  async callStaticMethod(classRef, methodName, args, startClass = null) {
    if (!classRef || classRef.type !== 'class') {
      throw new Error(`Static method call requires a class for "${methodName}"`)
    }

    const method = this.findStaticMethod(startClass || classRef, methodName)
    if (!method) {
      throw new Error(`Static method "${methodName}" not found on ${classRef.name}`)
    }

    if (args.length !== method.params.length) {
      throw new Error(
        `Static method "${classRef.name}.${methodName}" expects ${method.params.length} args but got ${args.length}`,
      )
    }

    const callEnv = new Environment(method.closure, { isFunctionScope: true })
    callEnv.define('priyoSelf', classRef, 'const')
    callEnv.define('__priyoCurrentClass', method.ownerClass, 'const')
    callEnv.define('__priyoCurrentMethod', method.name, 'const')
    callEnv.define(
      '__priyoSuperMarker',
      {
        type: 'super_ref',
        receiver: classRef,
        startClass: method.ownerClass.superClass,
        isStatic: true,
      },
      'const',
    )
    for (let i = 0; i < method.params.length; i++) {
      callEnv.define(method.params[i], args[i], 'let')
    }

    return this.executeUserCallable(method, callEnv, `static:${classRef.name}.${methodName}`)
  }

  async executeUserCallable(callable, callEnv, frameName) {
    if (callable && callable.isGenerator) {
      const yieldBuffer = []
      await this.executeFrame(callable.instructions, callEnv, true, frameName, {
        yieldBuffer,
      })
      return this.createGeneratorHostObject(yieldBuffer)
    }

    const result = await this.executeFrame(callable.instructions, callEnv, true, frameName)
    return result.value
  }

  createGeneratorHostObject(yieldedValues) {
    let cursor = 0
    const values = Array.isArray(yieldedValues) ? yieldedValues : []

    const makeStep = (value, done) => ({
      __priyoHostObject: true,
      value: value == null ? null : value,
      done: !!done,
    })

    const generator = {
      __priyoHostObject: true,
      next: () => {
        if (cursor >= values.length) {
          return makeStep(null, true)
        }
        const value = values[cursor]
        cursor++
        return makeStep(value, false)
      },
      hasNext: () => cursor < values.length,
      reset: () => {
        cursor = 0
        return null
      },
    }

    return generator
  }

  ensureNumbers(left, right, operation) {
    if (typeof left !== 'number' || typeof right !== 'number') {
      throw new Error(`${operation} expects numeric operands`)
    }
  }

  isTruthy(value) {
    return !!value
  }

  unwindScopes(count) {
    for (let i = 0; i < count; i++) {
      if (!this.environment.parent) {
        throw new Error('Scope underflow during jump unwind')
      }
      this.environment = this.environment.parent
    }
  }

  findMethod(classObj, methodName) {
    if (!classObj) return null
    if (classObj.resolvedMethodCache && classObj.resolvedMethodCache.has(methodName)) {
      return classObj.resolvedMethodCache.get(methodName)
    }

    let cursor = classObj
    while (cursor) {
      if (cursor.methods.has(methodName)) {
        const method = cursor.methods.get(methodName)
        if (classObj.resolvedMethodCache) {
          classObj.resolvedMethodCache.set(methodName, method)
        }
        return method
      }
      cursor = cursor.superClass
    }

    if (classObj.resolvedMethodCache) {
      classObj.resolvedMethodCache.set(methodName, null)
    }
    return null
  }

  findStaticMethod(classObj, methodName) {
    if (!classObj) return null
    if (classObj.resolvedStaticMethodCache && classObj.resolvedStaticMethodCache.has(methodName)) {
      return classObj.resolvedStaticMethodCache.get(methodName)
    }

    let cursor = classObj
    while (cursor) {
      if (cursor.staticMethods && cursor.staticMethods.has(methodName)) {
        const method = cursor.staticMethods.get(methodName)
        if (classObj.resolvedStaticMethodCache) {
          classObj.resolvedStaticMethodCache.set(methodName, method)
        }
        return method
      }
      cursor = cursor.superClass
    }

    if (classObj.resolvedStaticMethodCache) {
      classObj.resolvedStaticMethodCache.set(methodName, null)
    }
    return null
  }

  collectClassChain(classObj) {
    const chain = []
    let cursor = classObj
    while (cursor) {
      chain.push(cursor)
      cursor = cursor.superClass
    }
    return chain.reverse()
  }

  async evaluateInitializer(instructions, ownerClass, receiver, isStatic) {
    const callEnv = new Environment(ownerClass.definitionEnv || this.environment, {
      isFunctionScope: true,
    })
    callEnv.define('priyoSelf', receiver, 'const')
    callEnv.define('__priyoCurrentClass', ownerClass, 'const')
    callEnv.define(
      '__priyoSuperMarker',
      {
        type: 'super_ref',
        receiver,
        startClass: ownerClass.superClass,
        isStatic,
      },
      'const',
    )
    const result = await this.executeFrame(
      instructions,
      callEnv,
      true,
      isStatic ? `init:static:${ownerClass.name}` : `init:instance:${ownerClass.name}`,
    )
    return result.value
  }

  async applyStaticFieldInitializers(classObj, staticFieldDefs) {
    classObj.strictStaticFields = staticFieldDefs.length > 0
    for (const field of staticFieldDefs) {
      const value = await this.evaluateInitializer(field.instructions, classObj, classObj, true)
      classObj.staticFields.set(field.name, value)
      classObj.staticFieldKinds.set(field.name, field.kind)
      classObj.staticFieldAccess.set(field.name, field.access || 'public')
    }
  }

  async applyInstanceFieldInitializers(instance) {
    const classChain = this.collectClassChain(instance.classRef)
    instance.classRef.strictInstanceFields = classChain.some(
      classObj => (classObj.instanceFieldInitializers || []).length > 0,
    )
    for (const classObj of classChain) {
      for (const field of classObj.instanceFieldInitializers || []) {
        const value = await this.evaluateInitializer(field.instructions, classObj, instance, false)
        instance.fields.set(field.name, value)
        const access = field.access || 'public'
        instance.fieldAccess.set(field.name, {
          access,
          ownerClass: classObj,
        })
        classObj.instanceFieldAccess.set(field.name, access)
        if (field.kind === 'const') {
          instance.constFields.add(field.name)
        } else {
          instance.constFields.delete(field.name)
        }
      }
    }
  }

  findStaticFieldOwner(classObj, propertyName) {
    // Static fields can be inherited; walk up the class chain.
    let cursor = classObj
    while (cursor) {
      if (cursor.staticFields && cursor.staticFields.has(propertyName)) {
        return cursor
      }
      cursor = cursor.superClass
    }
    return null
  }

  hasDeclaredStaticField(classObj, propertyName) {
    return this.findStaticFieldOwner(classObj, propertyName) != null
  }

  createMethodMap(methodList) {
    const methods = new Map()
    for (const method of methodList) {
      methods.set(method.name, {
        type: 'user_method',
        name: method.name,
        isAsync: !!method.isAsync,
        isGenerator: !!method.isGenerator,
        access: method.access || 'public',
        params: method.params,
        instructions: method.instructions,
        closure: this.environment,
        ownerClass: null,
      })
    }
    return methods
  }

  getCurrentAccessClass() {
    try {
      const current = this.environment.get('__priyoCurrentClass')
      return current && current.type === 'class' ? current : null
    } catch {
      return null
    }
  }

  isSubclassOf(maybeChildClass, maybeAncestorClass) {
    if (!maybeChildClass || !maybeAncestorClass) return false
    let cursor = maybeChildClass
    while (cursor) {
      if (cursor === maybeAncestorClass) return true
      cursor = cursor.superClass
    }
    return false
  }

  ensureMemberAccess(memberName, access, ownerClass, memberKind) {
    const normalizedAccess = access || 'public'
    if (normalizedAccess === 'public') return

    const currentClass = this.getCurrentAccessClass()
    if (!currentClass || !ownerClass) {
      throw new Error(
        `Cannot access ${normalizedAccess} ${memberKind} "${memberName}" from outside class`,
      )
    }

    if (normalizedAccess === 'private' && currentClass !== ownerClass) {
      throw new Error(
        `Cannot access private ${memberKind} "${memberName}" outside "${ownerClass.name}"`,
      )
    }

    if (
      normalizedAccess === 'protected' &&
      currentClass !== ownerClass &&
      !this.isSubclassOf(currentClass, ownerClass)
    ) {
      throw new Error(
        `Cannot access protected ${memberKind} "${memberName}" outside inheritance chain`,
      )
    }
  }

  resolveProperty(object, propertyName) {
    if (!object) {
      throw new Error(`Property access requires an object for "${propertyName}"`)
    }

    if (object.type === 'instance') {
      if (object.fields.has(propertyName)) {
        const fieldMeta = object.fieldAccess ? object.fieldAccess.get(propertyName) : null
        if (fieldMeta) {
          this.ensureMemberAccess(propertyName, fieldMeta.access, fieldMeta.ownerClass, 'field')
        }
        return object.fields.get(propertyName)
      }

      const method = this.findMethod(object.classRef, propertyName)
      if (method) {
        this.ensureMemberAccess(propertyName, method.access, method.ownerClass, 'method')
        return {
          type: 'bound_method',
          receiver: object,
          methodName: propertyName,
        }
      }

      throw new Error(`Property "${propertyName}" not found on ${object.classRef.name}`)
    }

    if (object.type === 'class') {
      const staticFieldOwner = this.findStaticFieldOwner(object, propertyName)
      if (staticFieldOwner) {
        this.ensureMemberAccess(
          propertyName,
          staticFieldOwner.staticFieldAccess.get(propertyName),
          staticFieldOwner,
          'static field',
        )
        return staticFieldOwner.staticFields.get(propertyName)
      }

      const staticMethod = this.findStaticMethod(object, propertyName)
      if (staticMethod) {
        this.ensureMemberAccess(
          propertyName,
          staticMethod.access,
          staticMethod.ownerClass,
          'static method',
        )
        return {
          type: 'bound_static_method',
          classRef: object,
          methodName: propertyName,
        }
      }

      throw new Error(`Static property "${propertyName}" not found on ${object.name}`)
    }

    if (object.type === 'super_ref') {
      if (!object.startClass) {
        throw new Error('priyoParent has no parent class')
      }

      if (object.isStatic) {
        const parentStaticMethod = this.findStaticMethod(object.startClass, propertyName)
        if (parentStaticMethod) {
          this.ensureMemberAccess(
            propertyName,
            parentStaticMethod.access,
            parentStaticMethod.ownerClass,
            'static method',
          )
          return {
            type: 'bound_static_method',
            classRef: object.receiver,
            methodName: propertyName,
            startClass: object.startClass,
          }
        }

        // priyoParent.someStatic should resolve from parent side, not child side.
        const superFieldOwner = this.findStaticFieldOwner(object.startClass, propertyName)
        if (superFieldOwner) {
          this.ensureMemberAccess(
            propertyName,
            superFieldOwner.staticFieldAccess.get(propertyName),
            superFieldOwner,
            'static field',
          )
          return superFieldOwner.staticFields.get(propertyName)
        }

        throw new Error(`Parent static property "${propertyName}" not found`)
      }

      if (object.receiver.fields.has(propertyName)) {
        const receiverFieldMeta = object.receiver.fieldAccess
          ? object.receiver.fieldAccess.get(propertyName)
          : null
        if (receiverFieldMeta) {
          this.ensureMemberAccess(
            propertyName,
            receiverFieldMeta.access,
            receiverFieldMeta.ownerClass,
            'field',
          )
        }
        return object.receiver.fields.get(propertyName)
      }

      const parentMethod = this.findMethod(object.startClass, propertyName)
      if (parentMethod) {
        this.ensureMemberAccess(
          propertyName,
          parentMethod.access,
          parentMethod.ownerClass,
          'method',
        )
        return {
          type: 'bound_super_method',
          receiver: object.receiver,
          methodName: propertyName,
          startClass: object.startClass,
        }
      }

      throw new Error(`Parent property "${propertyName}" not found`)
    }

    if (object.__priyoHostObject || typeof object === 'function' || typeof object === 'object') {
      if (propertyName in object) {
        return object[propertyName]
      }
      throw new Error(`Property "${propertyName}" not found on this object`)
    }

    throw new Error(`Property access is not supported on value type: ${typeof object}`)
  }

  setProperty(object, propertyName, value) {
    if (!object) {
      throw new Error(`Property assignment requires an object for "${propertyName}"`)
    }

    if (object.type === 'instance') {
      if (object.classRef.strictInstanceFields && !object.fields.has(propertyName)) {
        throw new Error(`Field "${propertyName}" is not declared on ${object.classRef.name}`)
      }
      const fieldMeta = object.fieldAccess ? object.fieldAccess.get(propertyName) : null
      if (fieldMeta) {
        this.ensureMemberAccess(propertyName, fieldMeta.access, fieldMeta.ownerClass, 'field')
      }
      if (
        object.constFields &&
        object.constFields.has(propertyName) &&
        object.fields.has(propertyName)
      ) {
        throw new Error(`Cannot reassign constant field "${propertyName}"`)
      }
      object.fields.set(propertyName, value)
      if (!fieldMeta && object.fieldAccess) {
        object.fieldAccess.set(propertyName, {
          access: 'public',
          ownerClass: object.classRef,
        })
      }
      return
    }

    if (object.type === 'class') {
      const staticFieldOwner = this.findStaticFieldOwner(object, propertyName)
      if (staticFieldOwner) {
        this.ensureMemberAccess(
          propertyName,
          staticFieldOwner.staticFieldAccess.get(propertyName),
          staticFieldOwner,
          'static field',
        )
      }
      if (object.strictStaticFields && !this.hasDeclaredStaticField(object, propertyName)) {
        throw new Error(`Static field "${propertyName}" is not declared on ${object.name}`)
      }
      if (
        object.staticFieldKinds.get(propertyName) === 'const' &&
        object.staticFields.has(propertyName)
      ) {
        throw new Error(`Cannot reassign constant static field "${propertyName}"`)
      }
      object.staticFields.set(propertyName, value)
      if (!staticFieldOwner && object.staticFieldAccess) {
        object.staticFieldAccess.set(propertyName, 'public')
      }
      return
    }

    if (object.type === 'super_ref') {
      if (object.isStatic) {
        if (!object.startClass) {
          throw new Error('priyoParent has no parent class')
        }
        if (
          object.startClass.strictStaticFields &&
          !this.hasDeclaredStaticField(object.startClass, propertyName)
        ) {
          throw new Error(`Parent static field "${propertyName}" is not declared`)
        }
        if (
          object.startClass.staticFieldKinds.get(propertyName) === 'const' &&
          object.startClass.staticFields.has(propertyName)
        ) {
          throw new Error(`Cannot reassign constant static field "${propertyName}"`)
        }
        const owner = this.findStaticFieldOwner(object.startClass, propertyName)
        if (owner) {
          this.ensureMemberAccess(
            propertyName,
            owner.staticFieldAccess.get(propertyName),
            owner,
            'static field',
          )
        }
        // Writes through priyoParent in static context target the parent class storage.
        object.startClass.staticFields.set(propertyName, value)
        if (!owner && object.startClass.staticFieldAccess) {
          object.startClass.staticFieldAccess.set(propertyName, 'public')
        }
        return
      }
      const parentFieldMeta = object.receiver.fieldAccess
        ? object.receiver.fieldAccess.get(propertyName)
        : null
      if (parentFieldMeta) {
        this.ensureMemberAccess(
          propertyName,
          parentFieldMeta.access,
          parentFieldMeta.ownerClass,
          'field',
        )
      }
      if (
        object.receiver.constFields &&
        object.receiver.constFields.has(propertyName) &&
        object.receiver.fields.has(propertyName)
      ) {
        throw new Error(`Cannot reassign constant field "${propertyName}"`)
      }
      if (
        object.receiver.classRef.strictInstanceFields &&
        !object.receiver.fields.has(propertyName)
      ) {
        throw new Error(
          `Parent field "${propertyName}" is not declared on ${object.receiver.classRef.name}`,
        )
      }
      object.receiver.fields.set(propertyName, value)
      if (!parentFieldMeta && object.receiver.fieldAccess) {
        object.receiver.fieldAccess.set(propertyName, {
          access: 'public',
          ownerClass: object.receiver.classRef,
        })
      }
      return
    }

    if (object.__priyoHostObject || typeof object === 'function' || typeof object === 'object') {
      object[propertyName] = value
      return
    }

    throw new Error(`Property assignment is not supported on value type: ${typeof object}`)
  }

  getIndexValue(target, index) {
    if (!Array.isArray(target)) {
      throw new Error('Array index access requires an array value')
    }
    const normalizedIndex = this.normalizeArrayIndex(index)
    if (normalizedIndex < 0 || normalizedIndex >= target.length) {
      throw new Error(`Array index ${normalizedIndex} is out of range (length ${target.length})`)
    }
    return target[normalizedIndex]
  }

  setIndexValue(target, index, value) {
    if (!Array.isArray(target)) {
      throw new Error('Array index assignment requires an array value')
    }
    const normalizedIndex = this.normalizeArrayIndex(index)
    if (normalizedIndex < 0 || normalizedIndex >= target.length) {
      throw new Error(`Array index ${normalizedIndex} is out of range (length ${target.length})`)
    }
    target[normalizedIndex] = value
  }

  sliceArrayValue(target, start, end) {
    if (!Array.isArray(target)) {
      throw new Error('Array slicing requires an array value')
    }

    const startIndex = this.normalizeSliceIndex(start, 'start', target.length)
    const endIndex = this.normalizeSliceIndex(end, 'end', target.length)
    return target.slice(startIndex, endIndex)
  }

  normalizeArrayIndex(index) {
    if (typeof index !== 'number' || !Number.isInteger(index)) {
      throw new Error('Array index must be an integer number')
    }
    return index
  }

  normalizeSliceIndex(index, boundName, arrayLength) {
    if (index == null) {
      return boundName === 'start' ? 0 : arrayLength
    }

    if (typeof index !== 'number' || !Number.isInteger(index)) {
      throw new Error(`Array slice ${boundName} must be an integer number`)
    }

    if (index < 0) {
      return Math.max(0, arrayLength + index)
    }

    return Math.min(arrayLength, index)
  }

  normalizeCaughtValue(exception) {
    if (exception && exception.__priyoThrown) {
      return exception.value
    }
    if (exception && typeof exception === 'object' && 'message' in exception) {
      return this.buildCaughtErrorPayload(exception)
    }
    return exception
  }

  formatThrownValue(value) {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  buildCaughtErrorPayload(exception) {
    const payload = {
      name: exception.name || 'Error',
      message: exception.message || String(exception),
      code: exception.code || null,
      stage: exception.stage || 'runtime',
      category: exception.category || null,
      metadata: exception.metadata || {},
      stack: this.normalizeStack(exception.stack),
    }

    // Mark as host object to ensure member/property access stays permissive.
    payload.__priyoHostObject = true
    return payload
  }

  normalizeStack(stackValue) {
    if (!stackValue) return []
    if (Array.isArray(stackValue)) return stackValue
    return String(stackValue)
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .slice(0, 8)
  }

  normalizeBytecode(bytecode) {
    if (Array.isArray(bytecode)) {
      return {
        instructions: bytecode,
        maxRegisters: bytecode.maxRegisters || 0,
      }
    }

    return {
      instructions: Array.isArray(bytecode && bytecode.instructions) ? bytecode.instructions : [],
      maxRegisters:
        bytecode && typeof bytecode.maxRegisters === 'number' ? bytecode.maxRegisters : 0,
    }
  }

  readRegisterList(registers, indexes) {
    if (!Array.isArray(indexes) || indexes.length === 0) return []
    const args = new Array(indexes.length)
    for (let i = 0; i < indexes.length; i++) {
      args[i] = registers[indexes[i]]
    }
    return args
  }

  registerBuiltinGlobals() {
    for (const [name, fn] of Object.entries(this.builtins)) {
      try {
        this.environment.define(name, fn, 'const')
      } catch {
        // Ignore redeclare collisions in reused environments.
      }
    }
  }

  traceInstruction(ip, instr, registers, frameName) {
    if (!this.traceEnabled && typeof this.debugHooks.onInstruction !== 'function') return
    const record = {
      seq: ++this.debugSequence,
      session: this.debugSessionId,
      ts: Date.now(),
      file: this.currentFile || '<memory>',
      frame: frameName,
      ip,
      op: instr.op,
      operand: this.formatTraceOperand(instr.operand),
      registerCount: Array.isArray(registers) ? registers.length : 0,
      stackDepth: Array.isArray(registers) ? registers.length : 0,
    }

    if (this.traceEnabled) {
      if (this.shouldTrace(record)) {
        if (this.traceFormat === 'json') {
          const line = JSON.stringify({ type: 'trace', ...record })
          if (this.traceLogger) this.traceLogger(line)
          else console.log(line)
        } else {
          const line =
            `[TRACE #${record.seq}] ${record.file} ${record.frame} ip=${record.ip} ` +
            `op=${record.op}` +
            (record.operand ? ` operand=${record.operand}` : '') +
            ` regs=${record.registerCount}`
          if (this.traceLogger) this.traceLogger(line)
          else console.log(line)
        }
      }
    }

    if (typeof this.debugHooks.onInstruction === 'function') {
      this.debugHooks.onInstruction(record)
    }
  }

  triggerBreakpoint(label) {
    const payload = {
      seq: ++this.debugSequence,
      session: this.debugSessionId,
      ts: Date.now(),
      file: this.currentFile || '<memory>',
      frame: this.sourceCallStack[this.sourceCallStack.length - 1]?.frame || '<frame>',
      label: label == null ? '' : String(label),
      sourceStack: this.getSourceStack(),
      stackDepth: this.sourceCallStack.length,
    }
    if (!this.shouldEmitBreakpoint(payload)) return
    if (this.traceFormat === 'json') {
      const line = JSON.stringify({ type: 'break', ...payload })
      if (this.traceLogger) this.traceLogger(line)
      else console.log(line)
    } else {
      const line =
        `[BREAK #${payload.seq}] ${payload.file} ${payload.frame}` +
        (payload.label ? ` label="${payload.label}"` : '')
      if (this.traceLogger) this.traceLogger(line)
      else console.log(line)
    }

    if (typeof this.debugHooks.onBreakpoint === 'function') {
      this.debugHooks.onBreakpoint(payload)
    }
  }

  shouldTrace(record) {
    if (!this.traceFilter) return true
    const filter = this.traceFilter
    if (filter.eventTypes && !filter.eventTypes.has('trace')) return false
    if (filter.opsInclude && !filter.opsInclude.has(record.op)) return false
    if (filter.opsExclude && filter.opsExclude.has(record.op)) return false
    if (filter.fileContains && !String(record.file).includes(filter.fileContains)) return false
    if (filter.frameContains && !String(record.frame).includes(filter.frameContains)) return false
    if (typeof filter.minStackDepth === 'number' && record.stackDepth < filter.minStackDepth)
      return false
    if (typeof filter.maxStackDepth === 'number' && record.stackDepth > filter.maxStackDepth)
      return false
    return true
  }

  shouldEmitBreakpoint(payload) {
    if (!this.traceFilter) return true
    const filter = this.traceFilter
    if (filter.eventTypes && !filter.eventTypes.has('break')) return false
    if (filter.fileContains && !String(payload.file).includes(filter.fileContains)) return false
    if (filter.frameContains && !String(payload.frame).includes(filter.frameContains)) return false
    if (filter.labelContains && !String(payload.label).includes(filter.labelContains)) return false
    if (typeof filter.minStackDepth === 'number' && payload.stackDepth < filter.minStackDepth)
      return false
    if (typeof filter.maxStackDepth === 'number' && payload.stackDepth > filter.maxStackDepth)
      return false
    return true
  }

  emitTraceSessionHeader() {
    if (!this.traceEnabled || this.traceSessionEmitted) return
    this.traceSessionEmitted = true
    const payload = {
      session: this.debugSessionId,
      ts: Date.now(),
      file: this.currentFile || '<memory>',
    }
    if (this.traceFormat === 'json') {
      const line = JSON.stringify({ type: 'session', ...payload })
      if (this.traceLogger) this.traceLogger(line)
      else console.log(line)
    } else {
      const line = `[TRACE SESSION] id=${payload.session} file=${payload.file}`
      if (this.traceLogger) this.traceLogger(line)
      else console.log(line)
    }
  }

  formatTraceOperand(operand) {
    if (operand == null) return ''
    if (typeof operand === 'string') return JSON.stringify(operand)
    if (typeof operand === 'number' || typeof operand === 'boolean') return String(operand)
    if (typeof operand === 'object') {
      try {
        return JSON.stringify(operand)
      } catch {
        return '[object]'
      }
    }
    return String(operand)
  }

  getSourceStack() {
    if (!Array.isArray(this.sourceCallStack) || this.sourceCallStack.length === 0) return []
    return this.sourceCallStack
      .slice()
      .reverse()
      .map(frame => `${frame.frame} @ ${frame.file}`)
  }

  applyDestructurePattern(pattern, value, kind) {
    if (!pattern) return

    if (pattern.type === 'Identifier') {
      this.environment.define(pattern.name, value == null ? null : value, kind)
      return
    }

    if (pattern.type === 'DefaultPattern') {
      let resolved = value
      if (resolved == null) {
        resolved = this.evaluateDefaultPatternValue(pattern.defaultInstructions)
      }
      this.applyDestructurePattern(pattern.target, resolved, kind)
      return
    }

    if (pattern.type === 'ArrayPattern') {
      if (!Array.isArray(value)) {
        throw new Error('Array destructuring requires an array value')
      }

      for (let index = 0; index < pattern.elements.length; index++) {
        const elementPattern = pattern.elements[index]
        if (!elementPattern) continue
        const itemValue = index < value.length ? value[index] : null
        this.applyDestructurePattern(elementPattern, itemValue, kind)
      }
      return
    }

    if (pattern.type === 'ObjectPattern') {
      if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
        throw new Error('Object destructuring requires an object value')
      }

      for (const property of pattern.properties) {
        const propertyValue = this.readDestructureProperty(value, property.key)
        this.applyDestructurePattern(property.value, propertyValue, kind)
      }
      return
    }

    throw new Error(`Unsupported destructuring pattern type: ${pattern.type}`)
  }

  evaluateDefaultPatternValue(instructions) {
    if (!instructions) return null
    const bytecode = this.normalizeBytecode(instructions)
    const defaultEnv = new Environment(this.environment, { isFunctionScope: true })
    const previous = this.environment
    this.environment = defaultEnv
    try {
      const registers = new Array(bytecode.maxRegisters || 0).fill(null)
      for (const instruction of bytecode.instructions) {
        switch (instruction.op) {
          case OpCode.LOAD_CONST:
            registers[instruction.operand.dest] = instruction.operand.value
            break
          case OpCode.LOAD_VARIABLE:
            registers[instruction.operand.dest] = this.environment.get(instruction.operand.name)
            break
          case OpCode.ADD: {
            const left = registers[instruction.operand.left]
            const right = registers[instruction.operand.right]
            registers[instruction.operand.dest] =
              typeof left === 'string' || typeof right === 'string'
                ? String(left) + String(right)
                : left + right
            break
          }
          case OpCode.SUB:
            registers[instruction.operand.dest] =
              registers[instruction.operand.left] - registers[instruction.operand.right]
            break
          case OpCode.MUL:
            registers[instruction.operand.dest] =
              registers[instruction.operand.left] * registers[instruction.operand.right]
            break
          case OpCode.DIV: {
            const divisor = registers[instruction.operand.right]
            if (divisor === 0) throw new Error('Division by zero')
            registers[instruction.operand.dest] = registers[instruction.operand.left] / divisor
            break
          }
          case OpCode.MOD: {
            const divisor = registers[instruction.operand.right]
            if (divisor === 0) throw new Error('Modulo by zero')
            registers[instruction.operand.dest] = registers[instruction.operand.left] % divisor
            break
          }
          case OpCode.RETURN:
            return registers[instruction.operand.src]
          default:
            throw new Error('Unsupported expression in destructuring default value')
        }
      }
      return null
    } finally {
      this.environment = previous
    }
  }

  readDestructureProperty(value, key) {
    if (value && value.type === 'instance') {
      if (value.fields.has(key)) return value.fields.get(key)
      return null
    }
    if (value && value.type === 'class') {
      const owner = this.findStaticFieldOwner(value, key)
      return owner ? owner.staticFields.get(key) : null
    }
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      return value[key]
    }
    return value[key] == null ? null : value[key]
  }
}

module.exports = { VM }
