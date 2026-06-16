# Test Skeleton Guide

This folder contains planning-phase test skeletons only.

Current status:
- No test runner is installed yet.
- The skeleton uses Vitest-style blocks for future implementation.

## Enable tests later

1. Install dependencies:

```bash
npm install -D vitest @types/node
```

2. Add scripts to package.json:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

3. Optionally include tests in TypeScript checking by expanding tsconfig `include`.
