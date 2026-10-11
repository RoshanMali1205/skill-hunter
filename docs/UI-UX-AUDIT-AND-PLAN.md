**Skill Hunter — UI/UX audit and improvement plan**

Review date: 11 October 2026. Scope: the current local working tree, including the newly added Mock Interview feature. This is an assessment and implementation plan; application source was not changed for this review.

**1. Assessment and evidence limits**

Skill Hunter has the components of a useful interview preparation workspace. Its biggest opportunity is to make the learner's next action obvious and make each interaction dependable. Visual improvements should reinforce that learning workflow.

The review covered route configuration, every routed feature's template, shared controls, layout styles, design tokens, and the services governing content, practice, revision, notes, storage, and backup. The existing `skill-hunter-login.png` was visually inspected. No browser session was available through the Browser integration, so authenticated screens, current mobile rendering, keyboard interactions, and screenshots could not be tested live.

Evidence labels used below:

- **Confirmed in source:** the behavior or missing implementation is visible in the inspected code. This does not imply a browser reproduction was performed.
- **Design recommendation:** a proposed improvement based on the app's information structure and intended tasks; validate with users.
- **Needs browser validation:** a likely layout or visual risk that requires rendered measurements before declaring a defect.
- **Existing screenshot:** an observation from the saved login image, which may predate the current source.

The working tree contained pre-existing changes and changed during the review as Mock Interview was wired into navigation. Findings describe the inspected snapshot. Recheck referenced files before implementation. No overall visual score or accessibility compliance claim is warranted without the live review.

**2. Understanding the product**

The app supports interview preparation across Angular, JavaScript, TypeScript, UI Engineering, Frontend System Design, Design Patterns, and AI Concepts. The inspected subject catalog contains **385 listed topics in 51 categories across seven subjects**. These are catalog entries counted from `public/content/subjects.json`; they are not a reconciliation of every content file. The README's topic totals differ from this working-tree snapshot.

Likely user groups, treated as hypotheses for validation:

| User | Main task | What the interface must support |
|---|---|---|
| A learner preparing for an upcoming interview | Decide what to study in a limited session | A suggested starting point, bounded practice sessions, relevant revision |
| A returning learner | Resume without reconstructing context | Continue action, saved filters, preserved reading position |
| An experienced developer | Find a particular concept or scenario quickly | Dependable search, clear categories, readable code, efficient controls |
| A learner on a phone | Read and revise between other activities | Reachable controls, simple navigation, reflow, draft preservation |

The primary workflow is:

**Choose a subject → learn a topic → try questions or code → compare an answer → rate confidence → revise → continue.**

AI Mentor supports explanation and feedback. Notes and bookmarks support recall. Calendar and achievements support motivation. Export supports offline study. Their placement should reflect those roles.

Accounts and progress are stored locally per browser account; this is not a synchronized account system. Content loads from static JSON. AI Mentor sends messages to a remote endpoint. These constraints materially affect onboarding, backup messaging, error states, and user trust.

Current routes include login, registration, dashboard, subjects, subject detail, topic detail, practice, Mock Interview, Playground, AI Mentor, calendar, bookmarks, notes, revision, achievements, export, and settings.

**3. Foundations worth retaining**

- Shared colors, spacing, radii, breakpoints, focus-ring and touch-target mixins already exist. Extend this system instead of introducing a second styling system.
- Subject/category/topic hierarchy is sensible. Subject pages already use compact topic rows and expose difficulty, priority, and status.
- Practice previews the matching question count before starting. Keep this useful feedback and distinguish loading from zero results.
- Topic pages support estimated duration, notes, bookmarks, confidence, completion, revision, listening, and contextual AI help.
- Mock Interview provides bounded sessions, optional typed answers, missed-question review, and next-topic recommendations. Its flow is a useful reference for improving standard practice.
- Many controls have labels and focus styles; confidence buttons already expose `aria-pressed`. Do not treat accessibility as absent everywhere.
- Donut and bar charts already show textual values. Preserve their legends and labels.
- Mobile navigation already handles safe-area padding. Login already uses autocomplete, a password visibility control, and announced error messages.
- Reset already requires typing RESET. AI failures already restore the attempted message to the composer. Preserve these protections.

**4. Priority definitions**

| Priority | Meaning | Delivery expectation |
|---|---|---|
| P0 | Loss of user work/data, or a core interaction that defeats its purpose | Resolve before expanding or restyling the affected flow |
| P1 | Frequent friction, weak orientation, inaccessible interaction, or a significant responsive risk | Include in the main UI improvement release |
| P2 | Readability, consistency, efficiency, or polish | Follow foundational work; combine related changes |

Effort estimates below are relative: **S** usually means up to a day, **M** about 1–3 days, and **L** several days with behavior/state changes. They are planning estimates, not commitments. Do not add row estimates mechanically because many findings share implementation work.

**5. Findings and concrete fixes**

**UX-01 · P0 · M — Protect unsaved work**

Confirmed in source: `note-editor.html` closes by emitting directly; the parent removes the editor. `NoteEditorComponent` detects `isDirty` but does not use it to protect close. Playground starts from `STARTER_CODE` on construction, and Reset or snippet selection replaces the editor content directly. Running Mock Interview state is held in component signals; no route-leave protection was found.

Impact: a learner can lose explanations, code, or an unfinished interview through ordinary navigation.

