**Tricky questions — placement, content, and implementation plan**

Prepared 11 October 2026. The first release was implemented on 12 October 2026; the original proposal below is retained for context.

**Implementation status — 12 October 2026**

- Each subject now has a linkable `Topics | Tricky questions` view with a derived count, search, category and topic-difficulty filters, pagination, hidden answers, hints, bookmarks, and topic links.
- `Practice this question` targets its exact ID. `Practice this set` carries the current subject, search, category, and difficulty. Practice offers 5/10/20/all sessions, skipped questions, self-assessed review, and retry of missed/skipped questions.
- Added 107 questions, bringing each subject to 20 (140 total). Every addition has an answer, explanation, hint, and primary-source reading link. Corrected misleading existing TypeScript narrowing and CSS height-transition questions.
- Questions remain blocks of existing topics. The catalog still has 385 topics; completion counts and existing block IDs were preserved. Mixed Mock Interview already includes tricky questions; its setup copy now makes this discoverable. A separate timed tricky-only mode remains a later enhancement.
- Loading errors have retry actions. Self-assessment appears after answer reveal; reveal state resets for each question. The reveal button keeps its DOM identity and exposes expanded state; Practice and pagination move focus to the next heading.
- `npm run validate:content` checks catalog associations, block order, coverage, answer fields, duplicate prompts, distinct bank IDs, and globally unique new question IDs. Router/component tests exercise bank-to-Practice links, bookmarks, filters, answer reset, session limits, missed/skipped retry, and loading recovery.

Validation: production build passed; all 248 tests in 56 files passed; content validation passed for 385 topics, 873 subject-scoped question blocks, and 140 tricky questions; `git diff --check` passed. The build reported an unrelated 109-byte warning above the AI Mentor chat stylesheet's 8 kB warning budget.

Remaining verification: the Browser connector reported no available browser, so desktop/mobile visual inspection and real-browser keyboard checks could not be completed in this session. Automated rendered tests do not substitute for those checks.

Existing data issue discovered during validation: three older question IDs (`modules-question-1`, `this-question-1`, `this-question-2`) are reused across JavaScript and TypeScript. One is a JavaScript tricky question. This release does not rename existing IDs, which could detach stored learner references. A follow-up should migrate those IDs together with bookmarks, attempts, and saved sessions. All 107 new IDs are globally unique, and the 140 tricky-bank IDs are distinct within the bank.

**Recommendation**

Give tricky questions a visible home within each subject, with direct entry into focused Practice and optional inclusion in Mock Interview. Store each question once under its relevant topic and reuse it across these experiences.

Subject pages answer “What traps should I understand in this subject?” Practice answers “Can I answer them?” Mock Interview answers “Can I handle them under time pressure?” This division keeps discovery available without making every learner start a timed session.

**Existing support and content inventory**

The model already has `tricky-question`, with question, answer, explanation, optional code/language, and hints. Practice already exposes this question type. Mock Interview builds a pool from all question blocks and rotates through available types, so tricky questions can already be selected in mixed interviews. It does not guarantee a specific number of tricky questions or expose a tricky-only setup option.

The inspected content files contain:

| Subject | Explicit tricky questions | Topics containing them | Initial coverage action |
|---|---:|---:|---|
| Angular | 7 | 7 | Expand coverage across existing categories |
| JavaScript | 8 | 8 | Add conceptual traps alongside existing output exercises |
| TypeScript | 13 | 13 | Review depth, then fill uncovered topics |
| UI Engineering | 5 | 4 | Expand across layout, accessibility, CSS, and browser behavior |
| Frontend System Design | 0 | 0 | Add trade-off and failure-condition questions |
| Design Patterns | 0 | 0 | Add misuse, scope, and lifecycle traps |
| AI Concepts | 0 | 0 | Add assumption, reliability, evaluation, and security traps |

Total: **33 explicitly typed tricky questions**, each with nonempty answer text. This count is a classification inventory, not an answer-quality assessment. Scenario/output questions may also contain subtle reasoning, but were not counted as tricky automatically. All 33 belong to topics currently listed in the subject catalog.

**1. Subjects overview: retain the existing cards**

