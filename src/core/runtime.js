class Runtime {
  constructor() {
    this.variables = Object.create(null)
  }

  set(name, value) {
    this.variables[name] = value
  }

  get(name) {
    if (!(name in this.variables)) {
      throw new Error(`Priyo couldn’t remember variable "${name}"`)
    }
    return this.variables[name]
  }
}

module.exports = Runtime