Fix: preserve note and code drafts locally under the active account and entity; use explicit Saved/Unsaved states. On replacement or close of a dirty draft, offer Save, Discard, and Keep editing. Protect a running interview with a leave confirmation; separately decide whether session resume is supported. Handle reload recovery through saved state where possible.

Acceptance: type a draft, navigate away and return, and recover it; canceling Reset/snippet replacement preserves code; a running interview cannot be silently discarded by an in-app route change. Never present Saved after a failed storage write.

Evidence: [note editor](../src/app/shared/components/note-editor/note-editor.html), [Playground state](../src/app/features/playground/playground.ts), [Mock Interview state](../src/app/features/mock-interview/mock-interview.ts), [routes](../src/app/app.routes.ts).

**UX-02 · P0 · M — Preview imports before replacing progress**

Confirmed in source: selecting a valid backup immediately calls `importFromJson`, which replaces progress, bookmarks, practice history, revision, settings, activity, notes, profile, and achievements. There is no preview or confirmation step.

Fix: parse and validate without writing first. Show the file date/version where available, counts, and exactly which existing data will be replaced. Offer a backup download of current data, then an explicit Replace action. Do not promise Merge until conflict rules exist. Define rollback behavior for partial write failures.

Acceptance: selecting a file leaves current data unchanged; Cancel is safe; invalid files do not mutate any store; confirmation states the overwrite scope; a failed commit reports its actual outcome and can restore the previous snapshot.

Evidence: [settings import](../src/app/features/settings/settings.ts), [data management](../src/app/core/services/data-management.service.ts).

**UX-03 · P0 · S–M — Reset answer visibility for every practice question**

Confirmed in source: `AnswerRevealComponent` holds a `manualOverride` without a question identity reset. Practice advances by updating `currentIndex` while rendering the same question-card branch. A manual reveal can therefore carry into the next question.

Fix: give the reveal component a question identity and reset on identity change, or render each question with identity-based component lifetime. Respect the explicit auto-reveal preference separately. Expose reveal state to self-assessment so the learner compares before rating, with an explicit skip path if needed.

Acceptance: with auto-reveal off, reveal question A, rate it, and verify B starts hidden. With auto-reveal on, every question remains intentionally revealed. Test manual hide and question transitions too.

Evidence: [answer reveal state](../src/app/shared/components/answer-reveal/answer-reveal.ts), [practice flow](../src/app/features/practice/practice.ts), [question card](../src/app/shared/components/question-card/question-card.html).

**UX-04 · P1 · M — Make global search dependable with a keyboard**

Confirmed in source: input blur schedules results to close after 150 ms, including when focus moves to a result. There is no arrow-key selection model or combobox relationship. Results use an initial empty array and have no loading/error display.

Fix: keep results open while focus remains within search; close on outside interaction or Escape. Support Up/Down, Enter, Escape, and coherent focus restoration. Use appropriate combobox/listbox semantics if implementing that pattern. Show Searching, result count, no-match guidance, and request failure separately. Avoid exposing stale results as results for a new term.

Acceptance: a keyboard-only learner can search, inspect results, open one, and dismiss the panel without a timed race. Slow loading does not show a premature no-results conclusion.

Evidence: [search template](../src/app/core/layout/search/search.html), [search behavior](../src/app/core/layout/search/search.ts).

**UX-05 · P1 · M — Repair shared selection controls**

Confirmed in source: `app-select` opens a listbox containing buttons but implements only click and Escape. There is no initial option focus, active option, arrow navigation, typeahead, or focus restoration after selecting a removed option. Settings and Mock Interview radio groups expose radio roles without a corresponding arrow-key model.

Fix: use native selects and native radio inputs for straightforward choices, styled through shared tokens. If custom widgets are retained, implement their full interaction model and semantics consistently, including disabled options and grouped labels.

Acceptance: keyboard users can open a select, navigate options, select, and continue with focus on the trigger; radio choices support expected arrow behavior; selection state is announced.

Evidence: [select behavior](../src/app/shared/components/select/select.ts), [select template](../src/app/shared/components/select/select.html), [settings](../src/app/features/settings/settings.html), [Mock Interview](../src/app/features/mock-interview/mock-interview.html).

**UX-06 · P1 · M — Give overlays coherent focus and dismissal behavior**

Confirmed in source: mobile More and mobile AI history use backdrops without modal focus handling, Escape handling, or visible close controls. The account popup declares menu semantics but has no menu-key navigation or managed focus. Its existing Escape handling should be retained. AI History's `aria-controls` references the chat area rather than its sidebar.

Fix: use one accessible sheet/dialog pattern for modal drawers, with a heading, close action, initial focus, focus containment, inert background, Escape, and restored focus. Use an ordinary disclosure/navigation pattern for the account popup unless full menu semantics are implemented. Give AI history its own controlled ID.

Acceptance: Tab cannot reach obscured content while a modal sheet is open; Escape and a visible close button work; closing returns focus to the opener; all control relationships refer to the correct element.

Evidence: [mobile navigation](../src/app/core/layout/mobile-nav/mobile-nav.html), [account menu](../src/app/core/layout/header/header.html), [AI Mentor](../src/app/features/ai-mentor/ai-mentor.html).

**UX-07 · P1 · S–M — Constrain the mobile More sheet**

Confirmed in source: the current overflow navigation contains nine destinations. Its fixed sheet has no maximum height or internal vertical scrolling. Actual clipping needs browser validation, especially in landscape and at zoom.

Fix: cap sheet height against the available dynamic viewport and safe areas; scroll its contents; keep its heading/close control reachable. Prevent background scrolling while modal.

