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
    summary: 'Use explicit reactive state and stable data flow to reduce unnecessary checking.',
    explanation: [
      'Angular components default to the `Default` change detection strategy, which re-checks every',
      'binding in the tree on every event, timer, or async callback. `ChangeDetectionStrategy.OnPush`',
      'tells Angular to check a component only when one of a few things happens: an `@Input()` (or',
      'signal `input()`) reference changes, an event fires inside the component, an observable bound',
      'with the `async` pipe emits, or change detection is requested explicitly.',
      '',
      'To benefit from OnPush the data flow has to be predictable. Treat inputs as immutable: replace',
      'objects and arrays instead of mutating them, so the reference comparison Angular performs',
      'actually detects the change. Prefer signals or observables for state that changes over time,',
      'and keep template expressions free of side effects and new object literals.',
      '',
      'When you must force a refresh outside those triggers, inject `ChangeDetectorRef` and call',
      '`markForCheck()` (not `detectChanges()`), or move the work into a signal. Common failure modes:',
      'mutating an input array in place, passing a fresh object literal into an input on every parent',
      'render (which defeats memoization), and expecting OnPush children to update when a shared',
      'service mutates its own internal state without emitting.',
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
];
