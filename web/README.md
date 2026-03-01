# PriyoScript Web Docs

Next.js + Fumadocs documentation application for PriyoScript.

## Overview

[![Deployment](https://img.shields.io/badge/Deployment-Vercel-black?logo=vercel)](https://priyyoscript.vercel.app)
![Web Version](https://img.shields.io/github/package-json/v/nsgpriyanshu/PriyoScript?filename=web%2Fpackage.json&color=ff2056&label=web-version)

This package contains the official PriyoScript docs website (`web/`) with:

- Home page and docs portal
- Stable and Canary docs structure
- MDX content with Shiki highlighting
- Independent web release/changelog flow

## Technology Used

- Next.js 16
- TypeScript
- Fumadocs
- Tailwind CSS v4
- Shiki (code highlighting)
- Cliff-jumper (web-only versioning and changelog)

## How to Use as Developer

From repository root:

### 1. Install dependencies

```bash
npm --prefix web install
```

### 2. Run dev server

```bash
npm --prefix web run dev
```

Open: `http://localhost:3000`

### 3. Build for production

```bash
npm --prefix web run build
npm --prefix web run start
```

### 4. Type check

```bash
npm --prefix web run types:check
```

### 5. Web release (separate versioning)

Dry run:

```bash
npm --prefix web run release:dry
```

Actual release:

```bash
npm --prefix web run release
```

Also available from root package scripts:

```bash
npm run release:web:dry
npm run release:web
```

Web release files:

- `web/.cliff-jumperrc.json`
- `web/cliff.toml`
- `web/CHANGELOG.md`

## Contact

- Issues: https://github.com/nsgpriyanshu/PriyoScript/issues
- Repository: https://github.com/nsgpriyanshu/PriyoScript
- Docs site: https://priyyoscript.vercel.app

## Developer

<div>
  <br>
  <a href="https://nsgpriyanshu.github.io">
    <img src="https://img.shields.io/badge/Developer-nsgpriyanshu-author.svg?color=f10a0a" alt="nsgpriyanshu" />
  </a>
</div>