Acceptance: every destination is reachable at 320px width, short landscape heights, enlarged text, and with browser chrome visible.

Evidence: [mobile destinations](../src/app/core/layout/mobile-nav/mobile-nav.ts), [sheet styles](../src/app/core/layout/mobile-nav/mobile-nav.scss).

**UX-08 · P1 · M — Separate loading, empty, missing, and failed states**

Confirmed in source: subject/topic signals start as undefined while their templates show "couldn't load" whenever no value exists. Lists and practice pools start empty, which can look like no content or no matching questions while loading. `ContentService` does not expose a recoverable load-state model. Request-error appearance has not been verified in a browser.

Fix: create explicit idle/loading/ready/empty/error states for content-driven screens. Use layout-matched skeletons, a specific not-found state for invalid IDs, and Retry for network failures. Keep previous content where useful during a filter refresh.

Acceptance: a slow valid request never flashes a not-found/error message; a failed request offers recovery; a genuine empty filter result offers Clear filters; Mock Interview also handles failed loading beyond its existing skeleton.

Evidence: [content service](../src/app/core/services/content.service.ts), [subject detail](../src/app/features/subjects/subject-detail.ts), [topic detail](../src/app/features/topics/topic-detail.ts), [practice](../src/app/features/practice/practice.ts).

**UX-09 · P1 · M — Make the dashboard lead with action**

Confirmed structure, design recommendation: profile, achievements, overall progress, difficulty distribution, streak, and subject progress precede Continue Learning. Several blocks repeat completion/streak information. Whether the resume action is below a particular viewport fold needs live measurement.

Fix: place a clear Resume topic or Start learning card directly after the greeting. Put revision and short practice alongside it. Consolidate progress and daily goal into a compact overview; move secondary insights and achievements lower.

Acceptance: new and returning learners each have a prominent, relevant action near the top; the empty dashboard offers a starting subject/topic; decoration and repeated metrics do not precede the primary task.

Evidence: [dashboard order](../src/app/features/dashboard/dashboard.html), [profile card](../src/app/shared/components/profile-card/profile-card.html).

**UX-10 · P1 · M — Organize navigation by purpose**

Confirmed structure, design recommendation: desktop now has 13 similarly weighted links. Mobile promotes AI Mentor while Revision is inside More. Navigation definitions are duplicated between desktop and mobile. Labels differ for Dashboard/Home.

Fix: group the desktop list into learning, review, and activity/tools, with one shared route definition. Keep route URLs stable while aligning visible labels. Prototype a bottom bar of Home, Subjects, Practice, Revision, More; put AI Mentor and Mock Interview in a practice/tools hub or More. Validate placement with actual usage before making it permanent.

Acceptance: people can find learning, practice, revision, and saved work without scanning a flat feature list; active routes expose `aria-current="page"`; desktop and mobile use matching terminology.

Evidence: [sidebar destinations](../src/app/core/layout/sidebar/sidebar.ts), [mobile destinations](../src/app/core/layout/mobile-nav/mobile-nav.ts).

**UX-11 · P1 · M — Make topic pages easier to read and act on**

Confirmed structure, design recommendation: a five-action header competes with the title, while confidence, completion, practice, revision, and AI actions are after all content. There is no section index or previous/next topic control. At tablet widths the header switches to a row with a non-shrinking action group; constrained rendering needs validation.

Fix: use a reading column around 65–75 characters, a section index on larger screens, and a compact jump-to-section control on phones. Keep Save and Note easy to reach; put secondary export/listening actions in overflow where appropriate. Add contextual Practice near questions, completion at a meaningful endpoint, and previous/next-topic navigation. Wrap toolbar separately from the title in narrow content panes.

Acceptance: a learner can locate Concept, Examples, Questions, Mistakes, and Summary without traversing the full page; long titles and actions fit at all target widths; bottom controls do not overlap mobile navigation.

Evidence: [topic template](../src/app/features/topics/topic-detail.html), [topic styles](../src/app/features/topics/topic-detail.scss).

**UX-12 · P1 · S–M — Preserve context between topics and practice**

Confirmed in source: `practiceAgain()` passes only `topicId`. Practice's `cameFromTopic` and direct-link fallback require both `subjectId` and `topicId`. This means a reloaded practice link from a topic does not retain the full intended return context. The CTA also always says Practice Again, including before the first attempt.

Fix: pass both IDs, retain a visible topic context chip, and provide Return to topic. Use Practice topic until repeat practice is meaningful. Preserve valid filters and context when starting a new round.

Acceptance: opening and reloading the generated practice URL still identifies the topic and provides the correct return destination.

Evidence: [topic practice shortcut](../src/app/features/topics/topic-detail.ts), [practice context](../src/app/features/practice/practice.ts).

**UX-13 · P1 · M — Repair the subject accordion/filter interaction**

Confirmed in source: `isCategoryOpen()` returns true whenever any filter is active. Clicking a category still changes the expanded set, but cannot collapse it while the filter remains active. The panel has no Clear all action, filter chips, or total match count.

Fix: auto-expand matching categories when filters change, then allow manual collapse. Display active filters and a single clear action. Show matching counts separately from overall category progress. Preserve filters, expanded rows, and reading position when returning from a topic.

Acceptance: categories remain controllable with active filters; Clear restores defaults in one action; filtered counts are understandable; Back returns to the same discovery context.

Evidence: [subject interaction](../src/app/features/subjects/subject-detail.ts), [filter panel](../src/app/shared/components/filter-panel/filter-panel.html).

