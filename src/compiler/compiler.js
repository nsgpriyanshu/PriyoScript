const { OpCode } = require('./opcodes')
const { TokenType } = require('../lexer/token')

class Compiler {
  constructor() {
    this.instructions = []
    this.loopStack = []
    this.breakStack = []
    this.scopeDepth = 0
    this.tempCounter = 0
    this.interfaceTable = new Map()
    this.freeRegisters = []
    this.nextRegister = 0
    this.maxRegisters = 0
  }

  compile(program) {
    const root = program.root || program.entry
    if (!root || (root.type !== 'EntryBlock' && root.type !== 'PackageBlock')) {
      throw new Error('Invalid AST: missing root block')
    }

    this.collectInterfaces(root.body)

    for (const stmt of root.body) {
      this.compileStatement(stmt)
    }

    this.emit(OpCode.HALT)
    return this.finalizeInstructions()
  }

  compileStatement(stmt) {
    this.withRegisterScope(() => {
      switch (stmt.type) {
        case 'VariableDeclaration':
          this.compileVariableDeclaration(stmt)
          return

        case 'AssignmentStatement':
          this.compileAssignmentStatement(stmt)
          return

        case 'IfStatement':
          this.compileIfStatement(stmt)
          return

        case 'WhileStatement':
          this.compileWhileStatement(stmt)
          return

        case 'ForStatement':
          this.compileForStatement(stmt)
          return

        case 'ForEachStatement':
          this.compileForEachStatement(stmt)
          return

        case 'SwitchStatement':
          this.compileSwitchStatement(stmt)
          return

        case 'BreakStatement':
          this.compileBreakStatement()
          return

        case 'ContinueStatement':
          this.compileContinueStatement()
          return

        case 'DebuggerStatement':
          this.compileDebuggerStatement(stmt)
          return

        case 'FunctionDeclaration':
          this.compileFunctionDeclaration(stmt)
          return

        case 'ImportStatement':
          this.compileImportStatement(stmt)
          return

        case 'ExportStatement':
          this.compileExportStatement(stmt)
          return

        case 'TryStatement':
          this.compileTryStatement(stmt)
          return

        case 'ThrowStatement':
          this.compileThrowStatement(stmt)
          return

        case 'ClassDeclaration':
          this.compileClassDeclaration(stmt)
          return

        case 'InterfaceDeclaration':
          return

        case 'ReturnStatement':
          this.compileReturnStatement(stmt)
          return

        case 'YieldStatement':
          this.compileYieldStatement(stmt)
          return

        case 'ExpressionStatement': {
          const resultReg = this.compileExpression(stmt.expression)
          this.releaseRegister(resultReg)
          return
        }

        default:
          throw new Error(`Unknown statement type: ${stmt.type}`)
      }
    })
  }

  compileVariableDeclaration(stmt) {
    if (stmt.identifier.type !== 'Identifier') {
      this.compileDestructuringDeclaration(stmt)
      return
    }

    const initializerReg = this.compileExpression(stmt.initializer)
    this.emit(OpCode.DEFINE_VARIABLE, {
      name: stmt.identifier.name,
      kind: stmt.kind,
      src: initializerReg,
    })
    this.releaseRegister(initializerReg)
  }

  compileDestructuringDeclaration(stmt) {
    const initializerReg = this.compileExpression(stmt.initializer)
    this.emit(OpCode.DESTRUCTURE_DEFINE, {
      kind: stmt.kind,
      pattern: this.serializeBindingPattern(stmt.identifier),
      src: initializerReg,
    })
    this.releaseRegister(initializerReg)
  }

  compileAssignmentStatement(stmt) {
    if (stmt.identifier.type === 'Identifier') {
      const valueReg = this.compileExpression(stmt.value)
      this.emit(OpCode.SET_VARIABLE, {
        name: stmt.identifier.name,
        src: valueReg,
      })
      this.releaseRegister(valueReg)
      return
    }

    if (stmt.identifier.type === 'MemberExpression') {
      const objectReg = this.compileExpression(stmt.identifier.object)
      const valueReg = this.compileExpression(stmt.value)
      this.emit(OpCode.SET_PROPERTY, {
        object: objectReg,
        name: stmt.identifier.property.name,
        src: valueReg,
      })
      this.releaseRegister(objectReg)
      this.releaseRegister(valueReg)
      return
    }

    if (stmt.identifier.type === 'IndexExpression') {
      const objectReg = this.compileExpression(stmt.identifier.object)
      const indexReg = this.compileExpression(stmt.identifier.index)
      const valueReg = this.compileExpression(stmt.value)
      this.emit(OpCode.SET_INDEX, {
        target: objectReg,
        index: indexReg,
        src: valueReg,
      })
      this.releaseRegister(objectReg)
      this.releaseRegister(indexReg)
      this.releaseRegister(valueReg)
      return
    }

    throw new Error(`Invalid assignment target: ${stmt.identifier.type}`)
  }

