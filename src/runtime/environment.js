class Environment {
  constructor(parent = null, options = {}) {
    this.parent = parent
    this.isFunctionScope = Boolean(options.isFunctionScope)
    this.bindings = new Map()
  }

  define(name, value, kind) {
    // var is function-scoped; let/const are block-scoped.
    const targetScope = kind === 'var' ? this.getNearestFunctionScope() : this
    targetScope.defineLocal(name, value, kind)
  }

  defineLocal(name, value, kind) {
    const existing = this.bindings.get(name)

    if (existing) {
      if (kind === 'var' && existing.kind === 'var') {
        existing.value = value
        return
      }
      throw new Error(`Hey: Variable "${name}" is already declared`)
    }

    this.bindings.set(name, { value, kind })
  }

  get(name) {
    const ownerScope = this.findBindingScope(name)
    if (!ownerScope) {
      throw new Error(`Hmmm: Undefined variable "${name}"`)
    }
    return ownerScope.bindings.get(name).value
  }

  set(name, value) {
    const ownerScope = this.findBindingScope(name)
    if (!ownerScope) {
      throw new Error(`Ohh Ohh: Undefined variable "${name}"`)
    }

    const binding = ownerScope.bindings.get(name)
    if (binding.kind === 'const') {
      throw new Error(`How disrespectfull: Cannot reassign constant "${name}"`)
    }
    binding.value = value
  }

  getNearestFunctionScope() {
    let scope = this
    while (scope) {
      if (scope.isFunctionScope) {
        return scope
      }
      scope = scope.parent
    }
    return this
  }

  findBindingScope(name) {
    let scope = this
    while (scope) {
      if (scope.bindings.has(name)) {
        return scope
      }
      scope = scope.parent
    }
    return null
  }
}

module.exports = { Environment }
