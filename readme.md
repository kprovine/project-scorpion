# Project Scorpion

Project Scorpion is a personal intelligence dashboard built to become my default browser homepage.

The goal is not to build another RSS reader. The goal is to surface the information I actually care about in a fast, clean, configurable dashboard.

## Current Features

* Live RSS dashboard
* Multiple news categories
* Global **Top Stories** feed
* Server-side RSS proxy
* RSS caching
* Headline normalization
* Story scoring
* Story deduplication
* HOT and NEW indicators
* Skeleton loading states
* Streaming-style updates
* Responsive card layout

## Project Structure

```text
api/
    rss.js          Server-side RSS proxy

public/
    index.html      Main page and styles
    main.js         Dashboard logic
    sources.js      RSS source registry
```

## Architecture

The application follows a simple pipeline:

```
RSS Sources
      ↓
/api/rss
      ↓
main.js
      ↓
Normalize
      ↓
Score
      ↓
Deduplicate
      ↓
Top Stories + Category Cards
      ↓
Render
```

`sources.js` is the single source of truth for all RSS feeds.

## Development Workflow

1. Make changes.
2. Test.
3. Commit.

```bash
git add .
git commit -m "Describe change"
git push
```

Vercel automatically deploys the latest version after every push.

## Current Priorities

1. Expand RSS sources.
2. Improve feed quality.
3. Improve ranking.
4. Improve deduplication.
5. Add configurable dashboard cards.

## Long-Term Vision

Scorpion is intended to evolve into a customizable dashboard where every card can represent a different information source.

Examples include:

* Gaming
* Technology
* AI
* Markets
* World News
* Weather
* Reddit
* GitHub
* Calendar
* Personal notes

Each card should eventually be configurable, movable, and removable by the user.

The focus remains on building a homepage that is genuinely useful to visit every day.