  compileBlockStatement(block) {
    this.emit(OpCode.ENTER_SCOPE)
    this.scopeDepth++

    for (const stmt of block.statements) {
      this.compileStatement(stmt)
    }

    this.emit(OpCode.EXIT_SCOPE)
    this.scopeDepth--
  }

  compileIfStatement(stmt) {
    const endJumps = []

    for (const branch of stmt.branches) {
      const conditionReg = this.compileExpression(branch.condition)
      const jumpIfFalseIndex = this.emit(OpCode.JUMP_IF_FALSE, {
        condition: conditionReg,
        target: -1,
      })
      this.releaseRegister(conditionReg)

      this.compileBlockStatement(branch.body)
      endJumps.push(this.emit(OpCode.JUMP, -1))
      this.patchJump(jumpIfFalseIndex, this.instructions.length)
    }

    if (stmt.alternate) {
      this.compileBlockStatement(stmt.alternate)
    }

    const endAddress = this.instructions.length
    for (const jumpIndex of endJumps) {
      this.patchJump(jumpIndex, endAddress)
    }
  }

  compileWhileStatement(stmt) {
    const loopStart = this.instructions.length
    const loopContext = this.enterLoop({
      continueTarget: loopStart,
      continueTargetScopeDepth: this.scopeDepth,
      loopScopeDepth: this.scopeDepth,
    })

    const conditionReg = this.compileExpression(stmt.condition)
    const exitJump = this.emit(OpCode.JUMP_IF_FALSE, {
      condition: conditionReg,
      target: -1,
    })
    this.releaseRegister(conditionReg)

    this.compileBlockStatement(stmt.body)
    this.emit(OpCode.JUMP, loopStart)

    const endAddress = this.instructions.length
    this.patchJump(exitJump, endAddress)
    this.patchLoopBreaks(loopContext, endAddress, loopContext.loopScopeDepth)
    this.leaveLoop()
  }

  compileForStatement(stmt) {
    if (stmt.initializer) {
      this.compileStatement(stmt.initializer)
    }

    const loopStart = this.instructions.length
    const loopContext = this.enterLoop({
      continueTarget: null,
      continueTargetScopeDepth: null,
      loopScopeDepth: this.scopeDepth,
    })

    let exitJump = null
    if (stmt.condition) {
      const conditionReg = this.compileExpression(stmt.condition)
      exitJump = this.emit(OpCode.JUMP_IF_FALSE, {
        condition: conditionReg,
        target: -1,
      })
      this.releaseRegister(conditionReg)
    }

    this.compileBlockStatement(stmt.body)

    const updateStart = this.instructions.length
    const continueTarget = stmt.update ? updateStart : loopStart
    this.patchLoopContinues(loopContext, continueTarget, this.scopeDepth)

    if (stmt.update) {
      this.compileStatement(stmt.update)
    }

    this.emit(OpCode.JUMP, loopStart)

    const endAddress = this.instructions.length
    if (exitJump != null) {
      this.patchJump(exitJump, endAddress)
    }
    this.patchLoopBreaks(loopContext, endAddress, loopContext.loopScopeDepth)
    this.leaveLoop()
  }