Keep the screenshot's subject-card grid as the overview. Inside each card, optionally show a quiet summary such as “48 topics · 20 tricky questions” once counts are loaded. The 20 here is illustrative, not the current count.

Keep topic completion separate: “0 / 48 topics completed” should not include question attempts. Derive both counts from content; never hardcode them. Avoid adding multiple prominent buttons inside the current whole-card link, which would create competing actions and potentially nested interactive elements. The card should continue to open the subject.

**2. Subject detail: primary discovery location**

Below the subject heading/progress, provide two views:

**Topics | Tricky questions (count)**

The Topics view retains the category/topic outline. The Tricky questions view presents the subject's existing question blocks grouped by category or topic, with search, topic/category filtering, and an optional difficulty filter.

Make these views addressable, for example `/subjects/angular?view=tricky`, so links, reload, and Back preserve the selection. Use appropriate accessible navigation or tab behavior according to the implementation; do not make a mouse-only visual switch.

Each question shows:

- A meaningful title and question text, with associated code when needed.
- Parent topic/category and difficulty, plus a clear link to Learn this topic.
- Hint and Show answer controls; answers stay hidden initially to encourage recall.
- Bookmark and Practice this question actions.
- After reveal: direct answer, reasoning, common wrong assumption, and what to say in an interview.

Use a manageable list or pagination for long banks. Provide Practice this set near the view heading and a visible matching-question count. In study/browse mode, revealing an answer must not record a correct/incorrect attempt or mark the parent topic completed.

During loading, show loading rather than “0 tricky questions.” For a genuinely empty set, explain that no questions match or no questions have been published, depending on the cause. Offer Clear filters or Browse topics accordingly.

**3. Topic detail: keep questions beside their explanation**

Continue storing and displaying tricky question blocks in their relevant lesson. Give the topic's question section a recognizable Tricky questions label and a section-navigation entry when those blocks exist.

The same question opened from the subject bank must retain its ID, bookmark, topic link, and answer. Study mode should expose explanation naturally; focused Practice should require an attempt/comparison before self-assessment.

Adding a question to an existing topic should not increase the topic count or invalidate its existing completion history.

**4. Practice: primary focused-drill experience**

Reuse the existing question-type filter and add a visible Tricky questions preset/shortcut. Opening from a subject should preselect that subject and `questionType=tricky-question`; opening from a topic should preserve both subject and topic IDs.

Example target URL: `/practice?subjectId=angular&questionType=tricky-question`. This is a proposed URL contract; the current route-input code does not seed `questionType` from query parameters.

Offer a bounded session length such as 5, 10, or 20 questions. Cap the chosen length to the available pool and show the actual count before Start. Do not repeat questions merely to fill a requested length.

The flow should be: question → attempt or optional typed response → hint if needed → reveal/compare → self-rate → next. Ratings should reuse the existing practice-history and revision pathways. Results should show missed questions, the related topic, and Retry missed.

Validate deep-link filter values. A question-specific action also needs an exact question-ID selection contract; a topic filter alone can include several questions. If Practice this set includes extra search/category filters, carry those explicitly or define a reproducible selection set rather than silently drilling the whole subject.

Keep two distinctions visible: Tricky describes the reasoning trap, while Beginner/Intermediate/Advanced describes difficulty. The present model inherits difficulty from the parent topic. Add optional question-level difficulty with a topic fallback only if editorial needs justify it.

**5. Mock Interview: secondary assessment experience**

Retain Mixed interview as the default. Tricky questions are eligible already; improve the setup explanation so this inclusion is discoverable.

As a later enhancement, offer a clearly separate Tricky questions challenge using the same bank. If this option is added, update the selected pool count, question selection, planned duration, empty states, and saved result metadata together.

For mixed sessions, choose an explicit editorial target for tricky-question inclusion if needed, such as a small portion of a ten-question round. Do not claim a quota is guaranteed by the current rotation algorithm. Respect available questions and topic diversity without forced duplication.

Label results as self-assessed. Save the session mode so mixed and tricky-only scores remain understandable and can be compared within the same mode. Questions/answers stay identical across modes; the attempt experience changes.

**6. Content plan for all seven subjects**

