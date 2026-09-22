# Obsidian Studio UI Redesign Specification

**Date:** 2026-09-23  
**Status:** Approved  
**Topic:** Modern "Obsidian Studio" UI & UX Redesign for Braid  

---

## 1. Executive Summary

Braid is a high-performance, real-time collaborative document and code editor powered by custom RGA CRDTs with Lamport causality tracking. The previous UI was utilitarian and flat, giving a "dead" visual impression. 

This specification defines the comprehensive redesign into **"Obsidian Studio"**—a developer-first, glassmorphic, dynamic interface inspired by Linear, Raycast, and Vercel. The redesign spans global design tokens, the landing page, the user workspace dashboard, the collaborative block/code editor, authentication, and navigation components.

---

## 2. Design System & Theme Foundations (`globals.css` & UI Primitives)

### 2.1 Theme & Color Palette
* **Dark Mode (Default)**:
  - Canvas Background: `#09090b` (zinc-950) with subtle ambient radial gradients (`rgba(255, 85, 51, 0.05)` and `rgba(99, 102, 241, 0.04)`).
  - Elevated Surfaces: `#121215` to `#18181b` with translucent glassmorphic backdrop filters (`backdrop-blur-xl bg-zinc-900/70`).
  - Subtle Luminescent Borders: `rgba(255, 255, 255, 0.08)` to `rgba(255, 255, 255, 0.15)`.
  - Accents: Coral Gradient (`#ff5733` ➔ `#e11d48`), Indigo Glow (`#6366f1`), Emerald Active Status (`#10b981`), Amber Warning (`#f59e0b`).
  - Text Hierarchy: Primary `#f4f4f5` (zinc-100), Muted `#a1a1aa` (zinc-400), Subtle `#71717a` (zinc-500).
* **Light Mode**:
  - Canvas Background: `#fcfcfd` with subtle ambient warmth.
  - Elevated Surfaces: `#ffffff` with crisp borders (`rgba(0, 0, 0, 0.07)`).
  - Text Hierarchy: Primary `#09090b`, Muted `#52525b`, Subtle `#a1a1aa`.

### 2.2 Micro-Interactions & Transitions
* **Elevation & Lift**: Cards apply `hover:-translate-y-1 hover:shadow-2xl hover:border-zinc-700/60` with smooth cubic-bezier transitions.
* **Glows & Shimmers**: Dynamic gradient badges, active pulse dots for live presence and WebSocket health, and subtle skeleton shimmer loading states.
* **Focus States**: High-contrast, non-obtrusive focus rings (`ring-2 ring-[var(--accent)]/40 outline-none`).

---

## 3. Landing Page Experience (`app/page.tsx`)

### 3.1 Hero Section
* **Ambient Lighting & Mesh Grid**: Modern animated background pattern with subtle glow orbs.
* **Brand Badge**: `"⚡ Powered by Custom RGA CRDTs & Lamport Clocks"`.
* **Headline & Sub-headline**:
  - Headline: *"Where technical thoughts intertwine in real time."*
  - Sub-headline: *"Blazing-fast, conflict-free document and code collaboration engineered for builders and technical teams."*

### 3.2 Instant Workspace Launcher Card
* Single streamlined interface supporting:
  - **Your Name input** with saved state persistence.
  - **Quick Action Switcher**: "Create Instant Document" vs "Join Existing Room".
  - **Starter Templates Bar**:
    1. *Blank Canvas* (clean empty document).
    2. *Technical RFC / Spec* (pre-populated with Problem, Architecture, Decisions).
    3. *Code Sandbox* (pre-populated with TypeScript/Python snippets).
    4. *Meeting Notes* (pre-populated with Agenda, Decisions, Action Items).
* **One-Click Actions**: Auto-creates or joins room with instant routing.

### 3.3 Interactive Feature Showcase & Live Teaser
* Three interactive cards highlighting core capabilities:
  1. *Sub-Millisecond Conflict-Free Sync* (RGA CRDT visual explanation).
  2. *Multi-Language Code Studio* (12+ languages, syntax styles, line numbers).
  3. *Multi-Format Document Export* (PDF, Word DOCX, Markdown, HTML).
