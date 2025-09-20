# image2video

AI-assisted canvas that turns a quick sketch or uploaded reference into a polished illustration. The app focuses on a friendly, emotion-driven waiting experience while an asynchronous worker talks to the nano-banana model to generate images.

> Looking for the canonical docs? Start with [`docs/README-docs.md`](./docs/README-docs.md).

## Current MVP
- Fabric.js canvas with drawing + erase tools, color/size controls, simple layer management.
- Drag-and-drop image upload; load references onto the canvas for further edits.
- Single-image generation (text-to-image / image-to-image) through a BullMQ queue.
- Emotional feedback during generation plus status polling of asset records.
- Budget guardrails to prevent exceeding a configurable monthly spend cap.

_Not yet shipped_: comic strips, video synthesis, authentication, social sharing, real content moderation.

## Architecture Snapshot
- **Frontend**: Next.js App Router (client components), Zustand for state, TailwindCSS styling.
- **API routes**: `/api/generate`, `/api/assets/status`, `/api/projects` handle validation, persistence, queue submission.
- **Queue & worker**: BullMQ + Redis dispatch jobs to a worker process that calls nano-banana and uploads results to S3.
- **Data stores**: PostgreSQL (projects/assets/billing/usage), MongoDB (sketch base64 blobs).

See [`docs/Technical-Architecture.md`](./docs/Technical-Architecture.md) for the full diagram and data model.

## Getting Started
### Prerequisites
- Node.js 18+
- Docker (optional, for local Postgres/Mongo/Redis via `docker-compose`)
- nano-banana API key & AWS credentials (or adjust the code to stub these parts)

### Environment
Copy `.env.example` to `.env.local` and fill in at least:
```
DATABASE_URL=postgres://...
MONGODB_URL=mongodb://...
REDIS_URL=redis://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
NANO_BANANA_API_KEY=...
MONTHLY_BUDGET_CENTS=1000000
```

### Commands
```bash
npm install
npm run dev       # start Next.js app on http://localhost:3000
npm run worker    # start BullMQ worker (enable queue processing)
```
The worker can also be launched manually: `ENABLE_QUEUE_WORKER=true node src/worker/start-worker.js`.

### Useful tests / smoke checks
- `npm run lint` — lint the project.
- `curl http://localhost:3000/api/health` — verify DB/Redis connections.
- Use the canvas to draw/upload a sketch, hit “生成图片”，and monitor terminal output for queue activity.

## Documentation & Process
- [`docs/README-docs.md`](./docs/README-docs.md) lists every active document, owner, and review date.
- Updates to behaviour must update the relevant doc and mention it in the PR description.
- Exploratory ideas live inside [`docs/archive/`](./docs/archive/); they are **not** the source of truth.

## Roadmap
| Version | Focus | Status |
| --- | --- | --- |
| v0.4 | Stabilise single-image pipeline, hook up project gallery, productionise moderation | 🚧 In progress |
| v0.5+ | Multi-frame stories, video, auth & sharing | 🔭 Planned |

Contributions are welcome—open an issue for discussion before tackling major changes, and ensure documentation stays in sync.
