# Skill Hunter

An interview preparation hub for **Angular, JavaScript, TypeScript, UI Engineering** (HTML5, CSS, SCSS, Responsive Design), and **Frontend System Design**. Built with Angular 22 (standalone components, Signals). The core app is still frontend-only — all content ships as static JSON, all progress lives in the browser's `localStorage`, no database — with one optional add-on: an **AI Mentor** chat feature backed by a single serverless function, so the app stays statically deployable while still supporting a real AI integration when you want one.

Built from [angular-interview-prep-app-lld.md](angular-interview-prep-app-lld.md), the low-level design doc this app follows.

## What's in the box

- **Dashboard** — overall progress, per-subject progress, continue learning, must-revise, bookmarks count, practice summary.
- **Subjects** — Angular, JavaScript, TypeScript, UI Engineering, and Frontend System Design, each with categories and topics (difficulty, interview priority, search/filter).
- **Topic pages** — concept explanations, code examples with copy-to-clipboard, tricky/interview/scenario/output questions with hide-and-reveal answers, common mistakes, confidence rating, mark-complete, bookmarking, add-to-revision, and an "Ask AI" shortcut into the AI Mentor with the current topic as context.
- **Practice mode** — filter by subject/category/difficulty/question type/bookmarked/weak topics, self-assess (correct / incorrect / needs revision).
- **AI Mentor** — a chat interface for on-demand explanations, generated practice questions, and feedback on your own answers, backed by a serverless proxy function (see [AI Mentor](#ai-mentor)).
- **Bookmarks** — bookmarked topics and questions in one place.
- **Progress** — subject/category completion, strong areas, weak areas, most-revised and recently-studied topics, practice accuracy.
- **Revision** — auto-surfaced weak topics (low confidence, incorrect attempts, bookmarks, manual adds) plus mark-revised tracking.
- **Settings** — light/dark theme, default difficulty, auto-reveal answers, export/import progress as JSON, reset progress.

Starter content ships with 78 topics across five subjects (260 content blocks): a dedicated **Coding Practice** category under JavaScript with 25 predict-the-output / write-the-code drills covering hoisting, closures, references, array methods, `this`, and the event loop; a **Frontend System Design** subject with 25 lead-level scenario questions (caching, performance, auth, RBAC, XSS/CSRF/CORS, BFF, state, offline/PWA, micro-frontends, observability, deployment); plus additional topics on Angular routing/forms/architecture, JavaScript modules/memory management, TypeScript conditional types/OOP, and SCSS — see [Adding content](#adding-content) to extend it further.

## Tech stack

- Angular 22, standalone components, Signals for state, RxJS for async/search
- SCSS with a small design-token system (`src/styles/`) and a mobile-first `respond-to()` breakpoint mixin
- Static JSON content under `public/content/`, fetched with `HttpClient`
- `localStorage` for progress, bookmarks, practice history, revision list, and settings (see `src/app/core/storage`)

## Development server

```bash
npm install
ng serve
```

Then open `http://localhost:4200/`. The app reloads automatically on source changes.

## Building

```bash
ng build
```

Build artifacts are written to `dist/skill-hunter`. Since there's no backend, the output can be deployed to any static host — the same URL can be shared with teammates as-is.

## Running unit tests

```bash
ng test
```

Runs the [Vitest](https://vitest.dev/) suite.

## Available scripts

| Command | What it does |
|---|---|
| `npm start` / `ng serve` | Runs the dev server at `http://localhost:4200` with live reload |
| `ng build` | Production build to `dist/skill-hunter` |
| `ng build --configuration development` | Unminified build, useful for debugging a deployed build |
| `ng test` | Runs the Vitest unit test suite |

## Routes

All feature routes are lazy-loaded (`loadComponent`) so the initial bundle only contains the app shell.

| Path | Screen |
|---|---|
| `/dashboard` | Dashboard (default redirect from `/`) |
| `/subjects` | Subject list |
| `/subjects/:subjectId` | Subject detail — categories, topics, filters |
| `/subjects/:subjectId/topics/:topicId` | Topic detail — concept, code, questions, answers |
| `/practice` | Practice mode (accepts optional `?subjectId=` / `?topicId=` query params) |
| `/ai-mentor` | AI Mentor chat (accepts optional `?subject=` / `?topic=` query params for context) |
| `/bookmarks` | Bookmarked topics and questions |
| `/progress` | Progress analytics |
| `/revision` | Auto-surfaced revision list |
| `/settings` | Theme, preferences, export/import/reset |

## Project structure

```text
src/app/
  core/
    models/       Shared TypeScript interfaces (content, progress, filters)
    storage/      localStorage wrapper + versioned storage keys
    services/     ContentService, ProgressStore, BookmarkService, PracticeService,
                  RevisionService, SettingsService, MetricsService, DataManagementService,
                  AiAssistantService
    layout/       App shell, header, sidebar, mobile nav, search, theme toggle
  shared/
    components/   Reusable UI: cards, chips, code block, question card, filters, etc.
  features/
    dashboard/  subjects/  topics/  practice/  ai-mentor/  bookmarks/  progress/  revision/  settings/

public/content/
  subjects.json         Subject + category + topic-summary metadata (all 5 subjects)
  angular/topics.json, angular/topics-extended.json
  javascript/topics.json, javascript/coding-practice.json, javascript/topics-extended.json
  typescript/topics.json, typescript/topics-extended.json
  ui/topics.json, ui/topics-extended.json
  system-design/topics.json   25 lead-level frontend system-design scenarios

netlify/functions/
  ai-chat.mjs    Serverless proxy that holds the AI provider's API key server-side
                and forwards chat requests from AiAssistantService
```

## Adding content

Content is plain JSON, so adding a topic doesn't require touching application code:

1. Add the topic's full content (concept/code-example/question/common-mistake blocks) to the relevant `public/content/<subject>/topics.json` file, following the existing shape.
2. Add a matching `TopicSummary` entry (same `id`, `difficulty`, `interviewPriority`, `tags`, etc.) under the right category in `public/content/subjects.json`.
3. Keep topic `id`s stable once shipped — user progress is keyed by topic id.

As a subject's content grows, its `topics.json` can be split into multiple files (e.g. one per category); `ContentService` already loads a subject's files as a list, so only the manifest in `content.service.ts` needs an extra entry.

## Data & privacy

All user data (progress, bookmarks, practice history, revision list, settings) stays in the browser's `localStorage` under the `interview-prep.*` keys — nothing is sent to a server. Use **Settings → Export Progress** to back it up or move it to another device, and **Import Progress** to restore it.

Local data is versioned (`STORAGE_KEYS`, `CURRENT_DATA_VERSION` in `src/app/core/storage/storage-keys.ts`) so a future release can migrate older saved data instead of discarding it.

The one exception is the AI Mentor feature: messages you send there are forwarded through the serverless function to the configured AI provider (and are subject to that provider's own data handling policy) so a response can be generated — the function itself doesn't log, store, or persist chat content anywhere.

## AI Mentor

The AI Mentor page (`/ai-mentor`) is a chat UI (`src/app/features/ai-mentor`) that calls `AiAssistantService`, which `POST`s to `/api/ai-chat`. That path is never called directly against an AI provider from the browser — it's redirected (see `netlify.toml`) to a Netlify serverless function at `netlify/functions/ai-chat.mjs`, which is the **only** place an API key is ever used. This keeps the app statically deployable (no server to run yourself) while still supporting a real, safely-keyed AI backend.

**Why not call the AI provider straight from Angular?** Provider APIs don't allow direct browser calls with a bearer key — the key would be visible to anyone who opens dev tools, and most providers reject browser-origin requests outright. A thin serverless proxy is the standard, minimal way to add a real AI feature to an otherwise backend-free static app.

The backend calls **Google's Gemini API** (`gemini-2.5-flash` by default), chosen for its genuinely free tier — a good fit for a personal project a handful of people demo occasionally. Two things worth knowing before you rely on it:
- Free-tier requests may be used by Google to improve their models — fine for interview-prep chat, but never point this at proprietary/confidential content.
- The free tier only applies while **billing is disabled** on the Google Cloud project — enabling billing (e.g. to raise limits) removes the free tier entirely for that project, so keep a separate project if you ever need a paid tier.

The function also checks a shared token (`x-app-token` header, `APP_SHARED_TOKEN` env var) before calling the API — this is **not** real authentication (the token ships in the built JS bundle, so anyone reading the client code can find it), it's just a deterrent against random bots hitting the endpoint directly and burning the shared free quota. The API key itself is what's actually protected, and it never leaves the function.

If the function isn't deployed/configured, the UI degrades gracefully — the chat shows a clear inline error instead of hanging or throwing, including a distinct message when the daily quota is exhausted (HTTP 429).

### Local setup

```bash
npm install -g netlify-cli   # one-time
cp .env.example .env         # then fill in your real key — .env is git-ignored
netlify dev
```

`netlify dev` runs the Angular dev server *and* emulates the Netlify function together, proxied through `http://localhost:8888`, so `/api/ai-chat` actually works locally. Plain `ng serve` (port 4200) does **not** run the function — the AI Mentor page will show a "could not reach the AI backend" message, which is expected; everything else in the app works normally.

### Production setup

1. Deploy the site to Netlify (see [Deploy](#deploy-to-github--netlify) below).
2. Get a free API key at [aistudio.google.com](https://aistudio.google.com) → **Get API key** → create it in a **new** Google Cloud project (no credit card required, no billing enabled).
3. In the Netlify dashboard: **Site configuration → Environment variables**, add `GEMINI_API_KEY` and `APP_SHARED_TOKEN` (must exactly match the constant in `ai-assistant.service.ts`; optionally also `AI_MODEL`, default `gemini-2.5-flash`). Never put the real key in a committed file.
4. Redeploy (or trigger a new deploy) so the function picks up the variables.

### Swapping providers

`netlify/functions/ai-chat.mjs` is a single file that calls Gemini's `generateContent` endpoint with plain `fetch` — no SDK dependency. To use a different provider, change the request URL/shape inside that one file (and the response-parsing line at the bottom); nothing on the Angular side needs to change beyond the request/response shape, since `AiAssistantService` only knows about `/api/ai-chat` and a `{ reply: string }` response.

## Deploy to GitHub + Netlify

1. **GitHub**: create a new repository (via github.com or `gh repo create`), then:
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. **Netlify**: in the Netlify dashboard, **Add new site → Import an existing project**, connect the GitHub repo. Netlify reads `netlify.toml` automatically:
   - Build command: `npm run build`
   - Publish directory: `dist/skill-hunter/browser`
   - Functions directory: `netlify/functions`
   - SPA fallback and the `/api/*` → function redirect are already configured.
3. Add the `GEMINI_API_KEY` and `APP_SHARED_TOKEN` environment variables (see above) before or after the first deploy, then deploy.
4. Every push to the connected branch redeploys automatically.

Static hosts other than Netlify (Vercel, GitHub Pages, S3 + CloudFront, etc.) work fine for the core app, but you'd need an equivalent serverless function mechanism on that platform for the AI Mentor feature specifically — everything else in the app has no server dependency at all.

## Design notes

- **State**: Signals are used for all local/reactive app state (`ProgressStore`, `BookmarkService`, `PracticeService`, `RevisionService`, `SettingsService`); RxJS is reserved for genuinely asynchronous work — loading content over HTTP and debouncing the search box (`core/layout/search`).
- **Responsive layout**: mobile-first SCSS via `src/styles/_breakpoints.scss`'s `respond-to()` mixin. The sidebar (desktop) and bottom nav (mobile) are both in the DOM; CSS media queries decide which one is visible, so there's no layout flash on resize.
- **Theming**: light/dark theme is driven by a `data-theme` attribute on `<html>`, set from `SettingsService` and persisted to `localStorage`.
- **Content vs. progress are separate concerns**: `ContentService` only ever reads static JSON; nothing it does can mutate a user's saved progress, and nothing in the progress/bookmark/practice/revision services depends on how content is loaded.

## Known limitations (by design, for this initial version)

- No login, cloud sync, or database — progress is local to one browser. The one exception to "no backend" is the single AI Mentor proxy function, which holds no user data at all (it only forwards chat text to the AI provider).
- Code snippets are rendered as text, never executed.
- The starter content set (37 topics) is intentionally a seed, not the full ~450-question target described in the design doc — see [Adding content](#adding-content).
- AI Mentor responses are not streamed (a full reply arrives at once, not token-by-token) — see Roadmap.

## Roadmap

Ideas for future iterations: streaming AI Mentor responses (token-by-token, via a Fetch `ReadableStream` from the Netlify function), a sandboxed code playground, PWA/offline support, and team-mode features (shared question sets, leaderboards). All of these would layer on top of the existing content/progress separation without requiring a rewrite.
