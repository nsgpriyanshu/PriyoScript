class Environment {
  constructor() {
    this.bindings = new Map()
  }

  define(name, value, kind) {
    const existing = this.bindings.get(name)

    // JS-like var redeclaration support; let/const stay strict.
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
    const binding = this.bindings.get(name)
    if (!binding) {
      throw new Error(`Hmmm: Undefined variable "${name}"`)
    }
    return binding.value
  }

  set(name, value) {
    const binding = this.bindings.get(name)
    if (!binding) {
      throw new Error(`Ohh Ohh: Undefined variable "${name}"`)
    }
    if (binding.kind === 'const') {
      throw new Error(`How disrespectfull: Cannot reassign constant "${name}"`)
    }
    binding.value = value
  }
}

module.exports = { Environment }