**UX-14 · P1 · M — Bound ordinary practice sessions**

Confirmed in source: Start takes the entire matching pool, with no length selection, pause, skip, early finish, or session persistence. Results provide three counts and a restart action, with no question-level review. Ratings advance immediately. Users can rate before revealing the answer.

Fix: offer 5/10/20 questions or All, with an honest approximate duration. Rename Generate Questions to Start practice because this flow selects stored questions. Add skip and end-session controls; make rating/advance behavior explicit. Show reviewable results and Retry missed; avoid labeling self-ratings as externally verified performance.

Acceptance: a learner can start a short session, finish safely, identify what to revise, and retry relevant questions. An accidental rating has a defined recovery path.

Evidence: [practice flow](../src/app/features/practice/practice.html), [practice state](../src/app/features/practice/practice.ts).

**UX-15 · P1 · M–L — Make revision completion meaningful**

Confirmed in source: `completeRevision()` increments a count and removes only the manual list entry. `computeWeakTopics()` still includes low confidence, incorrect practice attempts, and all bookmarks. A bookmarked topic can remain after Mark Revised, and saving for reference is treated as weakness. No due-date logic supports the title Today's Revision.

Fix: separate Saved from Needs review. Add explicit reviewed/due state, using the latest review and later learning signals. Decide whether to offer a simple reviewed-today queue first or a later spaced-review schedule. Explain why each topic appears and what Mark reviewed changes.

Acceptance: Mark reviewed removes/snoozes the topic from today's actionable queue while retaining its history; bookmarks alone do not imply low confidence; later weak practice can reintroduce a topic. Rename the page to Revision queue until a today/due rule exists.

Evidence: [revision action](../src/app/features/revision/revision.ts), [weak-topic rules](../src/app/core/services/metrics.service.ts).

**UX-16 · P1 · S–M — Correct local-account and privacy messaging**

Confirmed in source and existing screenshot: the auth layout says accounts are local and "nothing leaves your device." The app includes a Google Analytics script, and AI Mentor sends messages to `/api/ai-chat`. The blanket claim is misleading.

Fix: explain what stays local, that accounts/progress do not automatically appear on another browser, and that AI requests leave the device. Add a short backup explanation during onboarding. Provide accurate recovery guidance for a local account; do not add a fake email-reset flow without the supporting service.

Acceptance: login/registration copy is accurate for this architecture and optional online features; a learner understands how to transfer study data and what happens when browser data is cleared.

Evidence: [auth copy](../src/app/features/auth/auth-layout/auth-layout.html), [analytics](../src/index.html), [AI request](../src/app/core/services/ai-assistant.service.ts).

**UX-17 · P1 · M — Validate semantic colors across all themes**

Confirmed token-level issue: Sunset `--color-primary` is `#e65100`; on a white surface it measures approximately **3.79:1**, below the normal-text target. Gradient endpoints also contain low-contrast foreground/background pairs. Endpoint calculations identify risk; they do not establish the contrast beneath every rendered label.

Fix: split link-text colors, button surfaces, on-button text, and decorative accents into separate semantic tokens. Use a solid accessible primary surface where gradients cannot support consistent label contrast. Keep accent choices without requiring one color to serve every role.

Acceptance: verify text at its actual background location for all seven accent families in light and dark modes; check hover, focus, selected, danger, and disabled presentation separately. Record measured results, not just palette values.

Evidence: [base palette](../src/styles/_variables.scss), [theme families](../src/styles/_color-themes.scss), [shared buttons](../src/styles/_utilities.scss).

**UX-18 · P1 · M — Preserve route focus and reading position**

Confirmed in source: router configuration does not enable scroll restoration/anchor scrolling, and no general route-heading focus manager or skip-to-content link was found. Individual Mock Interview actions scroll the window, but that is not a general policy.

Fix: focus the new route heading for forward navigation; restore the previous discovery location on Back. Provide a visible-on-focus Skip to content link. Add scroll offsets for sticky headers and preserve user context rather than unconditionally scrolling every interaction to the top.

Acceptance: keyboard navigation announces a new page in a useful location; Back from a topic returns to the prior category and scroll position; section links are not covered by the sticky header.

Evidence: [router setup](../src/app/app.config.ts), [shell](../src/app/core/layout/app-shell/app-shell.html).

**UX-19 · P1 · M — Surface save failures and complete feedback states**

Confirmed in source: storage writes call `localStorage.setItem` without a recoverable error result. Clipboard errors silently reset a flag. Several settings/export messages are plain paragraphs, and practice filter toggles do not expose `aria-pressed`. The note textarea lacks a persistent accessible label.

Fix: propagate actionable save errors; retain the draft on failure. Use a shared status/notification pattern, with undo where useful. Add announced success/error feedback and state semantics; label the note editor; give upload controls a visible focus treatment around the styled label.

Acceptance: storage-full/blocked cases do not produce false success; clipboard failure offers selectable text or guidance; controls expose their names and states; success feedback is readable and announced without moving focus unnecessarily.

Evidence: [storage writes](../src/app/core/storage/storage.service.ts), [copy code](../src/app/shared/components/code-block/code-block.ts), [settings messages](../src/app/features/settings/settings.html), [note input](../src/app/shared/components/note-editor/note-editor.html).

**UX-20 · P1 · M — Improve AI Mentor's responsive workspace**

