# Test Pyramid

This app is intentionally static, so the useful pyramid is:

- `tests/unit/*.unit.spec.js`: fast engine tests for word parsing and question generation.
- `tests/static/*.spec.js`: source-level contracts for GitHub Pages-safe static files and classroom UI hooks.
- `tests/request/*.request.spec.js`: serves the static app with a tiny local HTTP server and verifies real HTTP responses.
- `tests/e2e/*.e2e.spec.js`: browser-level classroom flows. These skip unless Playwright is installed.
- `tests/spelling-quiz.spec.js`: broad regression/specification suite that captures the evolving product clarifications.

Run the normal “did I break anything?” checks:

```sh
npm test
```

Run the same fast checks explicitly:

```sh
npm run test:fast
```

Run the static hosting smoke test:

```sh
npm run test:hosting
```

Run everything available in the current environment:

```sh
npm run test:all
```

Enable browser E2E locally:

```sh
npm install --save-dev playwright
npx playwright install chromium
npm run test:e2e
```