  compileForEachStatement(stmt) {
    const arrayTempName = this.nextTempName('__forEachArray')
    const indexTempName = this.nextTempName('__forEachIndex')

    const iterableReg = this.compileExpression(stmt.iterable)
    this.emit(OpCode.DEFINE_VARIABLE, {
      name: arrayTempName,
      kind: 'const',
      src: iterableReg,
    })
    this.releaseRegister(iterableReg)

    const zeroReg = this.emitLoadConst(0)
    this.emit(OpCode.DEFINE_VARIABLE, {
      name: indexTempName,
      kind: 'let',
      src: zeroReg,
    })
    this.releaseRegister(zeroReg)

    const loopStart = this.instructions.length
    const loopContext = this.enterLoop({
      continueTarget: null,
      continueTargetScopeDepth: null,
      loopScopeDepth: this.scopeDepth,
    })

    const indexReg = this.emitLoadVariable(indexTempName)
    const arrayReg = this.emitLoadVariable(arrayTempName)
    const lengthReg = this.allocateRegister()
    this.emit(OpCode.GET_PROPERTY, {
      dest: lengthReg,
      object: arrayReg,
      name: 'length',
    })
    this.releaseRegister(arrayReg)

    const conditionReg = this.emitBinaryRegisterOp(OpCode.LT, indexReg, lengthReg)
    const exitJump = this.emit(OpCode.JUMP_IF_FALSE, {
      condition: conditionReg,
      target: -1,
    })
    this.releaseRegister(conditionReg)

    this.emit(OpCode.ENTER_SCOPE)
    this.scopeDepth++

    const loopArrayReg = this.emitLoadVariable(arrayTempName)
    const loopIndexReg = this.emitLoadVariable(indexTempName)
    const itemReg = this.allocateRegister()
    this.emit(OpCode.GET_INDEX, {
      dest: itemReg,
      target: loopArrayReg,
      index: loopIndexReg,
    })
    this.releaseRegister(loopArrayReg)
    this.releaseRegister(loopIndexReg)
    this.emit(OpCode.DEFINE_VARIABLE, {
      name: stmt.item.name,
      kind: 'const',
      src: itemReg,
    })
    this.releaseRegister(itemReg)

    for (const bodyStatement of stmt.body.statements) {
      this.compileStatement(bodyStatement)
    }

    this.emit(OpCode.EXIT_SCOPE)
    this.scopeDepth--

    const updateStart = this.instructions.length
    this.patchLoopContinues(loopContext, updateStart, this.scopeDepth)

    const currentIndexReg = this.emitLoadVariable(indexTempName)
    const oneReg = this.emitLoadConst(1)
    const nextIndexReg = this.emitBinaryRegisterOp(OpCode.ADD, currentIndexReg, oneReg)
    this.emit(OpCode.SET_VARIABLE, {
      name: indexTempName,
      src: nextIndexReg,
    })
    this.releaseRegister(nextIndexReg)

    this.emit(OpCode.JUMP, loopStart)

    const endAddress = this.instructions.length
    this.patchJump(exitJump, endAddress)
    this.patchLoopBreaks(loopContext, endAddress, loopContext.loopScopeDepth)
    this.leaveLoop()
  }

  compileSwitchStatement(stmt) {
    const enclosingScopeDepth = this.scopeDepth
    this.emit(OpCode.ENTER_SCOPE)
    this.scopeDepth++

    const switchTempName = this.nextTempName('__switchValue')
    const discriminantReg = this.compileExpression(stmt.discriminant)
    this.emit(OpCode.DEFINE_VARIABLE, {
      name: switchTempName,
      kind: 'const',
      src: discriminantReg,
    })
    this.releaseRegister(discriminantReg)

    const switchContext = this.enterSwitch({
      breakTargetScopeDepth: enclosingScopeDepth,
    })

    const endJumps = []
    let pendingCaseFalseJump = null

    for (const switchCase of stmt.cases) {
      const caseCheckStart = this.instructions.length
      if (pendingCaseFalseJump != null) {
        this.patchJump(pendingCaseFalseJump, caseCheckStart)
      }

      const switchValueReg = this.emitLoadVariable(switchTempName)
      const testReg = this.compileExpression(switchCase.test)
      const compareReg = this.emitBinaryRegisterOp(OpCode.EQ, switchValueReg, testReg)
      const jumpIfFalse = this.emit(OpCode.JUMP_IF_FALSE, {
        condition: compareReg,
        target: -1,
      })
      this.releaseRegister(compareReg)
      pendingCaseFalseJump = jumpIfFalse

      this.compileBlockStatement(switchCase.consequent)
      endJumps.push(this.emit(OpCode.JUMP, -1))
    }

    const defaultStart = this.instructions.length
    if (pendingCaseFalseJump != null) {
      this.patchJump(pendingCaseFalseJump, defaultStart)
    }

    if (stmt.defaultCase) {
      this.compileBlockStatement(stmt.defaultCase)
    }

    this.emit(OpCode.EXIT_SCOPE)
    this.scopeDepth--

    const endAddress = this.instructions.length
    for (const jump of endJumps) {
      this.patchJump(jump, endAddress)
    }
    this.patchSwitchBreaks(switchContext, endAddress, enclosingScopeDepth)
    this.leaveSwitch()
  }

  compileBreakStatement() {
    const breakContext = this.currentBreakContext()
    if (!breakContext) {
      throw new Error('prakritiStop used outside loop/switch')
    }
    const jumpIndex = this.emit(OpCode.JUMP, -1)
    breakContext.breakJumps.push({ jumpIndex, scopeDepthAtEmit: this.scopeDepth })
  }

  compileContinueStatement() {
    const loopContext = this.currentLoop()
    if (!loopContext) {
      throw new Error('prakritiGoOn used outside loop')
    }

    if (loopContext.continueTarget != null) {
      this.emitScopedJump(loopContext.continueTarget, loopContext.continueTargetScopeDepth)
      return
    }

    const jumpIndex = this.emit(OpCode.JUMP, -1)
    loopContext.continueJumps.push({ jumpIndex, scopeDepthAtEmit: this.scopeDepth })
  }

