# Skill Hunter

An interview preparation hub for **Angular, JavaScript, TypeScript, UI Engineering** (HTML5, CSS, SCSS, Responsive Design), and **Frontend System Design**. Built with Angular 22 (standalone components, Signals). The app is still frontend-first — all content ships as static JSON, all progress lives in the browser (scoped per account, no database) — with two optional add-ons that go beyond a static content site: a real, sandboxed **JavaScript Playground**, and an **AI Mentor** chat backed by a single serverless function.

**Author:** Roshan Mali

## What's in the box

- **Login / Register** — a real account system (register, sign in, log out) so progress, bookmarks, streaks, and settings are kept separate per person on a shared browser or deployment. Passwords are hashed client-side with PBKDF2-SHA256 via the Web Crypto API — see [Accounts & data](#accounts--data) for what this does and doesn't protect against.
- **Dashboard** — overall progress donut, topics-by-difficulty breakdown, per-subject progress, study streak, continue learning, must-revise, recent bookmarks, practice summary, strong areas, most-revised and recently-studied topics.
- **Subjects** — Angular, JavaScript, TypeScript, UI Engineering, and Frontend System Design, each with categories and topics (difficulty, interview priority, search/filter).
- **Topic pages** — concept explanations, code examples with copy-to-clipboard, tricky/interview/scenario/output questions with hide-and-reveal answers, common mistakes, confidence rating, mark-complete, bookmarking, add-to-revision, and an "Ask AI" shortcut into the AI Mentor with the current topic as context.
- **Practice mode** — filter by subject/category/difficulty/question type/bookmarked/weak topics, with a live "N questions match your filters" count before you commit, then self-assess (correct / incorrect / needs revision).
- **JavaScript Playground** — a real code editor (CodeMirror, syntax highlighting) that runs your JavaScript in a sandboxed Web Worker, so an infinite loop times out cleanly instead of freezing the tab. Comes preloaded with all 25 of the app's coding-practice questions as runnable snippets. See [JavaScript Playground](#javascript-playground).
- **Study Calendar** — automatic daily study-time tracking, current/longest streaks with milestone messages, a GitHub-style contribution heatmap, and a navigable month calendar where clicking a day shows exactly which topics you touched. See [Study Calendar](#study-calendar).
- **AI Mentor** — a chat interface for on-demand explanations, generated practice questions, and feedback on your own answers, backed by a serverless proxy function (see [AI Mentor](#ai-mentor)). Responses render as real formatted markdown (headings, code blocks, lists), not raw text.
- **Bookmarks** — bookmarked topics and questions in one place.
- **Revision** — auto-surfaced weak topics (low confidence, incorrect attempts, bookmarks, manual adds) plus mark-revised tracking.
- **Settings** — light/dark theme, default difficulty, auto-reveal answers, export/import progress as JSON, reset progress.

Starter content ships with 78 topics across five subjects: **Angular** (12), **JavaScript** (18, including a dedicated **Coding Practice** category with 25 predict-the-output / write-the-code drills covering hoisting, closures, references, array methods, `this`, and the event loop), **TypeScript** (11), **UI Engineering** (12), and **Frontend System Design** (25 lead-level scenario questions — caching, performance, auth, RBAC, XSS/CSRF/CORS, BFF, state, offline/PWA, micro-frontends, observability, deployment). See [Adding content](#adding-content) to extend it further.

## Tech stack

- Angular 22, standalone components, Signals for state, RxJS for async/search
- SCSS with a small design-token system (`src/styles/`) and a mobile-first `respond-to()` breakpoint mixin
- A self-authored icon component (`shared/components/icon`) — a fixed set of inlined SVG paths, no icon-library dependency or bundle weight beyond what's actually used
- [CodeMirror 6](https://codemirror.net/) for the Playground editor, lazy-loaded only on that route
- Web Crypto API (`crypto.subtle`) for PBKDF2 password hashing — no auth library or backend
- Static JSON content under `public/content/`, fetched with `HttpClient`
- `localStorage` for progress, bookmarks, practice history, revision list, settings, activity, and the account list (see `src/app/core/storage`)

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

Build artifacts are written to `dist/skill-hunter`. Since there's no backend for the core app, the output can be deployed to any static host — the same URL can be shared with teammates as-is.

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

All feature routes are lazy-loaded (`loadComponent`) so the initial bundle only contains the app shell. Every route below except `/login` and `/register` requires an account (`authGuard`); `/login` and `/register` bounce an already-signed-in user back to the dashboard (`guestGuard`).

| Path | Screen |
|---|---|
| `/login` | Sign in |
| `/register` | Create an account |
| `/dashboard` | Dashboard (default redirect from `/`) |
| `/subjects` | Subject list |
| `/subjects/:subjectId` | Subject detail — categories, topics, filters |
| `/subjects/:subjectId/topics/:topicId` | Topic detail — concept, code, questions, answers |
| `/practice` | Practice mode (accepts optional `?subjectId=` / `?topicId=` query params) |
| `/playground` | JavaScript Playground |
| `/ai-mentor` | AI Mentor chat (accepts optional `?subject=` / `?topic=` query params for context) |
| `/calendar` | Study Calendar — streaks, heatmap, daily goal |
| `/bookmarks` | Bookmarked topics and questions |
| `/revision` | Auto-surfaced revision list |
| `/settings` | Theme, preferences, export/import/reset |

## Project structure

```text
src/app/
  core/
    models/       Shared TypeScript interfaces (content, progress, filters, auth)
    storage/      localStorage wrapper (scoped per account) + versioned storage keys
    guards/       authGuard, guestGuard
    services/     ContentService, ProgressStore, BookmarkService, PracticeService,
                  RevisionService, SettingsService, MetricsService, DataManagementService,
                  AiAssistantService, AuthService, ActivityService, CodeRunnerService
    layout/       App shell, header (user menu), sidebar (search + nav), mobile nav, theme toggle
  shared/
    components/   Reusable UI: cards, chips, code block, question card, charts, icon, filters, etc.
  features/
    auth/  dashboard/  subjects/  topics/  practice/  playground/  ai-mentor/
    calendar/  bookmarks/  revision/  settings/

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

## Accounts & data

Registering creates an account entirely in `localStorage` — there's no backend, no database, and nothing is sent anywhere. Passwords are hashed with **PBKDF2-SHA256** (120,000 iterations, a random per-user salt) via the browser's native Web Crypto API before ever touching storage; the plaintext password itself is never persisted.

Every account gets its **own** namespaced progress, bookmarks, practice history, revision list, settings, and study activity — `StorageService` transparently prefixes every key by the signed-in user's id, so two people using the same browser (or the same deployed link) don't see each other's data. The very first account ever created on a browser automatically inherits whatever progress already existed there from before accounts existed, so switching this on doesn't look like data loss.

**This is real hashing, not real security.** There's no server validating anything — someone with access to the same browser's dev tools could inspect the account list directly in `localStorage`. That's an inherent limit of a backend-free app, not a bug: treat this like any other local-only demo account, and don't reuse a password here that protects something that actually matters.

Use **Settings → Export Progress** to back up the current account's data or move it to another device, and **Import Progress** to restore it. Local data is versioned (`STORAGE_KEYS`, `CURRENT_DATA_VERSION` in `src/app/core/storage/storage-keys.ts`) so a future release can migrate older saved data instead of discarding it.

The one exception to "nothing leaves the browser" is the AI Mentor: messages you send there are forwarded through the serverless function to the configured AI provider (and are subject to that provider's own data handling policy) so a response can be generated — the function itself doesn't log, store, or persist chat content anywhere.

## Study Calendar

The Calendar page (`/calendar`) turns raw usage into a daily habit loop instead of a static log:

- **Time tracking**: `ActivityService` runs a 15-second heartbeat while the tab is visible and focused, crediting time to today's bucket. Switching tabs or minimizing pauses it automatically — nothing is tracked in the background.
- **Streaks**: current and longest consecutive-day streaks, with a one-day grace period (today doesn't break your streak until the day actually ends without any activity).
- **Milestones**: dynamic copy like "6 more days to your 14-day streak badge" pulls you back rather than just showing a number.
- **Heatmap + month view**: an 18-week GitHub-style contribution grid, plus a full month calendar where every day is clickable to see the exact topics visited or completed that day.
- **Daily goal**: an editable target (default 20 min) with a live progress bar.

## JavaScript Playground

The Playground (`/playground`) lets you write and run real JavaScript safely:

- Code executes inside a **Web Worker** — its own thread, no DOM access, isolated from the rest of the app. `console.log/warn/error` are captured and streamed back as structured messages.
- If a run doesn't finish within **4 seconds**, the worker is terminated and the console shows a clear "execution timed out — check for an infinite loop" message. Verified against an actual `while (true) {}`: the UI stays fully responsive throughout.
- The snippet picker loads all 25 of the app's existing coding-practice questions (hoisting, closures, `this`/call/apply/bind, promises, the event loop, group-by, etc.), grouped by topic — so it's tied to real interview content, not a blank editor.
- The editor is [CodeMirror 6](https://codemirror.net/), lazy-loaded only on this route so it doesn't affect the app's initial bundle size.

## Design & UX notes

- **State**: Signals are used for all local/reactive app state (`ProgressStore`, `BookmarkService`, `PracticeService`, `RevisionService`, `SettingsService`, `AuthService`, `ActivityService`); RxJS is reserved for genuinely asynchronous work — loading content over HTTP and debouncing the search box.
- **Responsive layout**: mobile-first SCSS via `src/styles/_breakpoints.scss`'s `respond-to()` mixin. The sidebar (desktop) and bottom nav (mobile, with a "More" sheet for overflow items) are both in the DOM; CSS media queries decide which one is visible, so there's no layout flash on resize.
- **Theming**: light/dark theme is driven by a `data-theme` attribute on `<html>`, set from `SettingsService` and persisted to `localStorage`.
- **Sticky footer**: the app footer uses the classic `margin-top: auto` flexbox technique so it sits at the bottom of the viewport on short pages instead of floating mid-page, and scrolls normally below content on tall pages.
- **Content vs. progress are separate concerns**: `ContentService` only ever reads static JSON; nothing it does can mutate a user's saved progress, and nothing in the progress/bookmark/practice/revision services depends on how content is loaded.

## AI Mentor

The AI Mentor page (`/ai-mentor`) is a chat UI (`src/app/features/ai-mentor`) that calls `AiAssistantService`, which `POST`s to `/api/ai-chat`. That path is never called directly against an AI provider from the browser — it's redirected (see `netlify.toml`) to a Netlify serverless function at `netlify/functions/ai-chat.mjs`, which is the **only** place an API key is ever used. This keeps the app statically deployable (no server to run yourself) while still supporting a real, safely-keyed AI backend.

**Why not call the AI provider straight from Angular?** Provider APIs don't allow direct browser calls with a bearer key — the key would be visible to anyone who opens dev tools, and most providers reject browser-origin requests outright. A thin serverless proxy is the standard, minimal way to add a real AI feature to an otherwise backend-free static app.

The backend calls **Google's Gemini API** (`gemini-flash-latest` by default), chosen for its genuinely free tier — a good fit for a personal project a handful of people demo occasionally. Two things worth knowing before you rely on it:
- Free-tier requests may be used by Google to improve their models — fine for interview-prep chat, but never point this at proprietary/confidential content.
- The free tier only applies while **billing is disabled** on the Google Cloud project — enabling billing (e.g. to raise limits) removes the free tier entirely for that project, so keep a separate project if you ever need a paid tier.

The function also checks a shared token (`x-app-token` header, `APP_SHARED_TOKEN` env var) before calling the API — this is **not** real authentication (the token ships in the built JS bundle, so anyone reading the client code can find it), it's just a deterrent against random bots hitting the endpoint directly and burning the shared free quota. The API key itself is what's actually protected, and it never leaves the function.

Responses are rendered through a small self-written markdown parser (`src/app/shared/markdown.ts`) — headings, bold/italic, inline and fenced code, and lists all render properly instead of showing raw `###`/`**` syntax. It escapes all input first and only ever emits a fixed set of whitelisted tags it builds itself, so it's safe to render even though the source is LLM output.

If the function isn't deployed/configured, the UI degrades gracefully — the chat shows a clear inline error instead of hanging or throwing, including a distinct message when the daily quota is exhausted (HTTP 429) and when a reply hits the length limit mid-answer.

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
3. In the Netlify dashboard: **Site configuration → Environment variables**, add `GEMINI_API_KEY` and `APP_SHARED_TOKEN` (must exactly match the constant in `ai-assistant.service.ts`; optionally also `AI_MODEL`, default `gemini-flash-latest`). Never put the real key in a committed file.
4. Redeploy (or trigger a new deploy) so the function picks up the variables.

### Swapping providers

`netlify/functions/ai-chat.mjs` is a single file that calls Gemini's `generateContent` endpoint with plain `fetch` — no SDK dependency. To use a different provider, change the request URL/shape inside that one file (and the response-parsing line at the bottom); nothing on the Angular side needs to change beyond the request/response shape, since `AiAssistantService` only knows about `/api/ai-chat` and a `{ reply: string }` response.

## Deploy to GitHub + Netlify

1. **GitHub**: create a new repository (via github.com or `gh repo create`), then:
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin master
   ```
2. **Netlify**: in the Netlify dashboard, **Add new site → Import an existing project**, connect the GitHub repo. Netlify reads `netlify.toml` automatically:
   - Build command: `npm run build`
   - Publish directory: `dist/skill-hunter/browser`
   - Functions directory: `netlify/functions`
   - SPA fallback and the `/api/*` → function redirect are already configured.
3. Add the `GEMINI_API_KEY` and `APP_SHARED_TOKEN` environment variables (see above) before or after the first deploy, then deploy.
4. Every push to the connected branch redeploys automatically.

Since the whole app is now gated behind login, the first account registered on a fresh deployment automatically inherits any data that already existed there from before accounts existed (see [Accounts & data](#accounts--data)) — make sure that first registration on a live site is your own.

Static hosts other than Netlify (Vercel, GitHub Pages, S3 + CloudFront, etc.) work fine for the core app, but you'd need an equivalent serverless function mechanism on that platform for the AI Mentor feature specifically — everything else in the app has no server dependency at all.

## Known limitations (by design, for this version)

- No cloud sync or database — progress is local to one browser, scoped per account. The one server-side exception is the AI Mentor proxy function, which holds no user data at all (it only forwards chat text to the AI provider).
- Accounts are a real client-side implementation (hashed passwords, per-account data) but not a real security boundary — see [Accounts & data](#accounts--data).
- The starter content set (78 topics) is intentionally a seed, not the full ~450-question target described in the original design doc — see [Adding content](#adding-content).
- AI Mentor responses are not streamed (a full reply arrives at once, not token-by-token) — see Roadmap.

## Roadmap

Ideas for future iterations: streaming AI Mentor responses (token-by-token, via a Fetch `ReadableStream` from the Netlify function), a confidence-driven spaced-repetition revision queue (replacing manual "add to revision" with automatic due-dates), a readiness score per subject (derived from confidence + accuracy + recency instead of raw completion %), an AI-graded mock-interview mode, PWA/offline support, and a public prerendered landing page + topic pages for organic search. All of these would layer on top of the existing content/progress separation without requiring a rewrite.

---

**Author:** Roshan Mali
