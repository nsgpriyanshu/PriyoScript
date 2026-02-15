const { OpCode } = require('../compiler/opcodes')
const { Environment } = require('../runtime/environment')
const { createBuiltins } = require('../runtime/builtins')

class VM {
  constructor(instructions, options = {}) {
    this.instructions = instructions
    this.environment = options.environment || new Environment(null, { isFunctionScope: true })
    this.builtins = options.builtins || createBuiltins(options.io)
    this.registerBuiltinGlobals()
  }

  async run() {
    await this.executeFrame(this.instructions, this.environment, false)
  }

  async executeFrame(instructions, frameEnvironment, isFunctionFrame) {
    const previousEnvironment = this.environment
    this.environment = frameEnvironment

    const stack = []
    let ip = 0

    try {
      while (ip < instructions.length) {
        const instr = instructions[ip]

        switch (instr.op) {
          case OpCode.PUSH_STRING:
          case OpCode.PUSH_NUMBER:
          case OpCode.PUSH_BOOLEAN:
            stack.push(instr.operand)
            break

          case OpCode.PUSH_NULL:
            stack.push(null)
            break

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
              this.unwindScopes(instr.operand.unwind || 0)
              ip = instr.operand.target
              continue
            }
            ip = instr.operand
            continue

          case OpCode.ENTER_SCOPE:
            this.environment = new Environment(this.environment, { isFunctionScope: false })
            break

          case OpCode.EXIT_SCOPE:
            if (!this.environment.parent) throw new Error('Cannot exit global scope')
            this.environment = this.environment.parent
            break

          case OpCode.DEFINE_FUNCTION: {
            const fnObj = {
              type: 'user_function',
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
              instanceFieldInitializers: instr.operand.instanceFields || [],
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
            const currentOwner = this.environment.get('__priyoCurrentClass')
            if (!currentOwner || currentOwner.type !== 'class') {
              throw new Error('priyoParent call outside class method')
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

          default:
            throw new Error(`Unknown opcode: ${instr.op}`)
        }

        ip++
      }

      return { returned: false, value: null }
    } finally {
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

    const result = await this.executeFrame(callee.instructions, callEnv, true)
    return result.value
  }

  async callMember(receiver, methodName, args) {
    if (receiver && receiver.type === 'class') {
      return this.callStaticMethod(receiver, methodName, args)
    }

    if (receiver && receiver.type === 'instance') {
      return this.callMethod(receiver, methodName, args)
    }

    if (
      receiver &&
      (receiver.__priyoHostObject || typeof receiver === 'function' || typeof receiver === 'object')
    ) {
      const fn = receiver[methodName]
      if (typeof fn !== 'function') {
        throw new Error(`Method "${methodName}" not found on this object`)
      }
      return await fn(...args)
    }

    throw new Error(`Method call requires an instance/class/object for "${methodName}"`)
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

    const result = await this.executeFrame(method.instructions, callEnv, true)
    return result.value
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

    const result = await this.executeFrame(method.instructions, callEnv, true)
    return result.value
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
    const result = await this.executeFrame(instructions, callEnv, true)
    return result.value
  }

  async applyStaticFieldInitializers(classObj, staticFieldDefs) {
    for (const field of staticFieldDefs) {
      const value = await this.evaluateInitializer(field.instructions, classObj, classObj, true)
      classObj.staticFields.set(field.name, value)
      classObj.staticFieldKinds.set(field.name, field.kind)
    }
  }

  async applyInstanceFieldInitializers(instance) {
    const classChain = this.collectClassChain(instance.classRef)
    for (const classObj of classChain) {
      for (const field of classObj.instanceFieldInitializers || []) {
        const value = await this.evaluateInitializer(field.instructions, classObj, instance, false)
        instance.fields.set(field.name, value)
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

  createMethodMap(methodList) {
    const methods = new Map()
    for (const method of methodList) {
      methods.set(method.name, {
        type: 'user_method',
        name: method.name,
        params: method.params,
        instructions: method.instructions,
        closure: this.environment,
        ownerClass: null,
      })
    }
    return methods
  }

  resolveProperty(object, propertyName) {
    if (!object) {
      throw new Error(`Property access requires an object for "${propertyName}"`)
    }

    if (object.type === 'instance') {
      if (object.fields.has(propertyName)) {
        return object.fields.get(propertyName)
      }

      if (this.findMethod(object.classRef, propertyName)) {
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
        return staticFieldOwner.staticFields.get(propertyName)
      }

      if (this.findStaticMethod(object, propertyName)) {
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
        if (this.findStaticMethod(object.startClass, propertyName)) {
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
          return superFieldOwner.staticFields.get(propertyName)
        }

        throw new Error(`Parent static property "${propertyName}" not found`)
      }

      if (object.receiver.fields.has(propertyName)) {
        return object.receiver.fields.get(propertyName)
      }

      if (this.findMethod(object.startClass, propertyName)) {
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
      if (
        object.constFields &&
        object.constFields.has(propertyName) &&
        object.fields.has(propertyName)
      ) {
        throw new Error(`Cannot reassign constant field "${propertyName}"`)
      }
      object.fields.set(propertyName, value)
      return
    }

    if (object.type === 'class') {
      if (
        object.staticFieldKinds.get(propertyName) === 'const' &&
        object.staticFields.has(propertyName)
      ) {
        throw new Error(`Cannot reassign constant static field "${propertyName}"`)
      }
      object.staticFields.set(propertyName, value)
      return
    }

    if (object.type === 'super_ref') {
      if (object.isStatic) {
        if (!object.startClass) {
          throw new Error('priyoParent has no parent class')
        }
        if (
          object.startClass.staticFieldKinds.get(propertyName) === 'const' &&
          object.startClass.staticFields.has(propertyName)
        ) {
          throw new Error(`Cannot reassign constant static field "${propertyName}"`)
        }
        // Writes through priyoParent in static context target the parent class storage.
        object.startClass.staticFields.set(propertyName, value)
        return
      }
      if (
        object.receiver.constFields &&
        object.receiver.constFields.has(propertyName) &&
        object.receiver.fields.has(propertyName)
      ) {
        throw new Error(`Cannot reassign constant field "${propertyName}"`)
      }
      object.receiver.fields.set(propertyName, value)
      return
    }

    if (object.__priyoHostObject || typeof object === 'function' || typeof object === 'object') {
      object[propertyName] = value
      return
    }

    throw new Error(`Property assignment is not supported on value type: ${typeof object}`)
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
}

module.exports = { VM }