  compileDebuggerStatement(stmt) {
    const sourceReg = stmt.argument ? this.compileExpression(stmt.argument) : null
    this.emit(OpCode.DEBUGGER, {
      src: sourceReg,
      usesValue: Boolean(stmt.argument),
    })
    this.releaseRegister(sourceReg)
  }

  compileFunctionDeclaration(stmt) {
    this.emit(OpCode.DEFINE_FUNCTION, {
      name: stmt.name.name,
      isAsync: !!stmt.isAsync,
      isGenerator: !!stmt.isGenerator,
      params: stmt.params.map(param => param.name),
      instructions: this.compileCallableBody(stmt.body),
    })
  }

  compileImportStatement(stmt) {
    if (stmt.sourceType === 'string') {
      const moduleReg = this.allocateRegister()
      this.emit(OpCode.IMPORT_MODULE, {
        dest: moduleReg,
        source: stmt.source,
        location: stmt.location || null,
      })

      if (stmt.namedImports && stmt.namedImports.length > 0) {
        for (const specifier of stmt.namedImports) {
          const propertyReg = this.allocateRegister()
          this.emit(OpCode.GET_PROPERTY, {
            dest: propertyReg,
            object: moduleReg,
            name: specifier.imported,
          })
          this.emit(OpCode.DEFINE_VARIABLE, {
            name: specifier.local,
            kind: 'const',
            src: propertyReg,
          })
          this.releaseRegister(propertyReg)
        }
        this.releaseRegister(moduleReg)
      } else {
        this.emit(OpCode.DEFINE_VARIABLE, {
          name: stmt.localName,
          kind: 'const',
          src: moduleReg,
        })
        this.releaseRegister(moduleReg)
      }
      return
    }

    const packageReg = this.emitLoadVariable('priyoPackage')
    const sourceReg = this.emitLoadConst(stmt.source)
    const importReg = this.allocateRegister()
    this.emit(OpCode.CALL_METHOD, {
      dest: importReg,
      receiver: packageReg,
      name: 'use',
      argRegs: [sourceReg],
    })
    this.releaseRegister(packageReg)
    this.releaseRegister(sourceReg)

    if (stmt.namedImports && stmt.namedImports.length > 0) {
      for (const specifier of stmt.namedImports) {
        const propertyReg = this.allocateRegister()
        this.emit(OpCode.GET_PROPERTY, {
          dest: propertyReg,
          object: importReg,
          name: specifier.imported,
        })
        this.emit(OpCode.DEFINE_VARIABLE, {
          name: specifier.local,
          kind: 'const',
          src: propertyReg,
        })
        this.releaseRegister(propertyReg)
      }
      this.releaseRegister(importReg)
    } else {
      this.emit(OpCode.DEFINE_VARIABLE, {
        name: stmt.localName,
        kind: 'const',
        src: importReg,
      })
      this.releaseRegister(importReg)
    }
  }

  compileExportStatement(stmt) {
    const valueReg = this.emitLoadVariable(stmt.identifier.name)
    this.emit(OpCode.EXPORT_NAME, {
      name: stmt.identifier.name,
      src: valueReg,
    })
    this.releaseRegister(valueReg)
  }

  compileTryStatement(stmt) {
    const tryHandlerIndex = this.emit(OpCode.PUSH_TRY, {
      catchTarget: null,
      finallyTarget: null,
      scopeDepth: this.scopeDepth,
    })

    this.compileBlockStatement(stmt.block)

    let jumpAfterTry = null
    let jumpAfterCatch = null
    if (stmt.handler || stmt.finalizer) {
      jumpAfterTry = this.emit(OpCode.JUMP, -1)
    }

    let catchStart = null
    if (stmt.handler) {
      catchStart = this.instructions.length
      this.emit(OpCode.ENTER_SCOPE)
      this.scopeDepth++
      this.emit(OpCode.BEGIN_CATCH, stmt.handler.param ? stmt.handler.param.name : null)
      for (const catchStatement of stmt.handler.body.statements) {
        this.compileStatement(catchStatement)
      }
      this.emit(OpCode.EXIT_SCOPE)
      this.scopeDepth--

      if (stmt.finalizer) {
        jumpAfterCatch = this.emit(OpCode.JUMP, -1)
      }
    }

    let finallyStart = null
    if (stmt.finalizer) {
      finallyStart = this.instructions.length
      this.emit(OpCode.BEGIN_FINALLY)
      this.compileBlockStatement(stmt.finalizer)
    }

    const endTryStart = this.instructions.length
    this.emit(OpCode.END_TRY)
    const endAddress = this.instructions.length

    const tryHandler = this.instructions[tryHandlerIndex].operand
    tryHandler.catchTarget = catchStart
    tryHandler.finallyTarget = finallyStart

    if (jumpAfterTry != null) {
      this.patchJump(jumpAfterTry, stmt.finalizer ? finallyStart : endTryStart)
    }
    if (jumpAfterCatch != null) {
      this.patchJump(jumpAfterCatch, finallyStart)
    }

    if (endAddress == null) {
      throw new Error('Failed to compile try/catch/finally end label')
    }
  }

