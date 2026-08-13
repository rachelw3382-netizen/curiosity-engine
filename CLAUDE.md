# Curiosity Engine

## What this is

Curiosity Engine is a calm home for the things that make a person curious. It has two connected layers, and the product has evolved past the original plan doc's "finite trail" concept (see below):

1. **Spark Library** — a Pinterest-style masonry board of captured links, videos, and notes, organized into **boards** (Collections). Capture before categorisation; a spark can belong to zero, one, or several boards. Each spark has a full-page detail view at `/spark/[id]`.
2. **Mindmaps** — freeform canvases (`/mindmap`, multiple named ones) where sparks and free-typed text notes are placed, dragged, and connected with edges — a real whiteboard/mindmap, not a finite guided flow. Positions, text, and connections autosave as you go.

This is a **product-direction change from the original plan doc** (`Curiosity_Engine_Project_Plan.md`): that doc argued for a finite "Question Trail" (Starting Point → Perspectives → Reflection) instead of an "infinite canvas," to avoid the product becoming an unbounded mindmapping tool. The user has since explicitly chosen the opposite direction for this build — an open mindmap canvas replacing Trails entirely. The plan doc is still useful for the *Spark Library* half (capture philosophy, privacy defaults, visual direction) and for historical context, but its Trail/Reflection sections no longer describe what's built. Treat this file, not that doc, as the source of truth for current scope.

## Current build scope

Local MVP, no auth yet — single implicit local user (a seeded row), so the schema is auth-ready without needing login now. No AI-generated content anywhere in the app. One scoped exception: local on-device sentence-embedding reranking for "More like this" (see **Non-goals**) — no cloud AI calls, no API keys, no per-call cost.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma ORM (v7, driver-adapter based — see `src/lib/prisma.ts`) + SQLite for local dev (`prisma/schema.prisma`, `DATABASE_URL="file:./dev.db"` in `.env`). Swappable to Postgres later via `@prisma/adapter-pg` and a datasource change.
- `motion` (Framer Motion successor) for spring-based interaction polish, per the `apple-design` skill (`~/.claude/skills/apple-design/SKILL.md`) — used throughout for press/hover feedback and staggered entrance.
- `@xyflow/react` (React Flow) for the mindmap canvas — dragging, connecting, zoom/pan.

**Note:** `AGENTS.md` at the project root is auto-generated/maintained by Next.js itself (`next dev` rewrites it) and warns that this Next.js version has breaking changes vs. training data — check `node_modules/next/dist/docs/` before relying on remembered Next.js APIs or conventions. Don't hand-edit `AGENTS.md`.

### Running locally

```bash
npm install
npx prisma migrate dev   # creates dev.db and applies schema
npx prisma db seed       # seeds sample sparks, boards, and a demo mindmap (idempotent)
npm run dev              # http://localhost:3000
```

Use `npx prisma studio` to inspect the local database directly during development.

Optional `YOUTUBE_API_KEY` env var (see `.env`) enables real "More like this" video suggestions on YouTube sparks via the YouTube Data API v3 free tier (`src/lib/related-content.ts`): a cheap `videos.list` lookup fetches the origin video's own creator-authored tags/category, which enrich the `search.list` query for sharper results than title text alone (YouTube's API has had no official "related videos"/"watch next" endpoint since `relatedToVideoId` was deprecated in 2023, so keyword search remains the only legitimate mechanism). Without the key, that section falls back to a plain YouTube-search link instead of inline video cards.

Optional `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` env vars (see `.env`) enable real "More like this" same-artist track suggestions on Spotify sparks (`src/lib/related-content.ts`, client-credentials auth): Spotify restricted its `recommendations`/`related-artists`/`top-tracks` endpoints for new apps (Nov 2024, tightened further Feb 2026), so this uses the one signal still reliably available — an artist-scoped `search` — reranked by the same local scorer used for YouTube/RSS. Creating the Spotify app requires the registering account to have Spotify Premium. Without the credentials, that section falls back to a Spotify artist-search link instead of inline track cards.

## Data model (current)

