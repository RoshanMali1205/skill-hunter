export type SkillLevel = 'beginner' | 'senior' | 'architect';

export interface SkillTopic {
  id: string;
  title: string;
  subject: string;
  level: SkillLevel;
  summary: string;
  explanation: string;
}

/** The searchable projection of a topic. Omits the long-form explanation. */
export type SkillTopicSummary = Omit<SkillTopic, 'explanation'>;

export const skillLevels = ['beginner', 'senior', 'architect'] as const;

export function toTopicSummary(topic: SkillTopic): SkillTopicSummary {
  const { explanation: _explanation, ...summary } = topic;
  return summary;
}

export const topics: readonly SkillTopic[] = [
  {
    id: 'angular-onpush',
    title: 'OnPush Change Detection',
    subject: 'Angular',
    level: 'senior',
    summary:
      'In Angular 22, OnPush is the default. Understand what still triggers checks and how zoneless apps stay correct.',
    explanation: [
      'In modern Angular (21+/22), new components use `ChangeDetectionStrategy.OnPush` by default and',
      'zoneless change detection is the recommended path. The old mental model — “Default checks the',
      'whole tree on every browser event” — is legacy context, not what you should design for now.',
      '',
      'OnPush + zoneless means Angular updates views when it is notified: signal writes, template',
      'events, `AsyncPipe` emissions, input changes, or explicit `markForCheck()`. Mutating an object',
      'in place without changing its reference will not notify consumers that use equality checks.',
      '',
      'Prefer signals or observables for state that changes over time, keep templates free of side',
      'effects and fresh object literals, and treat inputs as immutable. When you must refresh outside',
      'those triggers, inject `ChangeDetectorRef` and call `markForCheck()` (not `detectChanges()`),',
      'or better — move the state into a signal so notifications are automatic.',
      '',
      'Common failure modes remain: mutating arrays/objects in place, creating new input object',
      'literals on every parent render, and expecting children to update when a shared service mutates',
      'private state without emitting or writing a signal.',
    ].join('\n'),
  },
  {
    id: 'standalone-lazy-loading',
    title: 'Standalone Lazy Loading',
    subject: 'Angular',
    level: 'architect',
    summary:
      'Standalone conversion does not automatically make routes lazy. Route boundaries must use lazy loading explicitly.',
    explanation: [
      'Migrating from NgModules to standalone components removes the module boilerplate, but it does',
      'not change your bundle graph. A standalone component that is imported eagerly — named in a',
      "route's `component` property with a top-level `import`, or pulled into another eagerly loaded",
      "component's `imports` array — still ends up in the initial JavaScript payload.",
      '',
      'Lazy loading is a routing decision you make on purpose. Use `loadComponent` for a single',
      'standalone screen and `loadChildren` for a feature area that has its own child routes:',
      '',
      '```ts',
      'export const routes: Routes = [',
      "  { path: 'reports', loadComponent: () => import('./reports/reports.page').then(m => m.ReportsPage) },",
      "  { path: 'admin', loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES) },",
      '];',
      '```',
      '',
      'The dynamic `import()` is what creates a separate chunk. Anything reachable only through that',
      'import is split out with it. Keep the boundary clean: a lazily loaded feature should not be',
      'imported statically from eager code, or the bundler merges it back into the main chunk.',
      '',
      'Provide feature-scoped services at the route with `providers` (or `Route.providers`) so their',
      'setup cost is paid only when the feature loads. Verify the result with source-map-explorer or',
      "the build's chunk report rather than assuming; a stray eager import is easy to miss and",
      'silently inflates first load.',
    ].join('\n'),
  },
  {
    id: 'angular-signals',
    title: 'Signals and Computed State',
    subject: 'Angular',
    level: 'senior',
    summary:
      'Use signals for synchronous state and computed for pure derived values; keep effects for real side effects only.',
    explanation: [
      'A signal is a value container with dependency tracking. Read with `count()`, write with `set`',
      'or `update`, and expose read-only views with `asReadonly()`. `computed()` is lazy, memoized,',
      'derived state — like a spreadsheet formula. `effect()` is a bridge to the outside world',
      '(storage, analytics, charts), not a place to copy one signal into another.',
      '',
      'Signals and RxJS solve different problems. Signals excel at synchronous application state and',
      'template-facing view models. RxJS excels at time: cancellation, retries, debounce, concurrency,',
      'and websockets. Convert at stable boundaries with `toSignal()` / `toObservable()`.',
      '',
      'For resettable local state linked to a source (selected id that should reset when options',
      'change), prefer `linkedSignal` over a sync effect. For HTTP read models driven by signal',
      'params, consider `httpResource` / `resource` while keeping mutations on `HttpClient`.',
    ].join('\n'),
  },
  {
    id: 'angular-http-resource',
    title: 'httpResource and resource()',
    subject: 'Angular',
    level: 'senior',
    summary:
      'Model async read state as signals with resource/httpResource; keep complex writes and orchestration on HttpClient + RxJS.',
    explanation: [
      '`resource()` and `httpResource()` expose loading, value, and error as signals so templates do',
      'not need hand-rolled BehaviorSubject stores for every GET. Drive them from signal parameters',
      '(route ids, filters) and return `undefined` params to skip a request while inputs are empty.',
      '',
      'They do not automatically share in-flight requests across instances — put a shared owner in a',
      'service if you need dedupe/caching. Do not stuff POST/PUT/DELETE into loaders; treat resources',
      'as read models and keep commands explicit. Mix both styles in Angular 22 apps: resources for',
      'declarative reads, HttpClient for mutations and advanced stream control.',
    ].join('\n'),
  },
  {
    id: 'angular-modern-component-api',
    title: 'input(), output(), and model()',
    subject: 'Angular',
    level: 'senior',
    summary:
      'Prefer signal-based input/output/model APIs for new Angular components; use model() only for true two-way bindings.',
    explanation: [
      'Modern Angular components declare contracts with `input()`, `output()`, and `model()` instead',
      'of decorator `@Input` / `@Output`. Inputs are signals — read them by calling `label()`. Use',
      '`input.required()` and transforms to keep coercion and requiredness next to the API.',
      '',
      '`model()` is for genuine two-way `[(value)]` cases such as selected flags. If writes need',
      'validation or mapping, prefer an explicit input plus a named output. Do not read an input once',
      'in the constructor and cache it forever — inputs change when parents rebind them.',
    ].join('\n'),
  },
  {
    id: 'design-tokens',
    title: 'UI Design Tokens',
    subject: 'UI Architecture',
    level: 'architect',
    summary: 'Central tokens create consistent colour, spacing, typography and theming decisions.',
    explanation: [
      'Design tokens are named, single-source-of-truth values for the primitive decisions in a UI:',
      'colour, spacing, typography scale, radius, elevation, motion timing, and z-index. Instead of',
      'hard-coding `#1d4ed8` or `16px` in dozens of components, components reference `color.primary`',
      'or `space.4`, and the concrete value is defined in one place.',
      '',
      'A useful token system has tiers. Primitive (global) tokens name raw values (`blue.600`,',
      '`size.16`). Semantic (alias) tokens map intent onto primitives (`color.action.background`,',
      '`color.text.muted`). Component tokens narrow further where a component needs its own knob',
      '(`button.padding.inline`). Components should consume semantic and component tokens, not',
      'primitives, so a rebrand or a new theme only touches the mapping layer.',
      '',
      'In a web app the runtime form is usually CSS custom properties on `:root`, with theme variants',
      '(dark mode, high contrast, per-tenant brands) swapping the semantic layer under a selector or',
      'media query. Keep the source of truth in a format that is not CSS — JSON or the W3C Design',
      'Tokens format — and generate the CSS, TypeScript types, and docs from it so platforms stay in',
      'sync. The payoff is consistency by construction and cheap theming; the risk is an over-large',
      'token set that no one understands, so grow it from real needs.',
    ].join('\n'),
  },
  {
    id: 'typescript-const-type-params',
    title: 'Const Type Parameters',
    subject: 'TypeScript',
    level: 'senior',
    summary:
      'Use const type parameters to preserve literal types through generic helpers for routes, tokens, and registries.',
    explanation: [
      'Ordinary generics often widen literals to `string` or broader object types. A `const` type',
      'parameter asks TypeScript to infer the most specific literal type it can, which keeps route',
      'maps, permission dictionaries, and design-token catalogs precise for callers.',
      '',
      'It is related to `as const` but lives on the API: every caller benefits without remembering to',
      'assert. Use it where literal preservation is part of the contract; do not spray it on every',
      'generic for “strictness.”',
    ].join('\n'),
  },
  {
    id: 'typescript-noinfer',
    title: 'NoInfer',
    subject: 'TypeScript',
    level: 'senior',
    summary:
      'NoInfer stops secondary arguments and defaults from poisoning generic inference.',
    explanation: [
      '`NoInfer<T>` marks a usage of `T` that should not contribute to inferring `T`. This matters for',
      'defaults and fallbacks that would otherwise widen or conflict with the primary argument.',
      'Constraints bound what `T` may be; `NoInfer` controls which positions participate in inference.',
      'Together they make generic helpers nicer without forcing call-site annotations.',
    ].join('\n'),
  },
  {
    id: 'ai-rag-basics',
    title: 'RAG for Product Features',
    subject: 'AI Concepts',
    level: 'senior',
    summary:
      'Retrieval-Augmented Generation grounds answers in your docs; quality depends on chunking, retrieval, and evals more than prompt poetry.',
    explanation: [
      'RAG retrieves relevant passages from your knowledge base and passes them to the model as',
      'context. For Skill Hunter-style products that means curriculum chunks, not the entire JSON',
      'dump. Chunk by coherent topic sections, retrieve with embeddings plus optional keyword/hybrid',
      'search, and evaluate faithfulness and relevance on a golden set.',
      '',
      'Failure modes: retrieving the wrong chunk, stuffing too much context, and treating retrieved',
      'text as executable instructions (prompt injection). Keep retrieved content clearly delimited',
      'as untrusted data and measure quality before adding agentic loops.',
    ].join('\n'),
  },
  {
    id: 'ai-mcp-skills',
    title: 'MCP Skills and Tool Surfaces',
    subject: 'AI Concepts',
    level: 'architect',
    summary:
      'Expose curated MCP tools/resources/prompts like a versioned API — narrow, typed, and safe by default.',
    explanation: [
      'The Model Context Protocol lets hosts discover tools, resources, and prompts from servers. A',
      'good skill surface for a learning product is small: `search_topics`, `get_topic`, maybe a',
      'guided interview prompt — not unconstrained shell or credential access.',
      '',
      'Treat tool results as untrusted data (indirect prompt injection). Prefer read-only tools first,',
      'auth/allowlist every write, and version tool schemas like public APIs. Curate summaries for',
      'hosts instead of dumping raw curriculum files into context.',
    ].join('\n'),
  },
  {
    id: 'ai-reasoning-models',
    title: 'Reasoning Models vs Flash Models',
    subject: 'AI Concepts',
    level: 'senior',
    summary:
      'Route hard multi-step tasks to reasoning models and keep everyday chat on fast models — with UX for waiting and cost controls.',
    explanation: [
      'Reasoning (“thinking”) models spend more compute on deliberation and often do better on hard',
      'multi-step coding, planning, and trade-off questions. Flash-style models win on latency and',
      'cost for short explanations and quizzes.',
      '',
      'Product design matters: show progress for slow modes, allow cancel, fall back on timeout, and',
      'measure quality vs p95 latency and cost per successful session. Do not send every trivial',
      'rewrite through the most expensive model.',
    ].join('\n'),
  },
  {
    id: 'frontend-llm-bff',
    title: 'LLM Features via a BFF',
    subject: 'Frontend System Design',
    level: 'architect',
    summary:
      'Keep provider keys on a BFF/serverless function, stream tokens to the UI, curate context, and plan degraded modes.',
    explanation: [
      'Browsers must not hold provider API keys. A BFF or serverless function authenticates the user,',
      'rate-limits, attaches the trusted system prompt, calls the model, and streams tokens back.',
      'Assemble context deliberately — active topic summary and user question — instead of dumping',
      'entire JSON documents into the prompt.',
      '',
      'Design for failure: the rest of a static learning PWA should work when AI is down. Control cost',
      'with routing, caching of safe prefixes/responses, and clear rate limits.',
    ].join('\n'),
  },
];
