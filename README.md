# testauto

An app built autonomously from [`spec/app.md`](spec/app.md) by a coder agent and an adversarial tester
agent, refereed by GitHub Actions and deployed to Vercel.

- How it works: [docs/pipeline.md](docs/pipeline.md)
- One-time setup: [docs/setup.md](docs/setup.md)
- Models and limits: [models.yaml](models.yaml)
- Design decisions: [docs/decisions/](docs/decisions/)

## Working on the app locally (optional)

```bash
npm ci
npm run dev            # http://localhost:3000
npm run test:unit
npx playwright install chromium && npm run build && npm run test:e2e
```