  compileThrowStatement(stmt) {
    const argumentReg = this.compileExpression(stmt.argument)
    this.emit(OpCode.THROW, { src: argumentReg })
    this.releaseRegister(argumentReg)
  }

  compileClassDeclaration(stmt) {
    this.assertConstructorSuperRules(stmt)
    this.assertImplementsRules(stmt)

    const instanceMethods = stmt.methods
      .filter(method => !method.isStatic)
      .map(method => ({
        name: method.name.name,
        isAsync: !!method.isAsync,
        isGenerator: !!method.isGenerator,
        access: method.access || 'public',
        params: method.params.map(param => param.name),
        instructions: this.compileCallableBody(method.body),
      }))

    const staticMethods = stmt.methods
      .filter(method => method.isStatic)
      .map(method => ({
        name: method.name.name,
        isAsync: !!method.isAsync,
        isGenerator: !!method.isGenerator,
        access: method.access || 'public',
        params: method.params.map(param => param.name),
        instructions: this.compileCallableBody(method.body),
      }))

    const instanceFields = (stmt.fields || [])
      .filter(field => !field.isStatic)
      .map(field => ({
        name: field.name.name,
        kind: field.kind,
        access: field.access || 'public',
        instructions: this.compileInitializerThunk(field.initializer),
      }))

    const staticFields = (stmt.fields || [])
      .filter(field => field.isStatic)
      .map(field => ({
        name: field.name.name,
        kind: field.kind,
        access: field.access || 'public',
        instructions: this.compileInitializerThunk(field.initializer),
      }))

    this.emit(OpCode.DEFINE_CLASS, {
      name: stmt.name.name,
      superClassName: stmt.superClass ? stmt.superClass.name : null,
      methods: instanceMethods,
      staticMethods,
      instanceFields,
      staticFields,
    })
  }

  compileCallableBody(bodyBlock) {
    const callableCompiler = new Compiler()
    callableCompiler.compileBlockStatement(bodyBlock)
    const nullReg = callableCompiler.emitLoadConst(null)
    callableCompiler.emit(OpCode.RETURN, { src: nullReg })
    callableCompiler.releaseRegister(nullReg)
    return callableCompiler.finalizeInstructions()
  }

  compileInitializerThunk(initializerExpression) {
    const initializerCompiler = new Compiler()
    const valueReg = initializerCompiler.compileExpression(initializerExpression)
    initializerCompiler.emit(OpCode.RETURN, { src: valueReg })
    initializerCompiler.releaseRegister(valueReg)
    return initializerCompiler.finalizeInstructions()
  }

  compileReturnStatement(stmt) {
    const valueReg = stmt.argument
      ? this.compileExpression(stmt.argument)
      : this.emitLoadConst(null)
    this.emit(OpCode.RETURN, { src: valueReg })
    this.releaseRegister(valueReg)
  }

  compileYieldStatement(stmt) {
    const valueReg = stmt.argument
      ? this.compileExpression(stmt.argument)
      : this.emitLoadConst(null)
    this.emit(OpCode.YIELD_VALUE, { src: valueReg })
    this.releaseRegister(valueReg)
  }

