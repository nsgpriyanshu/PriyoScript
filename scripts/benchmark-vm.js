const { parse } = require('../src/parser/parser')
const { Compiler } = require('../src/compiler/compiler')
const { VM } = require('../src/vm/vm')
const { Environment } = require('../src/runtime/environment')
const { createBuiltins } = require('../src/runtime/builtins')

const DEFAULT_WARMUP = 5
const DEFAULT_ITERATIONS = 20

const NOOP_CONSOLE = {
  log() {},
}

const SUITES = {
  arithmetic_loop: {
    description: 'Loop-heavy arithmetic and branch execution',
    source: `
      monalisa {
        priyoChange total = 0
        prakritiCount (priyoChange i = 0; i < 3000; i = i + 1) {
          prakritiIf (i % 2 == 0) {
            total = total + i
          } prakritiElse {
            total = total - 1
          }
        }
        priyoTell(total)
      }
    `,
  },
  function_calls: {
    description: 'User function dispatch and repeated call overhead',
    source: `
      monalisa {
        lisaaTask fibLike(x, y) {
          priyoGiveBack (x * 2) + (y * 3)
        }

        priyoChange total = 0
        prakritiCount (priyoChange i = 0; i < 2000; i = i + 1) {
          total = total + fibLike(i, i + 1)
        }
        priyoTell(total)
      }
    `,
  },
  arrays_and_objects: {
    description: 'Array helpers, indexing, slicing, and object-like package access',
    source: `
      monalisa {
        priyoKeep math = priyoPackage.use("math")
        priyoChange values = [1, 2, 3, 4, 5, 6]
        priyoChange total = 0
        prakritiCount (priyoChange i = 0; i < 1500; i = i + 1) {
          priyoKeep picked = priyoArray.slice(values, 1, 5)
          total = total + picked[0] + picked[1] + math.add(1, 2)
        }
        priyoTell(total)
      }
    `,
  },
  classes_and_methods: {
    description: 'Instance creation, field initialization, and method dispatch',
    source: `
      monalisa {
        lisaaFamily Counter {
          priyoChange value = 0

          lisaaTask init(seed) {
            priyoSelf.value = seed
          }

          lisaaTask bump(step) {
            priyoSelf.value = priyoSelf.value + step
            priyoGiveBack priyoSelf.value
          }
        }

        priyoKeep counter = priyoCreate Counter(1)
        priyoChange total = 0
        prakritiCount (priyoChange i = 0; i < 2000; i = i + 1) {
          total = total + counter.bump(1)
        }
        priyoTell(total)
      }
    `,
  },
}

function parseArgs(argv) {
  const options = {
    warmup: DEFAULT_WARMUP,
    iterations: DEFAULT_ITERATIONS,
    suite: 'all',
  }
  const positional = []

  for (let i = 0; i < argv.length; i++) {
    const value = argv[i]
    if (/^\d+$/.test(value)) {
      positional.push(Number(value))
      continue
    }
    if (value.startsWith('--warmup=')) {
      options.warmup = Number(value.slice('--warmup='.length) || DEFAULT_WARMUP)
      continue
    }
    if (value === '--warmup') {
      options.warmup = Number(argv[i + 1] || DEFAULT_WARMUP)
      i++
      continue
    }
    if (value.startsWith('--iterations=')) {
      options.iterations = Number(value.slice('--iterations='.length) || DEFAULT_ITERATIONS)
      continue
    }
    if (value === '--iterations') {
      options.iterations = Number(argv[i + 1] || DEFAULT_ITERATIONS)
      i++
      continue
    }
    if (value.startsWith('--suite=')) {
      options.suite = String(value.slice('--suite='.length) || 'all')
      continue
    }
    if (value === '--suite') {
      options.suite = String(argv[i + 1] || 'all')
      i++
      continue
    }
  }

  if (positional.length > 0) {
    options.warmup = positional[0]
  }
  if (positional.length > 1) {
    options.iterations = positional[1]
  }

  if (!Number.isInteger(options.warmup) || options.warmup < 0) {
    throw new Error('--warmup must be a non-negative integer')
  }
  if (!Number.isInteger(options.iterations) || options.iterations <= 0) {
    throw new Error('--iterations must be a positive integer')
  }

  return options
}