Confirmed structure; layout impact needs browser validation: at 1024px the shell takes a 268px sidebar and 64px content padding; AI history takes another 300px plus a 16px gap. Only about 376px remains for the chat pane. This arithmetic uses configured widths, not a rendered measurement. Mobile uses a fixed viewport-derived height with a minimum and hidden overflow.

Fix: make history collapse based on available content width, rather than the same viewport breakpoint as the global sidebar. Test the composer with the mobile keyboard. Keep the active topic context visible and allow an explicit clear/switch. Offer Stop if cancellation is implemented; present temporary AI availability and retry clearly. Preserve the existing failed-draft restoration.

Acceptance: chat remains readable at the desktop-sidebar transition; keyboard opening never makes Send or the draft unreachable; new replies do not pull the reader away from older messages unnecessarily.

Evidence: [AI layout](../src/app/features/ai-mentor/ai-mentor.scss), [shell sizing](../src/app/core/layout/app-shell/app-shell.scss), [AI behavior](../src/app/features/ai-mentor/ai-mentor.ts).

**UX-21 · P1 · M — Clarify and protect Mock Interview interactions**

Confirmed structure: setup uses custom radio buttons; finish confirmation declares an alertdialog but has no explicit managed focus. Running-session data is component-local, and results show a percentage based on self-rating. This feature was added during the review and needs a fresh live pass.

Fix: reuse accessible selection/confirmation patterns, label the result Self-assessed score, and explain scoring and skipped answers. Focus/announce each new question and final result. Offer a clearly separate untimed practice option or adjustable timing decision while preserving the intended timed simulation. Announce meaningful timer milestones without speaking every second.

Acceptance: keyboard users can set up, answer, skip, finish, and review; exit protection works; the score's meaning is clear; a time-expiry event has readable feedback and retains the session result.

Evidence: [Mock Interview interface](../src/app/features/mock-interview/mock-interview.html), [session behavior](../src/app/features/mock-interview/mock-interview.ts).

**UX-22 · P2 · M — Reduce visual competition and false click cues**

Confirmed in source, design recommendation: gradients and shadows are applied to buttons, icons, tiles, progress areas, and profile surfaces. Dashboard's ordinary information sections use `card-interactive`, which lifts them on hover even when the section itself is not a link.

Fix: use flat neutral reading surfaces, restrained borders, and one emphasized primary action per action group. Reserve elevation/hover lift for actual interactive containers. Use decorative gradients sparingly in brand or milestone areas. Keep subject identification but avoid coloring every inner element.

Acceptance: users can distinguish clickable cards from informational cards; learning content has a calmer visual hierarchy; secondary controls do not compete with the main action.

Evidence: [dashboard cards](../src/app/features/dashboard/dashboard.scss), [interaction mixin](../src/styles/_mixins.scss), [subject cards](../src/app/shared/components/subject-card/subject-card.scss).

**UX-23 · P2 · M — Standardize typography and density**

Confirmed in source, design recommendation: body is 15px, headings and metadata vary locally, and topic content can use the broad shell width. Standard controls are 48px, header controls 40px, and the shared action mixin overrides its 44px touch target to 40px. These sizes do not by themselves prove a WCAG minimum-target failure.

Fix: introduce explicit UI/reading/metadata type tokens, line-height tokens, and control sizes. Aim for 16–18px lesson text, 14–16px interface text, and generous 44–48px touch targets. Give paragraphs a reading measure; allow full titles to wrap where needed, especially long subject names currently clamped to one line.

Acceptance: text is readable without zoom, controls have consistent emphasis and hit areas, and meaningful titles remain available at narrow widths. Verify actual font sizes and wrapping in the browser.

Evidence: [typography](../src/styles/_typography.scss), [control mixins](../src/styles/_mixins.scss), [subject title clamp](../src/app/shared/components/subject-card/subject-card.scss).

**UX-24 · P2 · M — Unify collection pages and useful empty states**

Confirmed structure, design recommendation: Bookmarks and Notes have no local search/sort controls. Bookmarks renders separate topic/question sections even when empty. Notes can render the full markdown preview and attaches button semantics to an article containing rich content. Revision nests a card within a card.

Fix: use compact collection rows with subject, title, metadata, and an explicit open/edit action. Add search, subject filters, sort, and counts as collections grow. Use bounded plain-text previews for notes; keep rich content in the editor/reader. Consolidate empty messages with a relevant Browse topics or Add note CTA. Offer undo on removal instead of unnecessary confirmation for reversible bookmarks.

Acceptance: 50 saved items remain easy to scan and search; no interactive descendants conflict with the whole-row action; empty pages explain the next useful step.

Evidence: [bookmarks](../src/app/features/bookmarks/bookmarks.html), [notes](../src/app/features/notes/notes.html), [revision rows](../src/app/features/revision/revision.scss).

**UX-25 · P2 · M — Improve calendar interpretation and semantics**

Confirmed in source: heatmap cells expose information through native `title` only and are not keyboard/touch inspectable. The legend says Less/More without minute thresholds. Month buttons show only day numbers and minutes, without full date labels or exposed selected/current-date state. A four-stat row uses `grid-cards--quad`, but the quad override exists in Dashboard's scoped stylesheet, not Calendar; Calendar falls back to the shared three-column desktop grid.

Fix: provide a text summary and an accessible daily list/table alternative to the heatmap. Label dates fully, expose today and selection, define keyboard navigation, and show numeric legend ranges. Give the stat grid its own explicit responsive layout. Add a Today action.

Acceptance: people can understand activity without hover or color alone; date buttons have unique names; four desktop stats use an intentional layout; day details remain usable on phones.

