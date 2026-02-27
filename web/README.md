# PriyoScript Web Docs

Next.js + Fumadocs web documentation app for PriyoScript.

## Development

```bash
npm --prefix web install
npm --prefix web run dev
```

Open: `http://localhost:3000`

## Build

```bash
npm --prefix web run build
npm --prefix web run start
```

## Type Check

```bash
npm --prefix web run types:check
```

## Separate Web Versioning (Cliff-Jumper)

Yes, web versioning is maintained separately from root package versioning.

- Config: `web/.cliff-jumperrc.json`
- Tag format: `web-v<version>`
- Package version file: `web/package.json`
- Changelog file: `web/CHANGELOG.md`
- Monorepo mode: enabled (web package path-scoped release detection)

Preview next web release (no file/tag changes):

```bash
npm --prefix web run release:dry
```

Or from root:

```bash
npm run release:web:dry
```

Release web only:

```bash
npm --prefix web run release
```

Or from root:

```bash
npm run release:web
```