- `User` — single seeded row (`LOCAL_USER_ID` in `src/lib/constants.ts`).
- `Spark` — a captured link, video, or note. `type` (`url`|`note`), `mediaType` (`text`|`link`|`video`|`image`, drives card rendering in `MasonryCard.tsx`), oEmbed/OG metadata fields (`thumbnailUrl`, `embedHtml`, `provider`, `domain`, `width`/`height`), `whySaved`, `status`.
- `Collection` — a board; a named, loose grouping of sparks.
- `SparkCollection` — join table; a spark can belong to many boards.
- `Canvas` — a named mindmap space.
- `CanvasNode` — a positioned (`x`,`y`) node on a canvas; `kind` is `"spark"` (references a `Spark`) or `"text"` (freeform typed content).
- `CanvasEdge` — a connection between two `CanvasNode`s (cascades on node delete).

Not modeled: AI suggestions/provenance, public sharing, persisted/searchable embeddings (see Non-goals for the ephemeral, on-device reranking exception — embeddings are computed per-request and never stored), real auth.

## Key routes

- `/` — landing page.
- `/library` — masonry Spark Library. Capture via `CaptureForm.tsx` (link/video, note, or bulk-paste-multiple-links modes).
- `/spark/[id]` — full-page spark detail, with inline edit/delete (`SparkDetail.tsx`).
- `/mindmap` — list of mindmap canvases, create new.
- `/mindmap/[id]` — the canvas itself (`MindmapCanvas.tsx`), custom `SparkNode`/`TextNode` types, autosaves on drag/connect/type/delete.

## Reusable patterns worth knowing before adding more

- **Direct server-action calls from client components**, wrapped in `useTransition`/`startTransition` (not always `<form action>` + `useActionState`) — see `LibrarySparkCard.tsx`, `SparkDetail.tsx`, `MindmapCanvas.tsx`. This is the documented Next.js pattern for event-handler-triggered mutations; use it for anything that isn't a plain form submit (drag-stop, click-to-delete, etc.).
- **`SparkEditForm.tsx`** — the one shared edit-form implementation, used by both `LibrarySparkCard` (inline in the grid) and `SparkDetail` (full page). Extend this, don't duplicate it.
- **`SparkActionsMenu.tsx`** — the shared "⋯ → Edit / Delete" popover, used in both of the above. Same rule.
- **`BoardPicker.tsx`** — existing-boards checkboxes + inline "+ New board" creation, used in `CaptureForm` and `SparkEditForm`.
- **`fetchLinkMetadata` (`src/lib/link-metadata.ts`)** — oEmbed for YouTube/TikTok/Vimeo, Open Graph scraping fallback for everything else, SSRF-safe URL validation. Instagram links intentionally fall back to manual entry — Instagram has no public oEmbed anymore and does not expose saved-post data to third-party apps at all, even with developer credentials. Don't attempt an Instagram/TikTok "import my saved collection" OAuth flow; it isn't possible. The closest real feature is the bulk-paste capture mode.

## Non-goals (don't add these without an explicit decision)

- Browser extension, native mobile app, OCR/image ingestion, full-article storage.
- Third-party "import my saved posts" integrations for Instagram/TikTok (not exposed by either platform's API to any app — see above).
- An infinite/algorithmic *feed* anywhere outside the mindmap canvases themselves. The one deliberate, scoped exception is the "More like this" section on `/spark/[id]` (`RelatedContent.tsx`/`src/lib/related-content.ts`) — per-source suggestions (YouTube Data API for YouTube sparks, free keyless RSS/Atom discovery of same-source posts for everything else, falling back to a search-link when no feed is found), not a general recommendation feed.
- AI inventing sources or claims, or writing content on a user's behalf. The one scoped exception: `related-content-scoring.ts` uses local, on-device sentence embeddings (`@huggingface/transformers`, running inside the Node.js server process — no external API calls, no data leaves the machine, no per-call cost) to *rerank* the same real fetched candidates the existing scorer ranks; it never generates, summarizes, paraphrases, or invents text. A zero-dependency keyword-based scorer remains as a synchronous fallback if the model fails to load.
- Public-by-default anything — private by default; publishing/sharing requires an explicit action (not yet built for boards or mindmaps).
- Streaks, likes, follower counts, or other engagement-maximising gamification.

## Product principles worth keeping in mind while building

- Capture should never be blocked by categorisation, metadata fetch failure, or AI unavailability.
- Every summary or claim stays linked back to its source.
- Deleting a spark-node from a mindmap removes it from that canvas only, never the underlying `Spark`.