Evidence: [calendar template](../src/app/features/calendar/calendar.html), [calendar styles](../src/app/features/calendar/calendar.scss), [shared grid](../src/styles/_utilities.scss), [dashboard-only quad rule](../src/app/features/dashboard/dashboard.scss).

**UX-26 · P2 · M — Make study-pack export manageable**

Confirmed structure, design recommendation: export offers presets and a selection count, but selected topics across subjects are not listed in a review area; there is no local topic search, partial-category checkbox state, or pack preview. Final actions follow the topic tree. Export opens a print sheet rather than proving that a PDF file was saved.

Fix: add topic search, expandable categories, indeterminate category state, and a selected-items review tray. Keep options and selection summary visible on wide screens and reachable on mobile. Describe the primary action as Print / Save PDF, and distinguish Opening print sheet from actual file-save success.

Acceptance: a learner can assemble and verify a multi-subject pack without losing track of selected items; partial selections are clear; cancellation does not claim a successful download.

Evidence: [export screen](../src/app/features/export/export.html), [topic export feedback](../src/app/features/topics/topic-detail.ts).

**UX-27 · P2 · S–M — Improve auth and settings clarity**

Confirmed in source and existing screenshot: login has a clear centered form and primary action. Registration's password requirements are replaced by strength feedback once typing begins, and its error message lacks the alert role already used on login. Settings mixes immediate-saving preferences with explicit Save name. Reset copy does not enumerate AI chats, achievements, or Mock Interview history, although reset clears them. Backup export currently omits AI conversations and Mock Interview history.

Fix: retain password requirements with live checks and field-linked errors; explain disabled submission reasons. Distinguish immediate-save preferences from explicit-save edits. State backup and reset scope accurately; decide whether to include omitted learning history in backups. Offer Export backup near reset. A system-theme option is a later preference enhancement, not a prerequisite.

Acceptance: the form explains how to become valid; settings changes expose save state; backup/reset descriptions match actual behavior; users know which histories they can recover.

Evidence: [registration](../src/app/features/auth/register/register.html), [settings](../src/app/features/settings/settings.html), [backup/reset behavior](../src/app/core/services/data-management.service.ts), [existing login image](../skill-hunter-login.png).

**UX-28 · P2 · S–M — Complete motion, labels, and chart context**

Confirmed in source: reduced-motion handling exists on auth and Mock Interview, but shared card/button motion has no global reduced-motion override. Several subject progress bars are labeled generically Progress; achievements' progressbar has no explicit accessible name. Unknown URLs redirect to dashboard instead of explaining a missing page.

Fix: apply reduced-motion defaults to shared movement, use entity-specific progress labels, preserve textual chart summaries, and provide a helpful not-found route with recovery links. Align Home/Dashboard, Save/Bookmark, Practice topic/Practice Again, and Revision naming across screens. Keep subject/catalog counts generated from content.

Acceptance: reduced-motion preference suppresses decorative movement; repeated progress indicators are distinguishable to assistive technology; an invalid URL gives useful feedback instead of an unexplained redirect.

Evidence: [shared motion](../src/styles/_mixins.scss), [progress bar](../src/app/shared/components/progress-bar/progress-bar.html), [achievements](../src/app/features/achievements/achievements.html), [routes](../src/app/app.routes.ts).

**6. Screen-by-screen target experience**

| Screen | Proposed hierarchy and behavior | Priority findings |
|---|---|---|
| Login/Register | Brand → clear local-account explanation → labeled form → primary submit → account switch; persistent requirements and recoverable errors | 16, 27 |
| Dashboard/Home | Greeting → Resume/Start → today's revision and short practice → compact progress/daily goal → subjects → secondary insights/achievements | 09, 10, 22 |
| Subjects | Page purpose → suggested starting point if new → readable subject cards with counts/status; do not truncate meaningful subject names | 08, 23 |
| Subject detail | Breadcrumb/back → subject overview → search and filter summary → controllable category rows with matched counts | 13, 18 |
| Topic detail | Title/metadata → compact action group → section navigation → reading content → contextual practice → confidence/completion → next topic | 01, 08, 11, 12 |
| Practice | Choose context and bounded length → attempt → optional hints → compare answer → rate → next → actionable review | 03, 08, 14 |
| Mock Interview | Explain self-assessment → choose subject/length → timed questions → safe exit → clearly labeled score → review/retry | 01, 05, 21 |
| Playground | Relevant snippet/context → primary Run → editor and output → reset with draft protection; mobile editor/output switching can follow testing | 01, 05, 19, 23 |
| AI Mentor | Active topic/context → readable conversation → reachable composer → collapsible history → clear availability/retry/save feedback | 06, 19, 20 |
| Revision | Due/review queue → reasons/priorities → open topic → mark reviewed with visible consequence → undo/history | 15, 24 |
| Bookmarks | Count → topic/question switch or grouped list → search/filter/sort → open/remove with undo | 24 |
| Notes | Search/filter → compact previews → explicit editor → saved/draft status and safe close | 01, 19, 24 |
| Calendar | Daily goal and summary → month/day details → optional heatmap with accessible alternative | 25 |
| Achievements | Summary → next achievable milestone → unlocked/locked groups; keep badges secondary to learning | 22, 28 |
| Export | Choose/search topics → review selection → options → Print / Save PDF with honest status | 26 |
| Settings | Profile → appearance → study preferences → install guidance → backup/import preview → accurately described reset | 02, 05, 19, 27 |

**7. Suggested information architecture**