A useful first editorial target is **about 20 well-reviewed tricky questions per subject**, distributed across the subject's main categories. This is approximately 140 in total, including reviewed existing questions. If all 33 existing questions pass review, about 107 additions would reach that target. Adjust for useful coverage instead of adding filler to make every count equal.

Proposed themes, not newly authored or verified Q&A:

| Subject | Candidate themes |
|---|---|
| Angular | Signals and mutation, change-detection assumptions, repeated observable subscriptions, provider scope, component/route lifecycle, asynchronous cleanup |
| JavaScript | Closure capture, `this`, reference/shallow-copy assumptions, event-loop ordering, promise error handling, coercion, property ownership |
| TypeScript | Compile-time versus runtime checks, assertions, narrowing, unions, generic constraints, structural typing, optional-property assumptions |
| UI Engineering | Stacking contexts, layout sizing, overflow, cascade, focus order, semantic controls, accessible names, responsive and touch assumptions |
| Frontend System Design | Cache invalidation, stale responses, optimistic updates, retries, client/server trust boundaries, state ownership, performance trade-offs |
| Design Patterns | Singleton scope, observer cleanup, factory versus strategy choices, inheritance misuse, dependency injection, abstraction costs |
| AI Concepts | RAG reliability assumptions, model instructions and untrusted content, retrieval quality, hallucination, context limits, tool permissions, evaluation design |

Prioritize the three subjects without explicitly typed tricky questions. Review existing content for modern platform/framework behavior and version assumptions, then expand the other four subjects. Verify new technical answers against primary documentation and runnable examples where appropriate before publishing.

A tricky question should expose a realistic mistaken assumption and teach useful reasoning. Avoid ambiguous puzzles, trivia, or merely labeling every advanced question as tricky. State constraints, environment, and version whenever the answer depends on them.

Suggested answer structure:

1. Direct answer: the expected conclusion in a few sentences.
2. Why it works: the relevant reasoning or mechanism.
3. The trap: the plausible wrong assumption and why it fails.
4. Example or counterexample: code, scenario, or a concise comparison.
5. Interview takeaway: how to explain the answer clearly.

Use the existing `answer`, `explanation`, `hints`, and optional `code` fields first, with structured Markdown where helpful. Introduce separate rubric/trap/source metadata only when a concrete presentation or review need exists.

**7. Implementation order**

1. Inventory and review existing tricky questions; agree on coverage and answer criteria.
2. Add subject-level question indexing/counts and the Tricky questions view, reusing question cards and bookmark IDs.
3. Support Practice query presets and exact question targeting, then add bounded sessions and actionable results.
4. Author and verify the initial missing-subject content; expand the other subjects by category.
5. Confirm all new blocks naturally participate in mixed Mock Interview. Add the optional challenge mode afterward if useful.

Existing files likely involved: `content.models.ts`, `content.service.ts`, `subject-list.*`, `subject-detail.*`, `subject-card.*`, `topic-detail.*`, `practice.*`, `practice.service.ts`, question/answer shared components, and the subject content JSON files. A tricky-only Mock Interview would additionally affect `mock-interview.*`, its service/result model, and related persistence/tests.

No separate top-level sidebar destination is required. A subject-specific view plus practice presets makes this feature discoverable without increasing the flat navigation list.

**8. Acceptance checks**

- Every subject with published questions exposes its accurate tricky-question count and list.
- The same question has the same identity, answer, bookmark, and topic in study, Practice, and Mock Interview.
- Subject view selection/filter state survives reload and Back; loading is distinct from no content.
- Practice from a subject uses its tricky pool; an exact-question shortcut opens that question.
- Answers reset between questions and self-assessment records only intentional attempts.
- Sessions use the available count and do not duplicate questions to fill a quota.
- New blocks retain valid unique IDs, nonempty answers/explanations, correct subject/topic association, and primary-source-verified reasoning.
- Adding questions does not inflate topic completion counts or reset existing learner progress.
- Keyboard/touch users can switch views, reveal answers, bookmark, practice, and return to the topic.
- Empty sets have honest guidance; model limitations such as topic-inherited difficulty are reflected in labels.

The first release should establish **subject discovery + one shared question bank + a direct practice path**. Timed challenge options can build on that foundation.