* Simulated live document editor preview demonstrating simulated peer carets typing.

---

## 4. Workspace Dashboard (`app/dashboard/DashboardClient.tsx`)

### 4.1 Header & Metrics Summary
* Personalized greeting with user avatar, room metrics (Total Documents, Active Sessions, Shared Documents).
* Quick action: `+ New Document` button with primary gradient styling.

### 4.2 Template Quick-Launch Strip
* Horizontal grid of modern template cards with distinctive icons, titles, and instant creation handlers.

### 4.3 Redesigned Document Cards & List Views
* **Grid View**:
  - Glassmorphic rounded cards with subtle top border accent gradient on hover.
  - Document Title with tooltip on overflow, clean content snippet preview.
  - Role pill (`OWNER`, `EDITOR`, `VIEWER`).
  - Active/Collaborator avatar pile.
  - Last updated relative timestamp.
  - Quick action toolbar on hover: Share QR/Link, Rename modal trigger, Duplicate, and Delete.
* **List View**:
  - Crisp tabular rows with owner avatars, role badges, relative timestamps, and hover action icons.
* **Filter & Search Bar**:
  - Search input with clear button and keyboard shortcut indicator (`Cmd+K`).
  - Filter pills: *All Documents*, *My Documents*, *Shared with me*, *Recent*.
  - Sort dropdown: *Recently updated*, *Recently created*, *Alphabetical*.

---

## 5. Collaborative Document & Code Editor (`components/editor/Editor.tsx` & `ProjectEditor.tsx`)

### 5.1 Editor Header Bar
* Breadcrumb navigation (`Braid / Document Title`).
* Inline document title editing with instantaneous sync.
* Real-time auto-save indicator with animated pulse (`Saved`, `Saving...`, `Offline`).
* Live peer presence roster:
  - Avatar cluster showing active collaborator initials with custom peer colors.
  - Peer dropdown listing names, site IDs, and active status.
* Export dropdown: high-fidelity PDF, DOCX, Markdown, HTML, Plain text.
* Share button: opens modal with direct room link and live QR code generator.

### 5.2 Rich Block Mode & Multi-Language Code Studio
* **Mode Toggle**: Seamlessly switch between **Rich Block Mode** and **Code Studio Mode**.
* **Rich Block Mode**:
  - Supports Headings (H1, H2, H3), Bullet Lists, Numbered Lists, Task Checklists (with interactive toggleable checkboxes), Quotes, Callout Boxes (Info, Warning, Success), and Dividers.
  - Floating format toolbar appearing on text selection (Bold, Italic, Code, Strikethrough, Convert Block).
  - Slash command menu (`/`) triggered on typing `/` at start of line for instant block creation.
* **Code Studio Mode**:
  - Clean monospace typography, language selector dropdown (TypeScript, JavaScript, Python, Rust, Go, C++, Java, SQL, HTML, CSS, JSON), line number gutter, copy code button, and auto-indentation on Enter/Tab.

### 5.3 Document Diagnostics & Stats Footer
* Sticky bottom bar showing live word count, character count, estimated reading time, Lamport clock operations count, and connection latency status.

---

## 6. Authentication Page (`app/login/page.tsx`)

* Centered elevated glassmorphic card with glowing backdrop.
* Modern brand logo with smooth hover transition.
* Two social auth buttons (Google and GitHub) with hover lifts.
* Divider with "or with email".
* Polished input fields with floating labels, error alert animations, and smooth Sign In / Sign Up tab transitions.

---

## 7. Verification & Success Criteria

1. **Visual Appeal**: Dark and light modes render with modern glassmorphic surfaces, ambient glows, crisp typography, and fluid micro-interactions.
2. **Functionality Preservation**: Full CRDT synchronization, presence tracking, document persistence, user authentication, and export formats (PDF, DOCX, MD) continue to function deterministically with 100% test pass rate.
3. **Responsive Design**: Flawless layout on desktop, tablet, and mobile screen sizes.
4. **Performance**: Zero lag or layout shifts during real-time typing and block manipulation.