The following is a prototype proposal, not evidence of user preference. Keep existing deep links intact.

| Desktop group | Destinations | Rationale |
|---|---|---|
| Prepare | Home, Subjects, Practice, Mock Interview | Frequent preparation tasks |
| Review | Revision, Bookmarks, Notes | Return to knowledge and weak areas |
| Tools & activity | AI Mentor, Playground, Calendar, Achievements, Study packs | Supporting capabilities |
| Account | Settings and account menu | Personal preferences and data |

For mobile, prototype **Home / Subjects / Practice / Revision / More**. Practice should also provide a clear entry to Mock Interview. More should show grouped destinations and a visible close action. Test whether AI Mentor deserves a primary slot using task success and real usage; do not assume it from feature novelty.

**8. Design-system specification**

Treat these values as starting points for prototypes and responsive validation, rather than absolute requirements for every component.

| Area | Proposed rule |
|---|---|
| Reading text | 16–18px, line-height around 1.6–1.75; prose constrained to roughly 65–75 characters |
| Interface text | 14–16px, coherent hierarchy; avoid making necessary instructions tiny |
| Headings | A small named scale; page title, section title, card title clearly separated |
| Spacing | Retain 4/8/12/16/24/32/48px tokens; use 24–32px between major sections and smaller gaps within a control group |
| Surfaces | Neutral background; flat reading cards; subtle borders; stronger elevation for overlays and selected/actionable surfaces |
| Actions | Primary, secondary, tertiary, destructive; consistent hover/focus/disabled/loading states; one primary emphasis per action group |
| Touch | Prefer 44–48px hit areas for common touch controls; compact desktop controls need appropriate spacing and clear focus |
| Status | Success, warning, error, information, selected, saved, dirty; convey states through words/icons as well as color |
| Theme | Separate brand/decorative accent from text-safe link and action tokens; validate all accent/mode combinations |
| Width | Choose columns from available component width; the shell sidebar changes how much space a feature has |
| Motion | Brief purposeful feedback; decorative movement suppressed for reduced-motion preferences |
| Icons | Retain the existing SVG system; use consistent optical size and explicit text for unfamiliar actions |

Shared components to implement or strengthen first: Button, Field/Error/Help text, Select/Radio, Status message, Confirm dialog, Mobile sheet, Loading skeleton, Empty state, Filter summary, Collection row, and Topic action group. A new design library is not necessary for this plan.

Measured token examples from the inspected source:

| Foreground / background | Approximate ratio | Interpretation |
|---|---|---|
| `#e65100` / white | 3.79:1 | Sunset primary is unsuitable for normal-size links on white |
| white / `#1490c4` | 3.61:1 | Ocean's bright gradient endpoint requires actual label-position validation |
| white / `#66bb6a` | 2.36:1 | Forest bright endpoint is a high-risk background for white labels |
| white / `#fb8c00` | 2.37:1 | Sunset bright endpoint is a high-risk background for white labels |
| `#0f1419` / `#003366` | 1.47:1 | Dark foreground on the deep Ocean endpoint is risky |
| `#667085` / white | 4.97:1 | Default light muted text passes the normal-text threshold on this solid background |
| `#94a3b5` / `#171d25` | 6.59:1 | Default dark muted text passes on this solid surface |

Ratios were calculated from sRGB relative luminance. Composite/translucent backgrounds, gradients beneath actual glyphs, hover filters, and zoom were not rendered or sampled in this review.

**9. Implementation sequence and deliverables**

**Phase 1 — Interaction reliability and data protection: approximately 3–5 focused engineering days.**

- First reproduce and resolve UX-01 through UX-05: draft protection, import preview, per-question reveal reset, keyboard search, and selections.
- Add storage error propagation and a reusable confirmation/status foundation from UX-19.
- Correct misleading auth copy and practice deep-link context; these are small changes with direct value.
- Deliverable: reliable versions of the existing interactions, with focused behavioral tests and manual keyboard evidence.
- Exit criteria: no silent draft discard through supported flows; selecting an import cannot overwrite data immediately; next questions honor reveal settings; core search/select flows work without a mouse.

**Phase 2 — Shared shell, states, and theme foundation: approximately 4–6 days.**

- Implement accessible sheets/disclosures, constrained More content, loading/error states, route-focus/scroll policy, semantic colors, and navigation consistency.
- Fix AI History's control ID and account-menu semantics.
- Prototype grouped desktop navigation and mobile placement, then validate before locking it in.
- Deliverable: shared layout/state/control patterns used by the main learning screens.
- Exit criteria: overlays are dismissible and keyboard-safe; all major content requests have distinct loading/error/empty states; theme text contrast is verified; narrow/short viewports expose every navigation option.

**Phase 3 — Main preparation flow: approximately 5–8 days.**

- Reorder Dashboard, improve Subject filters/accordions, and restructure Topic reading/actions.
- Add bounded standard Practice sessions and actionable review, using common patterns from Mock Interview.
- Define and implement a minimal meaningful reviewed-today queue before considering spaced repetition.
- Refine AI Mentor and Mock Interview's responsive/focus behavior.
- Deliverable: coherent first-time and returning-learning flows, with preserved topic context.
- Exit criteria: learners can find a starting/resume action, complete a short study/practice cycle, identify revision work, and return to their prior list context.

**Phase 4 — Supporting screens and release validation: approximately 3–5 days.**

