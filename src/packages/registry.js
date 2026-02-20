const mathPackage = require('../../packages/math')

const BUILTIN_PACKAGES = {
  math: mathPackage,
}

function createPackageManager() {
  return {
    __priyoHostObject: true,

    use(packageName) {
      const normalized = String(packageName || '')
        .trim()
        .toLowerCase()
      const pkg = BUILTIN_PACKAGES[normalized]
      if (!pkg) {
        throw new Error(`Unknown package: "${packageName}"`)
      }
      return pkg
    },

    has(packageName) {
      const normalized = String(packageName || '')
        .trim()
        .toLowerCase()
      return Boolean(BUILTIN_PACKAGES[normalized])
    },

    list() {
      return Object.keys(BUILTIN_PACKAGES)
    },
  }
}

module.exports = {
  createPackageManager,
}