  compileExpression(expr) {
    switch (expr.type) {
      case 'StringLiteral':
      case 'NumberLiteral':
      case 'BooleanLiteral':
        return this.emitLoadConst(expr.value)

      case 'NullLiteral':
        return this.emitLoadConst(null)

      case 'ArrayLiteral': {
        const elementRegs = expr.elements.map(element => this.compileExpression(element))
        const dest = this.allocateRegister()
        this.emit(OpCode.BUILD_ARRAY, {
          dest,
          elements: elementRegs,
        })
        for (const reg of elementRegs) {
          this.releaseRegister(reg)
        }
        return dest
      }

      case 'Identifier':
        return this.emitLoadVariable(expr.name)

      case 'ThisExpression':
        return this.emitLoadVariable('priyoSelf')

      case 'SuperExpression':
        return this.emitLoadVariable('__priyoSuperMarker')

      case 'MemberExpression': {
        const objectReg = this.compileExpression(expr.object)
        const dest = this.allocateRegister()
        this.emit(OpCode.GET_PROPERTY, {
          dest,
          object: objectReg,
          name: expr.property.name,
        })
        this.releaseRegister(objectReg)
        return dest
      }

      case 'IndexExpression': {
        const objectReg = this.compileExpression(expr.object)
        const indexReg = this.compileExpression(expr.index)
        const dest = this.allocateRegister()
        this.emit(OpCode.GET_INDEX, {
          dest,
          target: objectReg,
          index: indexReg,
        })
        this.releaseRegister(objectReg)
        this.releaseRegister(indexReg)
        return dest
      }

      case 'SliceExpression': {
        const objectReg = this.compileExpression(expr.object)
        const startReg = expr.start ? this.compileExpression(expr.start) : this.emitLoadConst(null)
        const endReg = expr.end ? this.compileExpression(expr.end) : this.emitLoadConst(null)
        const dest = this.allocateRegister()
        this.emit(OpCode.SLICE_ARRAY, {
          dest,
          target: objectReg,
          start: startReg,
          end: endReg,
        })
        this.releaseRegister(objectReg)
        this.releaseRegister(startReg)
        this.releaseRegister(endReg)
        return dest
      }

      case 'CallExpression':
        return this.compileCallExpression(expr)

      case 'NewExpression':
        return this.compileNewExpression(expr)

      case 'BinaryExpression':
        return this.compileBinaryExpression(expr)

      case 'UnaryExpression':
        return this.compileUnaryExpression(expr)

      case 'AwaitExpression': {
        const sourceReg = this.compileExpression(expr.argument)
        const dest = this.allocateRegister()
        this.emit(OpCode.AWAIT_VALUE, { dest, src: sourceReg })
        this.releaseRegister(sourceReg)
        return dest
      }

      default:
        throw new Error(`Unknown expression type: ${expr.type}`)
    }
  }

  compileCallExpression(expr) {
    if (expr.callee.type === 'Identifier') {
      const argRegs = expr.arguments.map(arg => this.compileExpression(arg))
      const dest = this.allocateRegister()
      this.emit(OpCode.CALL_NAMED, {
        dest,
        name: expr.callee.name,
        argRegs,
      })
      this.releaseRegisters(argRegs)
      return dest
    }

    if (expr.callee.type === 'SuperExpression') {
      const argRegs = expr.arguments.map(arg => this.compileExpression(arg))
      const dest = this.allocateRegister()
      this.emit(OpCode.CALL_SUPER_METHOD, {
        dest,
        name: 'init',
        argRegs,
      })
      this.releaseRegisters(argRegs)
      return dest
    }

    if (expr.callee.type === 'MemberExpression') {
      if (expr.callee.object.type === 'SuperExpression') {
        const argRegs = expr.arguments.map(arg => this.compileExpression(arg))
        const dest = this.allocateRegister()
        this.emit(OpCode.CALL_SUPER_METHOD, {
          dest,
          name: expr.callee.property.name,
          argRegs,
        })
        this.releaseRegisters(argRegs)
        return dest
      }

      const receiverReg = this.compileExpression(expr.callee.object)
      const argRegs = expr.arguments.map(arg => this.compileExpression(arg))
      const dest = this.allocateRegister()
      this.emit(OpCode.CALL_METHOD, {
        dest,
        receiver: receiverReg,
        name: expr.callee.property.name,
        argRegs,
      })
      this.releaseRegister(receiverReg)
      this.releaseRegisters(argRegs)
      return dest
    }

    throw new Error(`Unsupported call target: ${expr.callee.type}`)
  }

  compileNewExpression(expr) {
    if (expr.callee.type !== 'Identifier') {
      throw new Error('Class constructor must be an identifier')
    }

    const argRegs = expr.arguments.map(arg => this.compileExpression(arg))
    const dest = this.allocateRegister()
    this.emit(OpCode.CREATE_INSTANCE, {
      dest,
      name: expr.callee.name,
      argRegs,
    })
    this.releaseRegisters(argRegs)
    return dest
  }

  compileBinaryExpression(expr) {
    const leftReg = this.compileExpression(expr.left)
    const rightReg = this.compileExpression(expr.right)

    const opcodeByOperator = {
      [TokenType.PLUS]: OpCode.ADD,
      [TokenType.MINUS]: OpCode.SUB,
      [TokenType.STAR]: OpCode.MUL,
      [TokenType.SLASH]: OpCode.DIV,
      [TokenType.PERCENT]: OpCode.MOD,
      [TokenType.EQ]: OpCode.EQ,
      [TokenType.NOT_EQ]: OpCode.NOT_EQ,
      [TokenType.LT]: OpCode.LT,
      [TokenType.LTE]: OpCode.LTE,
      [TokenType.GT]: OpCode.GT,
      [TokenType.GTE]: OpCode.GTE,
      [TokenType.AND]: OpCode.AND,
      [TokenType.OR]: OpCode.OR,
    }

    const opcode = opcodeByOperator[expr.operator]
    if (opcode == null) {
      throw new Error(`Unsupported binary operator: ${expr.operator}`)
    }

    return this.emitBinaryRegisterOp(opcode, leftReg, rightReg)
  }

