# Project Scorpion

Project Scorpion is a personal intelligence dashboard designed to become a useful browser homepage.

The long-term goal is not simply to display RSS feeds. Scorpion should collect information from multiple sources, identify the stories that matter, and organize them into configurable cards for topics such as gaming, sports, markets, AI, technology, weather, Reddit, GitHub, calendars, and personal notes.

## Current status

Scorpion is an early working product. It currently includes:

- Sports, gaming, and markets cards.
- Multiple RSS sources for each category.
- A global Top Stories card.
- A serverless RSS proxy with short-term caching.
- Basic headline scoring and title-based deduplication.
- HOT and NEW labels.
- Loading placeholders and simple animations.
- A responsive card layout.

The current priority is making the existing feeds reliable before adding more cards or customization.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the active checklist and upcoming phases.

## Project structure

```text
Project Scorpion/
├── api/
│   └── rss.js          Fetches and caches external RSS feeds
├── public/
│   ├── index.html      Page structure and visual styles
│   ├── main.js         Feed loading, scoring, deduplication, and rendering
│   └── sources.js      Central registry of categories and RSS sources
├── .editorconfig       Shared text-formatting rules
├── .gitignore          Files Git should not save
├── PROJECT_PLAN.md     Living roadmap and checklist
└── README.md           Project introduction and setup guide
```

## How the dashboard works

When the dashboard loads:

1. `public/sources.js` provides the categories and RSS feed addresses.
2. `public/main.js` requests each feed through `/api/rss`.
3. `api/rss.js` fetches the external RSS data and caches it briefly.
4. `public/main.js` parses and normalizes the returned stories.
5. The stories are scored and deduplicated.
6. The highest-ranked stories appear in Top Stories and the category cards.

```text
RSS sources
    ↓
/api/rss
    ↓
Parse and normalize
    ↓
Score and deduplicate
    ↓
Top Stories and category cards
```

## Before making changes

Use this short safety check:

- [ ] Save any open files in VS Code.
- [ ] Confirm the previous feature is complete.
- [ ] Make one focused change at a time.
- [ ] Test the dashboard after the change.
- [ ] Review the changed files before committing.

Codex can edit the files in this project folder directly. You do not need to copy and paste replacement code. Avoid editing the same file in VS Code while Codex is actively changing it.

## Running the project locally

Scorpion uses a Vercel serverless function, so opening `public/index.html` directly is not enough to test the complete application. The `/api/rss` route also needs to run.

### Requirements

- [Node.js](https://nodejs.org/) installed.
- A terminal opened in the Project Scorpion folder.
- Internet access for downloading the Vercel development tool and loading RSS feeds.

### Start the local development server

Run:

```powershell
npx vercel dev
```

The first run may ask you to sign in or confirm project settings. After the server starts, it will display a local address, commonly `http://localhost:3000`. Open that address in your browser.

Stop the local server by clicking its terminal and pressing `Ctrl+C`.

## Saving and deploying changes

The project uses this path:

```text
Local project → Git commit → GitHub → Vercel deployment
```

In plain language:

1. Files are changed and tested on this computer.
2. A Git commit creates a named restore point.
3. The commit is pushed to GitHub.
4. Vercel detects the GitHub update and deploys it.

Do not commit or push a change until it has been reviewed and tested. Follow the beginner-safe checklist in [WORKFLOW.md](WORKFLOW.md).

## Important project rules

- `public/sources.js` is the single source of truth for RSS feeds.
- Preserve the current architecture unless a requested feature requires a change.
- Prefer small, complete improvements over broad rewrites.
- Never place passwords, access tokens, or other secrets in the project files.
- Do not add a database, framework, or dependency without a clear product need.
- Prioritize feed quality, ranking, and deduplication before customization.

## Current limitations

The project is functional, but several areas still need work:

- The live refresh system does not yet fetch and display new stories reliably.
- Some RSS sources need to be checked for availability.
- Story timestamps do not yet use the articles' real publication times.
- Ranking still contains a random score adjustment.
- Deduplication only catches closely matching titles.
- Automated tests have not been added yet.

These are planned improvements, not reasons to rewrite the application.
