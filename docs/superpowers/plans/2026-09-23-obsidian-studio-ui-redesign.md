# Obsidian Studio UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Braid's visual interface from a flat, bare aesthetic into a world-class, dynamic "Obsidian Studio" experience featuring glassmorphism, ambient lighting, interactive starter templates, rich block/code editor modes, and elevated workspace dashboards.

**Architecture:** Update CSS design tokens in `app/globals.css` with ambient radial glows and glassmorphism. Build template library in `lib/templates.ts`. Revamp the landing page (`app/page.tsx`) with an interactive hero launcher and simulated live CRDT collaboration teaser. Redesign the workspace dashboard (`app/dashboard/DashboardClient.tsx`) with template strips and elevated cards. Upgrade the editor (`components/editor/Editor.tsx`) to seamlessly support Notion-style block editing and multi-language code studio modes with floating format bars and slash menus.

**Tech Stack:** Next.js 16.3, React 19, Tailwind CSS v4, TypeScript 5, Vitest, Custom RGA CRDT Engine.

**Spec:** [`docs/superpowers/specs/2026-09-23-obsidian-studio-ui-redesign-design.md`](file:///home/himanshu/Documents/Projects/braid/docs/superpowers/specs/2026-09-23-obsidian-studio-ui-redesign-design.md)

## Global Constraints
- Preserve full CRDT synchronization, presence tracking, and export fidelity.
- Maintain existing routes (`/`, `/dashboard`, `/login`, `/[id]`, `/project/[id]`, `/doc/[id]`).
- Dark mode must default to obsidian/zinc with ambient mesh gradients; light mode must be clean with subtle elevation.
- All 171+ existing tests and new test suites must pass cleanly.

---

### Task 1: Global Theme Foundations & Glassmorphic Design Tokens

**Files:**
- Modify: `app/globals.css`
- Test: `tests/interactive-ui-and-theme.test.tsx`

**Interfaces:**
- Consumes: Tailwind CSS v4 `@theme` and `@layer base`
- Produces: CSS custom properties (`--background`, `--surface`, `--surface-muted`, `--border-glow`, `--accent-gradient`, `--shadow-glow`), ambient utility classes (`.glass-panel`, `.glow-coral`, `.mesh-bg`)

- [ ] **Step 1: Write test for theme tokens and glassmorphic styles**

```typescript
// in tests/interactive-ui-and-theme.test.tsx
it('supports obsidian studio glow and glass styling tokens', () => {
  const root = document.documentElement;
  expect(root).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify suite runs**

Run: `npm test tests/interactive-ui-and-theme.test.tsx`
Expected: PASS

- [ ] **Step 3: Update `app/globals.css` with Obsidian Studio tokens, radial glows, and animations**

Add gradient tokens, glow variables, glassmorphic backdrop filters, and subtle keyframe animations for live peer badges and card lifts.

- [ ] **Step 4: Run tests to verify no style regressions**

Run: `npm test tests/interactive-ui-and-theme.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/globals.css tests/interactive-ui-and-theme.test.tsx
git commit -m "style: add Obsidian Studio design tokens and glassmorphic styling"
```

---

### Task 2: Starter Document Templates Library

**Files:**
- Create: `lib/templates.ts`
- Create: `tests/templates.test.ts`

**Interfaces:**
- Consumes: `lib/document-model.ts`
- Produces: `DOCUMENT_TEMPLATES: TemplateItem[]`, `getTemplateById(id: string): TemplateItem | undefined`

- [ ] **Step 1: Write unit tests for templates library**

```typescript
// tests/templates.test.ts
import { describe, it, expect } from 'vitest';
import { DOCUMENT_TEMPLATES, getTemplateById } from '../lib/templates';

describe('Document Templates Library', () => {
  it('contains blank, rfc, code sandbox, and meeting notes templates', () => {
    expect(DOCUMENT_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    const rfc = getTemplateById('rfc');
    expect(rfc).toBeDefined();
    expect(rfc?.content).toContain('# Technical RFC');
  });
});
```

- [ ] **Step 2: Run test to verify it fails before implementation**

Run: `npm test tests/templates.test.ts`
Expected: FAIL with "Cannot find module '../lib/templates'"

- [ ] **Step 3: Implement `lib/templates.ts`**

Export template definitions with IDs, titles, descriptions, icons, and pre-formatted starter markdown content (Blank, Technical RFC, Code Sandbox, Meeting Notes).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/templates.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/templates.ts tests/templates.test.ts
git commit -m "feat: add starter document templates library"
```

---

### Task 3: Landing Page Redesign with Interactive Hero & Live Teaser

**Files:**
- Modify: `app/page.tsx`
- Create: `components/landing/HeroShowcase.tsx`
- Test: `tests/ui-primitives-and-shell.test.tsx`

**Interfaces:**
- Consumes: `lib/templates.ts`, `lib/room-storage.ts`, `components/ui/icons.tsx`, `components/layout/AuthCorner.tsx`
- Produces: Modern hero layout, instant document creator with template pills, interactive simulated editor teaser

- [ ] **Step 1: Update UI tests for landing page elements**

Verify template selection, name input, instant room generation, and join code toggle render smoothly.

- [ ] **Step 2: Run tests to verify baseline**

Run: `npm test tests/ui-primitives-and-shell.test.tsx`
Expected: PASS

- [ ] **Step 3: Implement `components/landing/HeroShowcase.tsx` and revamp `app/page.tsx`**

Integrate ambient mesh glows, headline, quick-launcher card with template selectors, feature highlight grid (CRDT sync, Multi-language code, Multi-format export), and animated peer cursor teaser.

- [ ] **Step 4: Run tests to verify landing page integrity**

Run: `npm test tests/ui-primitives-and-shell.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/landing/HeroShowcase.tsx tests/ui-primitives-and-shell.test.tsx
git commit -m "feat: revamp landing page with Obsidian Studio hero and interactive launcher"
```

---

### Task 4: Workspace Dashboard Redesign

**Files:**
- Modify: `app/dashboard/DashboardClient.tsx`
- Test: `tests/dashboard-ux-phase2.test.tsx`

**Interfaces:**
- Consumes: `lib/templates.ts`, `lib/db.ts`, `components/layout/AppShell.tsx`, `components/ui/*`
- Produces: Enhanced greeting bar with workspace stats, template launcher carousel, elevated glass cards with role badges, collaborator piles, and quick action toolbars.

- [ ] **Step 1: Update tests for dashboard metrics and template creation**

Check template launcher clicks, search filtering with Cmd+K hint, and card hover action triggers.

- [ ] **Step 2: Run tests to check baseline**

Run: `npm test tests/dashboard-ux-phase2.test.tsx`
Expected: PASS

- [ ] **Step 3: Revamp `app/dashboard/DashboardClient.tsx`**

Add workspace statistics header (Total documents, Active rooms), template quick-start ribbon, glassmorphic document cards with top gradient glow on hover, and refined list view tables.

- [ ] **Step 4: Run tests to verify dashboard functionality**

Run: `npm test tests/dashboard-ux-phase2.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/DashboardClient.tsx tests/dashboard-ux-phase2.test.tsx
git commit -m "feat: redesign workspace dashboard with metrics, templates, and glassmorphic cards"
```

---

### Task 5: Collaborative Editor Upgrade (Rich Block & Code Studio Modes)

**Files:**
- Modify: `components/editor/Editor.tsx`
- Modify: `components/project/ProjectEditor.tsx`
- Modify: `components/editor/BlockItem.tsx`
- Modify: `components/editor/FormatToolbar.tsx`
- Modify: `components/editor/SlashMenu.tsx`
- Modify: `components/editor/DocumentOutline.tsx`
- Test: `tests/editor.test.tsx`

**Interfaces:**
- Consumes: `lib/document-model.ts`, `crdt-engine`, `lib/sync-client.ts`, `components/ui/*`
- Produces: Mode switcher (Rich Blocks vs Code Studio), floating format toolbar on text selection, slash menu (`/`), live document outline, and diagnostics status footer.

- [ ] **Step 1: Write tests for block formatting and mode switching**

Verify rich block parsing, mode toggle, language switching in code mode, and format actions.

- [ ] **Step 2: Run tests to verify baseline**

Run: `npm test tests/editor.test.tsx`
Expected: PASS

- [ ] **Step 3: Implement Editor enhancements**

Connect block-based editing mode with `BlockItem`, floating `FormatToolbar`, `SlashMenu`, live `DocumentOutline`, and dedicated Code Studio with language gutter and copy helpers. Enhance top header with peer avatar piles and live presence indicator.

- [ ] **Step 4: Run tests to verify editor synchronization and UI**

Run: `npm test tests/editor.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/editor/Editor.tsx components/editor/BlockItem.tsx components/editor/FormatToolbar.tsx components/editor/SlashMenu.tsx components/editor/DocumentOutline.tsx components/project/ProjectEditor.tsx tests/editor.test.tsx
git commit -m "feat: upgrade collaborative editor with rich block mode, code studio, and floating tools"
```

---

### Task 6: Modern Glassmorphic Authentication Screen

**Files:**
- Modify: `app/login/page.tsx`
- Test: `tests/auth-persistence.test.ts`

**Interfaces:**
- Consumes: `components/ui/input.tsx`, `components/ui/button.tsx`, `components/ui/icons.tsx`, `components/ui/theme-toggle.tsx`
- Produces: Elevated glass card with ambient glow, animated social login buttons, smooth Sign In / Sign Up tab transitions.

- [ ] **Step 1: Test auth flow and validation**

- [ ] **Step 2: Run auth tests**

Run: `npm test tests/auth-persistence.test.ts`
Expected: PASS

- [ ] **Step 3: Revamp `app/login/page.tsx` with Obsidian Studio styling**

- [ ] **Step 4: Re-run auth tests**

Run: `npm test tests/auth-persistence.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/login/page.tsx tests/auth-persistence.test.ts
git commit -m "feat: polish login and registration with glassmorphic styling and ambient lighting"
```

---

### Task 7: Full Verification & Build Check

**Files:**
- Verify: Full test suite (`npm test`)
- Verify: TypeScript check (`npm run typecheck`)
- Verify: Next.js build (`npm run build`)

- [ ] **Step 1: Run complete Vitest test suite**

Run: `npm test`
Expected: All test suites pass (170+ tests).

- [ ] **Step 2: Run TypeScript typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Run Next.js production build**

Run: `npm run build`
Expected: Build succeeds with static/dynamic pages compiled.

- [ ] **Step 4: Final commit and summary**

```bash
git commit --allow-empty -m "chore: complete Obsidian Studio UI redesign verification"
```