  compileUnaryExpression(expr) {
    const argumentReg = this.compileExpression(expr.argument)
    const opcodeByOperator = {
      [TokenType.BANG]: OpCode.NOT,
    }
    const opcode = opcodeByOperator[expr.operator]
    if (opcode == null) {
      throw new Error(`Unsupported unary operator: ${expr.operator}`)
    }

    const dest = this.allocateRegister()
    this.emit(opcode, { dest, src: argumentReg })
    this.releaseRegister(argumentReg)
    return dest
  }

  emit(op, operand = null) {
    this.instructions.push({ op, operand })
    return this.instructions.length - 1
  }

  finalizeInstructions() {
    this.instructions.maxRegisters = this.maxRegisters
    return this.instructions
  }

  withRegisterScope(fn) {
    const snapshot = this.captureRegisterState()
    const result = fn()
    this.restoreRegisterState(snapshot)
    return result
  }

  emitLoadConst(value) {
    const dest = this.allocateRegister()
    this.emit(OpCode.LOAD_CONST, { dest, value })
    return dest
  }

  emitLoadVariable(name) {
    const dest = this.allocateRegister()
    this.emit(OpCode.LOAD_VARIABLE, { dest, name })
    return dest
  }

  emitBinaryRegisterOp(opcode, leftReg, rightReg) {
    const dest = this.allocateRegister()
    this.emit(opcode, {
      dest,
      left: leftReg,
      right: rightReg,
    })
    this.releaseRegister(leftReg)
    this.releaseRegister(rightReg)
    return dest
  }

  allocateRegister() {
    const reg = this.freeRegisters.length > 0 ? this.freeRegisters.pop() : this.nextRegister++
    if (reg + 1 > this.maxRegisters) {
      this.maxRegisters = reg + 1
    }
    return reg
  }

  releaseRegister(reg) {
    if (typeof reg !== 'number') return
    this.freeRegisters.push(reg)
  }

  releaseRegisters(registers) {
    for (const reg of registers || []) {
      this.releaseRegister(reg)
    }
  }

  captureRegisterState() {
    return {
      freeRegisters: [...this.freeRegisters],
      nextRegister: this.nextRegister,
      maxRegisters: this.maxRegisters,
    }
  }

  restoreRegisterState(snapshot) {
    if (!snapshot) return
    this.maxRegisters = Math.max(this.maxRegisters, snapshot.maxRegisters)
    this.freeRegisters = [...snapshot.freeRegisters]
    this.nextRegister = snapshot.nextRegister
  }

  patchJump(index, target) {
    const operand = this.instructions[index].operand
    if (operand && typeof operand === 'object' && !Array.isArray(operand)) {
      operand.target = target
      return
    }
    this.instructions[index].operand = target
  }

  enterLoop({ continueTarget, continueTargetScopeDepth, loopScopeDepth }) {
    const loopContext = {
      kind: 'loop',
      breakJumps: [],
      continueJumps: [],
      continueTarget,
      continueTargetScopeDepth,
      loopScopeDepth,
    }
    this.loopStack.push(loopContext)
    this.breakStack.push(loopContext)
    return loopContext
  }

  leaveLoop() {
    this.loopStack.pop()
    this.breakStack.pop()
  }

  currentLoop() {
    return this.loopStack[this.loopStack.length - 1] || null
  }

  enterSwitch({ breakTargetScopeDepth }) {
    const switchContext = {
      kind: 'switch',
      breakJumps: [],
      breakTargetScopeDepth,
    }
    this.breakStack.push(switchContext)
    return switchContext
  }

  leaveSwitch() {
    this.breakStack.pop()
  }

  currentBreakContext() {
    return this.breakStack[this.breakStack.length - 1] || null
  }

  patchLoopBreaks(loopContext, target, targetScopeDepth) {
    for (const { jumpIndex, scopeDepthAtEmit } of loopContext.breakJumps) {
      this.patchScopedJump(jumpIndex, target, scopeDepthAtEmit, targetScopeDepth)
    }
  }

  patchSwitchBreaks(switchContext, target, targetScopeDepth) {
    for (const { jumpIndex, scopeDepthAtEmit } of switchContext.breakJumps) {
      this.patchScopedJump(jumpIndex, target, scopeDepthAtEmit, targetScopeDepth)
    }
  }

  patchLoopContinues(loopContext, target, targetScopeDepth) {
    loopContext.continueTarget = target
    loopContext.continueTargetScopeDepth = targetScopeDepth
    for (const { jumpIndex, scopeDepthAtEmit } of loopContext.continueJumps) {
      this.patchScopedJump(jumpIndex, target, scopeDepthAtEmit, targetScopeDepth)
    }
  }