- Unify collections, improve export selection review, calendar semantics/layout, settings scope/messages, and global visual consistency.
- Complete reduced-motion handling, meaningful progress labels, and not-found recovery.
- Run the responsive, theme, keyboard, error, and representative-user validation matrix below.
- Deliverable: final screenshot set, issue checklist, regression evidence, and unresolved-items list.
- Exit criteria: acceptance criteria pass for the delivered scope; any deferred items are explicitly documented with their rationale.

Overall planning band: **about 15–24 focused engineering days**, roughly **3–5 weeks for one engineer** with prompt design review. Browser access, existing test coverage, concurrent feature changes, and decisions about draft persistence/revision rules can extend that range. Estimates include verification but are not a fixed-price scope.

Larger enhancements should follow this release: synchronized accounts, email recovery, cross-device sync, advanced learning paths, spaced repetition, AI evaluation of typed answers, and a fully resumable timed interview. These need product/data design and should not be disguised as small UI fixes.

**10. First implementation batch**

Use this bounded batch before a broad redesign:

1. Reset reveal state when question identity changes; verify auto-reveal separately.
2. Protect dirty notes and Playground code on close/replacement/navigation.
3. Preview and confirm validated backup imports before writing.
4. Replace blur-timed search dismissal with focus-aware dismissal and keyboard selection.
5. Repair shared selects/radios and reuse them across filters/settings/Mock Interview.
6. Add safe overlay focus/dismissal behavior and bound the More sheet's height.
7. Replace the blanket "nothing leaves your device" statement and accurately describe backup/reset scope.
8. Pass both subject/topic IDs into practice and expose a clear return action.

Then tackle loading states and the dashboard/learning hierarchy. This order prevents attractive screens from retaining broken underlying interactions.

**11. Validation plan**

No application tests were run during this documentation-only review. The checks below are for implementation and the pending live audit.

| Dimension | Required checks |
|---|---|
| Phone widths | 320, 360, 390, 430px; long titles, touch interactions, all More destinations |
| Tablet | 768–1023px; topic title/actions, filters, AI history, two-column collections |
| Desktop transition | 1024px and nearby widths; sidebar/content interplay, AI two-sidebar layout, card density |
| Larger desktop | 1280, 1440, 1920px; reading measure and intentional use of whitespace |
| Short viewport | Phone landscape and short desktop windows; More sheet, chat, editor/output, overlays |
| Enlarged content | 200% text/zoom and reflow equivalent to 320 CSS px; retain essential functions |
| Mobile keyboard | Notes, chat, registration, filters; composer/submit visibility and bottom-navigation overlap |
| Themes | Seven accent families × light/dark; text, primary/danger actions, focus, selected state, chips, code |
| Keyboard | Search, select/radio, account popup, mobile sheets, filters, note editor, practice, Mock Interview, editor escape path |
| Assistive technology | Accessible names/states, route/question transitions, errors, saved status, date controls, chart summaries |
| Motion | Reduced-motion preference across auth, cards, buttons, badges, and Mock Interview |
| Data states | New account, returning learner, many bookmarks/notes, long lesson, no matches, invalid route |
| Failure states | Slow/offline content request, AI unavailable, clipboard failure, invalid backup, storage full/blocked |

Meaningful automated regression tests should cover reveal reset, draft preservation, import no-mutation/rollback, keyboard search/select interactions, revision completion, practice context, and content load-state transitions. Avoid snapshot-only tests that merely repeat template markup.

Manual user tasks should include: find a named topic; resume last study; start a ten-question session; compare and rate an answer; find a weak topic; mark it reviewed; edit and recover a note; inspect one calendar date; assemble a multi-subject pack; understand where progress is stored. Recruit a small set of representative learners rather than using only the developer's familiarity.

Record task completion, errors, time to first useful action, backtracking, and whether users understand the save/review/score meaning. Establish a baseline before claiming percentage improvements. Suggested targets are easy-to-find primary actions, zero silent data loss in supported scenarios, and successful keyboard completion of core flows; these are goals, not observed results.

Use temporary local/test accounts for browser validation, not actual user study histories. Capture representative screenshots with viewport/theme/state captions. Do not use a global `overflow-x: clip` rule to treat clipped content as resolved; inspect the actual overflowing component.

**12. Accessibility references and acceptance standards**

The plan uses normal-text contrast of at least 4.5:1, with 3:1 for qualifying large text, as explained in [W3C: Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). The token ratios above are preliminary inputs to rendered validation, not a full compliance audit.

For pointer targets, WCAG 2.2 AA uses a 24×24 CSS-pixel minimum with defined spacing and other exceptions. This plan's 44–48px preference is a practical comfort target for touch, not a claim that all 40px controls fail AA. See [W3C: Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

General content should retain information and functionality when reflowing to 320 CSS pixels, with exceptions for content that requires a two-dimensional layout. Evaluate specialized code/table views separately. See [W3C: Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

Modal sheet behavior should include initial focus, contained Tab navigation, Escape dismissal, and appropriate restored focus, following [W3C APG: Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Use modal semantics only where the actual interaction is modal.

**13. Pending live-review deliverable**

The source-backed plan is complete. The remaining evidence gap is a live browser pass: current authenticated screenshots, measured layout/contrast, keyboard reproduction, touch behavior, and mobile keyboard testing. Before implementation, verify the P0 reproductions and the 1024px AI/topic layouts against the latest working tree. Update priorities if rendered evidence or user research contradicts a design hypothesis.

Completion should be judged by whether learners can confidently choose, learn, practice, review, and resume, with their work preserved and the interface understandable on the device they use.
