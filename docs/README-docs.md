# image2video Documentation Index
_Last reviewed: 2025-09-22_

This table is the canonical entry point for project documentation. Every document lists an owner and the last review date so new contributors know which sources are authoritative.

| Document | Owner | Last Reviewed | Status | Notes |
| --- | --- | --- | --- | --- |
| [`PRD.md`](./PRD.md) | Product (Zihao) | 2025-09-22 | ✅ Active | Current product goals and MVP scope; updated to match implemented capabilities. |
| [`Technical-Architecture.md`](./Technical-Architecture.md) | Engineering | 2025-09-22 | ✅ Active | Describes the running Next.js + queue-based pipeline and data stores. |
| [`UI-UX-Design.md`](./UI-UX-Design.md) | Design | 2025-09-15 | ⚠️ Needs sync | Visual/interaction guidelines; next review should confirm color token usage in code. |
| [`Git-Workflow.md`](./Git-Workflow.md) | Engineering | 2025-08-12 | ✅ Active | Commit / PR habits and branching conventions. |
| [`archive/`](./archive) | — | — | 🗄️ Archived | Historic explorations (simplified architecture, philosophical notes, old refactor plan). |

## Governance
- **Single source of truth**: Any new doc must be linked here; if it is exploratory, place it under `docs/archive/`.
- **Review cadence**: Owners revisit their documents at least once per release cycle (recommended monthly) and update the “Last Reviewed” date.
- **Pull-request checklist**: When code introduces or changes a feature, update the relevant doc and reference the change in the PR description.
- **Backlog capture**: Create tickets for documentation actions instead of leaving TODOs inside docs. The `humantalkwithClaude` directory is reference material only.

_Last updated by: Documentation caretaker_
