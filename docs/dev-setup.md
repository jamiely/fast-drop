# Development Setup

## Prerequisites

- Node.js 24+
- npm 10+

## Install

```bash
npm install
```

## Local workflow

```bash
npm run dev
npm run check
npm run test:e2e
```

## Git hooks

```bash
npm run prepare
```

- Installs Husky hooks at `.husky/`.
- Pre-commit enforces lint, tests, coverage (>=90%), and e2e before allowing commit.

## Notes

- E2E tests build and preview the app automatically through Playwright config.
- Coverage output is written to `coverage/`.
- Coverage thresholds are enforced in `vite.config.ts`.
