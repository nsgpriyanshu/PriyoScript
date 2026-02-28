export type HomeDemoId = 'script' | 'repl' | 'errors'

export type HomeDemoTab = {
  id: HomeDemoId
  label: string
  lang: 'priyo' | 'bash'
  code: string
  output: string
}

export const HOME_DEMO_TABS: HomeDemoTab[] = [
  {
    id: 'script',
    label: 'Create a Script',
    lang: 'priyo',
    code: `// app.priyo
monalisa {
  lisaaTask greet(name) {
    priyoGiveBack "Hi " + name
  }

  priyoKeep user = priyoListenSentence("Your name: ")
  priyoTell.Success(greet(user))
}`,
    output: `Success: Hi Priyo`,
  },
  {
    id: 'repl',
    label: 'Run in REPL',
    lang: 'bash',
    code: `# Start PriyoScript REPL
monalisa -repl

priyo> priyoKeep x = 10
priyo> priyoTell(x + 5)
15

priyo> .help
priyo> .load examples/basics/main.priyo`,
    output: `PriyoScript REPL - v1.10.0
priyo> priyoKeep x = 10
priyo> priyoTell(x + 5)
15`,
  },
  {
    id: 'errors',
    label: 'Handle Errors',
    lang: 'priyo',
    code: `prakritiTry {
  priyoTell(10 / 0)
} prakritiCatch (err) {
  priyoTell.Error(err.message)
  priyoTell.Info(err.code)
} prakritiAtEnd {
  priyoTell("done")
}`,
    output: `Error: Cannot divide by zero
Info: PSRT-104
done`,
  },
]