  emitScopedJump(target, targetScopeDepth) {
    const unwind = this.scopeDepth - targetScopeDepth
    if (unwind < 0) {
      throw new Error('Invalid scope unwind during jump compilation')
    }
    this.emit(OpCode.JUMP, { target, unwind })
  }

  patchScopedJump(jumpIndex, target, scopeDepthAtEmit, targetScopeDepth) {
    const unwind = scopeDepthAtEmit - targetScopeDepth
    if (unwind < 0) {
      throw new Error('Invalid patched scope unwind during jump compilation')
    }
    this.instructions[jumpIndex].operand = { target, unwind }
  }

  nextTempName(prefix) {
    this.tempCounter++
    return `${prefix}_${this.tempCounter}`
  }

  collectInterfaces(statements) {
    this.interfaceTable.clear()
    for (const statement of statements) {
      if (statement.type !== 'InterfaceDeclaration') continue
      this.interfaceTable.set(statement.name.name, statement)
    }
  }

  serializeBindingPattern(pattern) {
    if (!pattern) return null

    if (pattern.type === 'Identifier') {
      return {
        type: 'Identifier',
        name: pattern.name,
      }
    }

    if (pattern.type === 'ArrayPattern') {
      return {
        type: 'ArrayPattern',
        elements: pattern.elements.map(element => this.serializeBindingPattern(element)),
      }
    }

    if (pattern.type === 'ObjectPattern') {
      return {
        type: 'ObjectPattern',
        properties: pattern.properties.map(property => ({
          key: property.key,
          value: this.serializeBindingPattern(property.value),
        })),
      }
    }

    if (pattern.type === 'DefaultPattern') {
      return {
        type: 'DefaultPattern',
        target: this.serializeBindingPattern(pattern.target),
        defaultInstructions: this.compileInitializerThunk(pattern.defaultValue),
      }
    }

    throw new Error(`Unsupported binding pattern type: ${pattern.type}`)
  }

  assertConstructorSuperRules(classDeclaration) {
    if (!classDeclaration.superClass) return

    const initMethod = classDeclaration.methods.find(
      method => !method.isStatic && method.name.name === 'init',
    )
    if (!initMethod) return

    const firstStatement = initMethod.body.statements[0]
    const isParentConstructorCall =
      firstStatement &&
      firstStatement.type === 'ExpressionStatement' &&
      firstStatement.expression &&
      firstStatement.expression.type === 'CallExpression' &&
      firstStatement.expression.callee &&
      firstStatement.expression.callee.type === 'SuperExpression'

    if (!isParentConstructorCall) {
      throw new Error(
        `Class "${classDeclaration.name.name}" must call priyoParent(...) as first statement in init`,
      )
    }

    let parentConstructorCallCount = 0
    for (const statement of initMethod.body.statements) {
      if (
        statement.type === 'ExpressionStatement' &&
        statement.expression &&
        statement.expression.type === 'CallExpression' &&
        statement.expression.callee &&
        statement.expression.callee.type === 'SuperExpression'
      ) {
        parentConstructorCallCount++
      }
    }

    if (parentConstructorCallCount > 1) {
      throw new Error(
        `Class "${classDeclaration.name.name}" cannot call priyoParent(...) more than once in init`,
      )
    }
  }

  assertImplementsRules(classDeclaration) {
    const implementedInterfaces = classDeclaration.implementedInterfaces || []
    if (implementedInterfaces.length === 0) return

    for (const ifaceRef of implementedInterfaces) {
      const iface = this.interfaceTable.get(ifaceRef.name)
      if (!iface) {
        throw new Error(
          `Class "${classDeclaration.name.name}" implements unknown interface "${ifaceRef.name}"`,
        )
      }

      for (const ifaceMethod of iface.methods || []) {
        const classMethod = classDeclaration.methods.find(
          method => !method.isStatic && method.name.name === ifaceMethod.name.name,
        )
        if (!classMethod) {
          throw new Error(
            `Class "${classDeclaration.name.name}" must implement method "${ifaceMethod.name.name}" from interface "${iface.name.name}"`,
          )
        }
        if ((classMethod.access || 'public') !== 'public') {
          throw new Error(
            `Method "${classDeclaration.name.name}.${ifaceMethod.name.name}" must be lisaaOpen to satisfy interface "${iface.name.name}"`,
          )
        }
        if (classMethod.params.length !== ifaceMethod.params.length) {
          throw new Error(
            `Method "${classDeclaration.name.name}.${ifaceMethod.name.name}" must accept ${ifaceMethod.params.length} params to satisfy interface "${iface.name.name}"`,
          )
        }
      }
    }
  }
}

module.exports = { Compiler }
