export type PlaygroundLogLevel = 'plain' | 'build' | 'success' | 'info' | 'warn' | 'error'

export interface PlaygroundOutputLine {
  level: PlaygroundLogLevel
  text: string
}

export interface PlaygroundRunResult {
  ok: boolean
  lines: PlaygroundOutputLine[]
  error?: PlaygroundUserError
  stats: {
    sourceChars: number
    statements: number
    durationMs: number
  }
}

export type PrimitiveValue = string | number | boolean | null

export interface PlaygroundUserError {
  code: string
  message: string
  tip?: string
}
