const { OpCode } = require('../compiler/opcodes')
const { Environment } = require('../runtime/environment')
const { createBuiltins } = require('../runtime/builtins')

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
    this.debugHooks = options.debugHooks || {}
    this.sourceCallStack = []
    this.debugSequence = 0
    this.installDebugBuiltins()
    this.registerBuiltinGlobals()
  }

  async run() {
    await this.executeFrame(this.instructions, this.environment, false, '<main>')
  }

  async executeFrame(
    instructions,
    frameEnvironment,
    isFunctionFrame,
    frameName = '<frame>',
    executionOptions = {},
  ) {
    const previousEnvironment = this.environment
    this.environment = frameEnvironment
    this.sourceCallStack.push({
      file: this.currentFile || '<memory>',
      frame: frameName,
    })

    const stack = []
    const tryStack = []
    const yieldBuffer = Array.isArray(executionOptions.yieldBuffer)
      ? executionOptions.yieldBuffer
      : null
    let scopeDepth = 0
    let ip = 0

    try {
      while (ip < instructions.length) {
        const instr = instructions[ip]
        this.traceInstruction(ip, instr, stack, frameName)

        try {
          switch (instr.op) {
            case OpCode.PUSH_STRING:
            case OpCode.PUSH_NUMBER:
            case OpCode.PUSH_BOOLEAN:
              stack.push(instr.operand)
              break

            case OpCode.PUSH_NULL:
              stack.push(null)
              break

            case OpCode.BUILD_ARRAY: {
              const elementCount = instr.operand || 0
              if (elementCount === 0) {
                stack.push([])
                break
              }
              // Keep literal order stable: [a, b, c] should remain [a, b, c].
              stack.push(stack.splice(-elementCount))
              break
            }

            case OpCode.DEFINE_VARIABLE: {
              const value = stack.pop()
              const { name, kind } = instr.operand
              this.environment.define(name, value, kind)
              break
            }

            case OpCode.LOAD_VARIABLE: {
              const value = this.environment.get(instr.operand)
              stack.push(value)
              break
            }

            case OpCode.SET_VARIABLE: {
              const value = stack.pop()
              this.environment.set(instr.operand, value)
              break
            }

            case OpCode.ADD: {
              const right = stack.pop()
              const left = stack.pop()
              if (typeof left === 'string' || typeof right === 'string') {
                stack.push(String(left) + String(right))
                break
              }
              this.ensureNumbers(left, right, 'ADD')
              stack.push(left + right)
              break
            }

            case OpCode.SUB: {
              const right = stack.pop()
              const left = stack.pop()
              this.ensureNumbers(left, right, 'SUB')
              stack.push(left - right)
              break
            }

            case OpCode.MUL: {
              const right = stack.pop()
              const left = stack.pop()
              this.ensureNumbers(left, right, 'MUL')
              stack.push(left * right)
              break
            }

            case OpCode.DIV: {
              const right = stack.pop()
              const left = stack.pop()
              this.ensureNumbers(left, right, 'DIV')
              if (right === 0) throw new Error('Division by zero')
              stack.push(left / right)
              break
            }

            case OpCode.MOD: {
              const right = stack.pop()
              const left = stack.pop()
              this.ensureNumbers(left, right, 'MOD')
              if (right === 0) throw new Error('Modulo by zero')
              stack.push(left % right)
              break
            }

            case OpCode.EQ: {
              const right = stack.pop()
              const left = stack.pop()
              stack.push(left === right)
              break
            }

            case OpCode.NOT_EQ: {
              const right = stack.pop()
              const left = stack.pop()
              stack.push(left !== right)
              break
            }

            case OpCode.LT: {
              const right = stack.pop()
              const left = stack.pop()
              this.ensureNumbers(left, right, 'LT')
              stack.push(left < right)
              break
            }

            case OpCode.LTE: {
              const right = stack.pop()
              const left = stack.pop()
              this.ensureNumbers(left, right, 'LTE')
              stack.push(left <= right)
              break
            }

            case OpCode.GT: {
              const right = stack.pop()
              const left = stack.pop()
              this.ensureNumbers(left, right, 'GT')
              stack.push(left > right)
              break
            }

            case OpCode.GTE: {
              const right = stack.pop()
              const left = stack.pop()
              this.ensureNumbers(left, right, 'GTE')
              stack.push(left >= right)
              break
            }

            case OpCode.AND: {
              const right = stack.pop()
              const left = stack.pop()
              stack.push(this.isTruthy(left) && this.isTruthy(right))
              break
            }

            case OpCode.OR: {
              const right = stack.pop()
              const left = stack.pop()
              stack.push(this.isTruthy(left) || this.isTruthy(right))
              break
            }

            case OpCode.NOT: {
              const value = stack.pop()
              stack.push(!this.isTruthy(value))
              break
            }

            case OpCode.JUMP_IF_FALSE: {
              const condition = stack.pop()
              if (!this.isTruthy(condition)) {
                ip = instr.operand
                continue
              }
              break
            }

            case OpCode.JUMP:
              if (typeof instr.operand === 'object' && instr.operand !== null) {
                const unwind = instr.operand.unwind || 0
                this.unwindScopes(unwind)
                scopeDepth -= unwind
                ip = instr.operand.target
                continue
              }
              ip = instr.operand
              continue

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
              const { name, argc } = instr.operand
              const args = argc === 0 ? [] : stack.splice(-argc)
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

              stack.push(instance)
              break
            }

            case OpCode.GET_PROPERTY: {
              const object = stack.pop()
              const resolved = this.resolveProperty(object, instr.operand)
              stack.push(resolved)
              break
            }

            case OpCode.SET_PROPERTY: {
              const value = stack.pop()
              const object = stack.pop()
              this.setProperty(object, instr.operand, value)
              break
            }

            case OpCode.GET_INDEX: {
              const index = stack.pop()
              const target = stack.pop()
              stack.push(this.getIndexValue(target, index))
              break
            }

            case OpCode.SET_INDEX: {
              const value = stack.pop()
              const index = stack.pop()
              const target = stack.pop()
              this.setIndexValue(target, index, value)
              break
            }

            case OpCode.SLICE_ARRAY: {
              const end = stack.pop()
              const start = stack.pop()
              const target = stack.pop()
              stack.push(this.sliceArrayValue(target, start, end))
              break
            }

            case OpCode.IMPORT_MODULE: {
              if (!this.moduleLoader) {
                throw new Error('Module loader is not configured for lisaaBring path imports')
              }
              const moduleExports = await this.moduleLoader(instr.operand.source, this.currentFile)
              stack.push(moduleExports)
              break
            }

            case OpCode.EXPORT_NAME: {
              if (!this.moduleContext || !this.moduleContext.exports) {
                throw new Error('lisaaShare can only be used inside lisaaBox modules')
              }
              const value = stack.pop()
              this.moduleContext.exports[instr.operand] = value
              break
            }

            case OpCode.DESTRUCTURE_DEFINE: {
              const source = stack.pop()
              this.applyDestructurePattern(instr.operand.pattern, source, instr.operand.kind)
              break
            }

            case OpCode.AWAIT_VALUE: {
              const value = stack.pop()
              const resolved = await Promise.resolve(value)
              stack.push(resolved == null ? null : resolved)
              break
            }

            case OpCode.YIELD_VALUE: {
              if (!yieldBuffer) {
                throw new Error('prakritiGiveSome can only be used inside generator functions')
              }
              const yieldedValue = stack.pop()
              yieldBuffer.push(yieldedValue == null ? null : yieldedValue)
              break
            }

            case OpCode.CALL_NAMED: {
              const { name, argc } = instr.operand
              const args = argc === 0 ? [] : stack.splice(-argc)
              const result = await this.callNamed(name, args)
              stack.push(result == null ? null : result)
              break
            }

            case OpCode.CALL_METHOD: {
              const { name, argc } = instr.operand
              const args = argc === 0 ? [] : stack.splice(-argc)
              const receiver = stack.pop()
              const result = await this.callMember(receiver, name, args)
              stack.push(result == null ? null : result)
              break
            }

            case OpCode.CALL_SUPER_METHOD: {
              const { name, argc } = instr.operand
              const args = argc === 0 ? [] : stack.splice(-argc)
              const receiver = this.environment.get('priyoSelf')
              const currentMethod = this.environment.get('__priyoCurrentMethod')
              const currentOwner = this.environment.get('__priyoCurrentClass')
              if (!currentOwner || currentOwner.type !== 'class') {
                throw new Error('priyoParent call outside class method')
              }
              if (name === 'init' && currentMethod !== 'init') {
                throw new Error(
                  'priyoParent(...) constructor call is only allowed inside init as the first statement',
                )
              }
              if (receiver && receiver.type === 'class' && name === 'init') {
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
                  ? await this.callStaticMethod(receiver, name, args, superClass)
                  : await this.callMethod(receiver, name, args, superClass)
              stack.push(result == null ? null : result)
              break
            }

            case OpCode.RETURN: {
              if (!isFunctionFrame) {
                throw new Error('Return statement cannot execute outside function')
              }
              const returnValue = stack.pop()
              return { returned: true, value: returnValue == null ? null : returnValue }
            }

            case OpCode.POP:
              stack.pop()
              break

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

            case OpCode.THROW: {
              const thrownValue = stack.pop()
              throw new PriyoThrownValue(thrownValue)
            }

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
            stack.length = 0

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
    let cursor = classObj
    while (cursor) {
      if (cursor.methods.has(methodName)) {
        return cursor.methods.get(methodName)
      }
      cursor = cursor.superClass
    }
    return null
  }

  findStaticMethod(classObj, methodName) {
    let cursor = classObj
    while (cursor) {
      if (cursor.staticMethods && cursor.staticMethods.has(methodName)) {
        return cursor.staticMethods.get(methodName)
      }
      cursor = cursor.superClass
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

  registerBuiltinGlobals() {
    for (const [name, fn] of Object.entries(this.builtins)) {
      try {
        this.environment.define(name, fn, 'const')
      } catch {
        // Ignore redeclare collisions in reused environments.
      }
    }
  }

  installDebugBuiltins() {
    if (typeof this.builtins.priyoBreak !== 'function') {
      this.builtins.priyoBreak = label => {
        this.triggerBreakpoint(label)
        return null
      }
      this.builtins.priyoBreak.__priyoHostObject = true
    }
  }

  traceInstruction(ip, instr, stack, frameName) {
    if (!this.traceEnabled && typeof this.debugHooks.onInstruction !== 'function') return
    const record = {
      seq: ++this.debugSequence,
      file: this.currentFile || '<memory>',
      frame: frameName,
      ip,
      op: instr.op,
      operand: this.formatTraceOperand(instr.operand),
      stackDepth: stack.length,
    }

    if (this.traceEnabled) {
      const line =
        `[TRACE #${record.seq}] ${record.file} ${record.frame} ip=${record.ip} ` +
        `op=${record.op}` +
        (record.operand ? ` operand=${record.operand}` : '') +
        ` stack=${record.stackDepth}`
      if (this.traceLogger) this.traceLogger(line)
      else console.log(line)
    }

    if (typeof this.debugHooks.onInstruction === 'function') {
      this.debugHooks.onInstruction(record)
    }
  }

  triggerBreakpoint(label) {
    const payload = {
      seq: ++this.debugSequence,
      file: this.currentFile || '<memory>',
      frame: this.sourceCallStack[this.sourceCallStack.length - 1]?.frame || '<frame>',
      label: label == null ? '' : String(label),
      sourceStack: this.getSourceStack(),
    }
    const line =
      `[BREAK #${payload.seq}] ${payload.file} ${payload.frame}` +
      (payload.label ? ` label="${payload.label}"` : '')
    if (this.traceLogger) this.traceLogger(line)
    else console.log(line)

    if (typeof this.debugHooks.onBreakpoint === 'function') {
      this.debugHooks.onBreakpoint(payload)
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
    const defaultEnv = new Environment(this.environment, { isFunctionScope: true })
    const previous = this.environment
    this.environment = defaultEnv
    try {
      let stack = []
      for (const instruction of instructions) {
        if (instruction.op === OpCode.PUSH_STRING) stack.push(instruction.operand)
        else if (instruction.op === OpCode.PUSH_NUMBER) stack.push(instruction.operand)
        else if (instruction.op === OpCode.PUSH_BOOLEAN) stack.push(instruction.operand)
        else if (instruction.op === OpCode.PUSH_NULL) stack.push(null)
        else if (instruction.op === OpCode.LOAD_VARIABLE)
          stack.push(this.environment.get(instruction.operand))
        else if (instruction.op === OpCode.RETURN) return stack.pop()
        else if (instruction.op === OpCode.ADD) {
          const right = stack.pop()
          const left = stack.pop()
          stack.push(
            typeof left === 'string' || typeof right === 'string'
              ? String(left) + String(right)
              : left + right,
          )
        } else if (instruction.op === OpCode.SUB) {
          const right = stack.pop()
          const left = stack.pop()
          stack.push(left - right)
        } else if (instruction.op === OpCode.MUL) {
          const right = stack.pop()
          const left = stack.pop()
          stack.push(left * right)
        } else if (instruction.op === OpCode.DIV) {
          const right = stack.pop()
          const left = stack.pop()
          if (right === 0) throw new Error('Division by zero')
          stack.push(left / right)
        } else if (instruction.op === OpCode.MOD) {
          const right = stack.pop()
          const left = stack.pop()
          if (right === 0) throw new Error('Modulo by zero')
          stack.push(left % right)
        } else {
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