function durationMs(startNs, endNs) {
  return Number(endNs - startNs) / 1e6
}

function percentile(values, ratio) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * ratio)))
  return sorted[index]
}

function summarize(values) {
  const total = values.reduce((sum, value) => sum + value, 0)
  return {
    avg: total / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    p95: percentile(values, 0.95),
  }
}

function buildRuntime() {
  return {
    environment: new Environment(null, { isFunctionScope: true }),
    builtins: createBuiltins({
      console: NOOP_CONSOLE,
      stdout: { write() {} },
      stderr: { write() {} },
    }),
  }
}

function compileSource(source) {
  const parseStart = process.hrtime.bigint()
  const ast = parse(source)
  const parseEnd = process.hrtime.bigint()

  const compileStart = process.hrtime.bigint()
  const compiler = new Compiler()
  const bytecode = compiler.compile(ast)
  const compileEnd = process.hrtime.bigint()

  return {
    ast,
    bytecode,
    parseMs: durationMs(parseStart, parseEnd),
    compileMs: durationMs(compileStart, compileEnd),
  }
}

async function runBytecode(bytecode) {
  const { environment, builtins } = buildRuntime()
  const vm = new VM(bytecode, {
    environment,
    builtins,
  })
  const start = process.hrtime.bigint()
  await vm.run()
  const end = process.hrtime.bigint()
  return durationMs(start, end)
}

async function benchmarkSuite(name, suite, options) {
  for (let i = 0; i < options.warmup; i++) {
    const compiled = compileSource(suite.source)
    await runBytecode(compiled.bytecode)
  }

  const parseSamples = []
  const compileSamples = []
  const runSamples = []
  let instructionCount = 0
  let maxRegisters = 0

  for (let i = 0; i < options.iterations; i++) {
    const compiled = compileSource(suite.source)
    instructionCount = compiled.bytecode.length
    maxRegisters = compiled.bytecode.maxRegisters || 0
    parseSamples.push(compiled.parseMs)
    compileSamples.push(compiled.compileMs)
    runSamples.push(await runBytecode(compiled.bytecode))
  }

  return {
    name,
    description: suite.description,
    instructionCount,
    maxRegisters,
    parse: summarize(parseSamples),
    compile: summarize(compileSamples),
    run: summarize(runSamples),
  }
}

function formatMetric(label, summary) {
  return `${label.padEnd(8)} avg=${summary.avg.toFixed(3)}ms min=${summary.min.toFixed(3)}ms max=${summary.max.toFixed(3)}ms p95=${summary.p95.toFixed(3)}ms`
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const suiteEntries =
    options.suite === 'all'
      ? Object.entries(SUITES)
      : [[options.suite, SUITES[options.suite]]].filter(([, suite]) => Boolean(suite))

  if (suiteEntries.length === 0) {
    throw new Error(
      `Unknown suite "${options.suite}". Available: ${Object.keys(SUITES).join(', ')}`,
    )
  }

  console.log(
    `PriyoScript VM benchmark | warmup=${options.warmup} iterations=${options.iterations} suite=${options.suite}`,
  )

  for (const [name, suite] of suiteEntries) {
    const result = await benchmarkSuite(name, suite, options)
    console.log(`\n[${result.name}] ${result.description}`)
    console.log(
      `bytecode=${result.instructionCount} instructions | maxRegisters=${result.maxRegisters}`,
    )
    console.log(formatMetric('parse', result.parse))
    console.log(formatMetric('compile', result.compile))
    console.log(formatMetric('run', result.run))
  }
}

main().catch(err => {
  console.error(err.message || err)
  process.exit(1)
})
