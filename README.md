# Glimpse

Product ideas from user feedback. Scrapes Reddit, Hacker News, and Product Hunt, then uses AI to extract actionable insights.

## Stack

TanStack Start (React 19, Vite 8, Nitro), Drizzle ORM on PostgreSQL, AI SDK with OpenAI, Tailwind CSS 4, shadcn/ui on Base UI. Package manager and runtime for scripts is [Bun](https://bun.sh).

## Setup

```bash
bun install
# create .env with required vars (see below)
bun run db:push
bun run dev
```

## Env vars

| Variable                 | Description                                        |
| ------------------------ | -------------------------------------------------- |
| `DATABASE_URL`           | PostgreSQL (Neon) connection string                |
| `OPENAI_API_KEY`         | OpenAI API key                                     |
| `OPENAI_MODEL`           | Optional model override (default `gpt-4.1-mini`)   |
| `PRODUCTHUNT_API_KEY`    | Product Hunt API key                               |
| `PRODUCTHUNT_API_SECRET` | Product Hunt API secret                            |

Reddit and Hacker News use public endpoints and need no credentials.

## Project layout

| Path                | Contents                                                        |
| ------------------- | --------------------------------------------------------------- |
| `src/lib/domain.ts` | Source types, insight categories, source config schemas         |
| `src/db`            | Drizzle schema and client                                       |
| `src/lib/scrapers`  | One scraper per source type                                     |
| `src/lib/ai.ts`     | Insight extraction prompt and schema                            |
| `src/server`        | Server functions used by the routes                             |
| `src/routes`        | File-based routes (`routeTree.gen.ts` is generated)             |

## Scripts

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `bun run dev`       | Start dev server (port 3000)             |
| `bun run build`     | Build for production                     |
| `bun run test`      | Run unit tests (Vitest)                  |
| `bun run lint`      | Lint with ESLint                         |
| `bun run typecheck` | Type-check with `tsc`                    |
| `bun run check`     | Format, lint with fixes, and type-check  |
| `bun run db:push`   | Push schema to database                  |
| `bun run db:studio` | Open Drizzle Studio                      |
