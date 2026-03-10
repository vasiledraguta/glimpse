# Glimpse

Product ideas from user feedback. Scrapes Reddit, Hacker News, and Product Hunt, then uses AI to extract actionable insights.

## Setup

```bash
bun install
# create .env with required vars (see below)
bun run db:push
bun run dev
```

## Env vars

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL (Neon) connection string |
| `OPENAI_API_KEY` | OpenAI API key |
| `PRODUCTHUNT_API_KEY` | Product Hunt API key |
| `PRODUCTHUNT_API_SECRET` | Product Hunt API secret |

For Reddit: create a Reddit app and add credentials to your scraper config.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server (port 3000) |
| `bun run build` | Build for production |
| `bun run db:push` | Push schema to database |
| `bun run db:studio` | Open Drizzle Studio |
