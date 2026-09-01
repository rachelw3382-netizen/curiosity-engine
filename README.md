# Curiosity Engine

A calm home for the things that make you curious.

Curiosity Engine has two connected layers:

- **Spark Library** — a Pinterest-style masonry board of captured links, videos, and notes, organized into boards. Capture comes before categorization: a spark can belong to zero, one, or several boards, and every spark has a full detail view.
- **Mindmaps** — freeform whiteboard canvases where sparks and free-typed text notes are dragged, connected with edges, and autosaved continuously. A real mindmap surface, not a guided flow.

This is a local-first MVP: single implicit local user, no auth yet, and no AI-generated content anywhere in the app — with one narrow, deliberate exception (see below).

## Technical highlights

- **On-device "More like this" reranking.** Related-content suggestions are reranked by a local sentence-embedding model (`@huggingface/transformers`) running inside the Node server process — no cloud AI calls, no API keys, no per-call cost, and no data ever leaves the machine. A zero-dependency keyword scorer is the synchronous fallback if the model fails to load. This is the one scoped exception to "no AI-generated content": it reranks real fetched candidates, it never generates or invents text.
- **Safe link capture.** Fetching metadata for a pasted link goes through SSRF-safe URL validation, then oEmbed (YouTube/TikTok/Vimeo) with an Open Graph scraping fallback for everything else — so capture never depends on a single fragile source.
- **Graceful degradation, always.** Optional YouTube Data API v3 and Spotify (client-credentials) integrations power richer "More like this" results, but capture and browsing are never blocked by a missing API key — both fall back to a plain search link.
- **Swappable data layer.** Prisma v7's driver-adapter architecture runs on SQLite locally and can move to Postgres with just a datasource change, no rewrite.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma ORM (v7, driver-adapter based) + SQLite for local dev
- [`motion`](https://motion.dev) for spring-based interaction polish
- [`@xyflow/react`](https://reactflow.dev) for the mindmap canvas

## Getting started

```bash
npm install
npx prisma migrate dev   # creates dev.db and applies schema
npx prisma db seed       # seeds sample sparks, boards, and a demo mindmap
npm run dev              # http://localhost:3000
```

Two optional integrations, both fully optional — the app works without them:

- `YOUTUBE_API_KEY` enables real "More like this" video suggestions on YouTube sparks via the YouTube Data API v3 free tier.
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` enable real "More like this" track suggestions on Spotify sparks via client-credentials auth.

## Key routes

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/library` | Masonry Spark Library — capture, browse, filter by board |
| `/spark/[id]` | Full-page spark detail, with inline edit/delete |
| `/mindmap` | List of mindmap canvases |
| `/mindmap/[id]` | The canvas itself — drag, connect, autosave |
