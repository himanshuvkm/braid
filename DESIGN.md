 The Weekly Creative — Design System

A living document describing the visual language, design tokens, component patterns, and interaction model for the newsletter landing page.

---

## 1. Design Philosophy

The site follows an **editorial-minimal** aesthetic: bold typography, generous whitespace, and a bento-grid layout language. The goal is to feel confident, clean, and creator-focused without visual noise.

- **Tone:** Direct, premium, friendly.
- **Visual hierarchy:** Headlines dominate; supporting copy is restrained.
- **Surface model:** Light, airy backgrounds with high-contrast foreground cards separated by thin gaps.
- **Motion:** Smooth, staggered entrances with a consistent easing curve.

---

## 2. Color System

Colors are defined as HSL CSS custom properties in `src/index.css` and exposed through `tailwind.config.ts`.

### Core Tokens

| Token | HSL | Usage |
|-------|-----|-------|
| `--background` | `240 4% 96%` | Page canvas (soft warm gray) |
| `--foreground` | `0 0% 0%` | Primary text, buttons, borders |
| `--card` | `30 10% 97%` | Card surfaces inside the bento grid |
| `--muted` | `240 4% 93%` | Subtle backgrounds, icon wells |
| `--muted-foreground` | `0 0% 40%` | Secondary text, placeholders |
| `--accent` | `15 80% 88%` | Warm peach accent |
| `--border` | `240 4% 90%` | Dividers and input borders |
| `--ring` | `0 0% 0%` | Focus rings |

### Gradient Accents

Soft pastel gradients are used for buttons, benefit icons, and visual highlights. The primary gradient is:

```css
linear-gradient(135deg, #F5C6B0, #F4A5A0, #E8A0BF)
```

Additional benefit gradients use peach, lavender, sky, mint, and blush tones to add variety while staying in the same muted family.

### Dark Mode

The current release is light-mode only. Tokens are structured so a dark theme can be added later by overriding the HSL values in a `.dark` root selector.

---

## 3. Typography

### Font Stack

- **Headings:** `Montserrat`, sans-serif — geometric, bold, editorial.
- **Body:** `Inter`, system-ui, sans-serif — clean, readable, neutral.

### Type Scale

| Element | Size | Weight | Tracking | Line Height |
|---------|------|--------|----------|-------------|
| Hero H1 | `text-5xl` / `lg:text-7xl` | `font-black` | `tracking-tighter` | `leading-[0.95]` |
| Section H2 | `text-3xl` / `lg:text-5xl` | `font-black` | `tracking-tight` | `leading-[1]` |
| Card headline | `text-xl` / `lg:text-2xl` | `font-black` | — | `leading-snug` |
| Body | `text-base` / `lg:text-lg` | `font-normal` | — | `leading-relaxed` |
| UI labels | `text-sm` | `font-semibold` / `font-medium` | — | — |

### Text Wrapping

- Headings use `text-wrap: balance`.
- Body paragraphs use `text-wrap: pretty` with `overflow-wrap: break-word`.

---

## 4. Spacing & Layout

### Bento Grid

The page is wrapped in a single rounded container (`rounded-2xl`, `bg-black`, `p-[2px]`) with `gap-[2px]` between tiles. Each major section is a tile with `bg-card`. The 2px black gaps create a subtle masonry/board aesthetic.

```tsx
<div className="flex flex-col gap-[2px] bg-black rounded-2xl overflow-hidden p-[2px]">
  <HeroSection />
  <SampleIssues />
  <BenefitsSection />
  <AboutAuthor />
  <SubscribeSection />
  <Footer />
</div>
```

### Section Padding

- Internal tile padding: `p-8 lg:p-14`.
- Utility helpers in `index.css`:
  - `.section-padding-sm`: `py-20 lg:py-24 px-6`
  - `.section-padding-lg`: `py-24 lg:py-32 px-6`

### Page Margins

- Outer wrapper: `mx-auto px-5 lg:px-10 pb-5 lg:pb-10`.
- Navbar sits outside the bento wrapper with matching horizontal padding.

---

## 5. Components

### Navbar

- Fixed-height header (`h-[100px]`).
- Logo: `text-xl font-black tracking-tight` in Montserrat.
- Links: muted text that darkens on hover.
- CTA: pill-shaped `rounded-full` button with foreground background and inverted text.

### HeroSection

- Two-column layout on desktop: headline left, stacked social-proof + image cells right.
- Full-width email signup bar below the main row.
- Primary CTA uses the soft peach gradient in a pill shape.
- Inputs are `rounded-full` with subtle borders and focus rings.

### SampleIssues

- Grid of issue preview cards.
- Cards use `rounded-2xl`, borders, and hover lift (`hover:-translate-y-1 hover:shadow-xl`).
- Tags are small, clean badges with consistent radius.

### BenefitsSection

- Two-column layout: heading left, checklist right.
- Each benefit has a small circular icon well with a unique pastel gradient.
- Icons use a bold `Check` mark.

### AboutAuthor

- Wrapped in a soft gradient background.
- Profile image with clean border/shadow treatment.
- Card-like container for the content.

### SubscribeSection

- High-contrast dark tile (`bg-foreground`, light text).
- Pill-shaped input and button.
- Success state shows a rounded confirmation badge.

### Footer

- Rounded-bottom tile (`rounded-b-2xl`).
- Brand name, social links (single-letter avatars), copyright, and legal links.
- Social icons sit in muted circular wells with hover inversion.

---

## 6. Motion & Interaction

### Easing

Primary easing curve across the site:

```ts
[0.16, 1, 0.3, 1]
```

This gives entrances a quick start and a long, elegant settle.

### Entrance Patterns

- Sections fade up from `y: 20` with `opacity: 0`.
- Hero text elements use a subtle blur-in (`filter: blur(4px)` → `blur(0px)`).
- Staggered children use incremental `delay` values (e.g., `0.1`, `0.2`, `0.3`).

### Hover States

- Cards: `hover:-translate-y-1 hover:shadow-xl transition-all duration-300`.
- Buttons: `hover:opacity-90 active:scale-[0.97]`.
- Links: color transitions over `200ms`.

### Scroll Behavior

- `html { scroll-behavior: smooth; }` enables anchor-link smooth scrolling.
- Sections animate in once when `whileInView` triggers (`viewport={{ once: true }}`).

---

## 7. Border Radius

Radius is centralized through the `--radius` token (`1rem`) and Tailwind extensions:

| Class | Value |
|-------|-------|
| `rounded-sm` | `calc(var(--radius) - 4px)` |
| `rounded-md` | `calc(var(--radius) - 2px)` |
| `rounded-lg` | `var(--radius)` |
| `rounded-xl` | `calc(var(--radius) + 4px)` |
| `rounded-2xl` | `calc(var(--radius) + 8px)` |

Cards and major containers use `rounded-2xl`; buttons and inputs use `rounded-full` for a pill shape.

---

## 8. Responsive Strategy

- **Mobile-first:** Layouts stack vertically on small screens.
- **Desktop enhancements:** Two-column grids, larger type, and side-by-side cells appear at `lg:` breakpoints.
- **Bento grid:** The 2px gap structure is preserved across all viewports; tiles simply reflow.
- **Navbar:** Links collapse on mobile (a mobile menu can be added later).

---

## 9. Accessibility

- Focus rings use `ring` tokens with `focus:ring-2`.
- Buttons and inputs have visible disabled states.
- Form errors are announced visually and use `text-destructive`.
- Images include descriptive `alt` text.
- Interactive elements maintain adequate touch targets.

---

## 10. Usage Guidelines

### Do

- Use semantic tokens (`bg-card`, `text-foreground`, `text-muted-foreground`) instead of hardcoded colors.
- Keep cards inside the bento wrapper for visual consistency.
- Use `rounded-2xl` for cards and `rounded-full` for CTAs/inputs.
- Apply the shared easing curve for motion.

### Avoid

- Hardcoded colors like `text-white` or `bg-black` in components.
- Heavy drop shadows; prefer flat cards with subtle borders.
- Breaking the 2px bento gap rhythm.
- Over-animating; keep motion purposeful and restrained.

---

## 11. File Map

| File | Responsibility |
|------|----------------|
| `src/index.css` | Design tokens, base styles, utilities |
| `tailwind.config.ts` | Tailwind theme extensions |
| `src/components/Navbar.tsx` | Site header |
| `src/components/HeroSection.tsx` | Hero + primary email capture |
| `src/components/SampleIssues.tsx` | Issue preview grid |
| `src/components/BenefitsSection.tsx` | Value proposition checklist |
| `src/components/AboutAuthor.tsx` | Author bio |
| `src/components/SubscribeSection.tsx` | Secondary email capture |
| `src/components/Footer.tsx` | Footer |
| `src/pages/Index.tsx` | Bento-grid page composition |

---

*Last updated: 2026-08-31*
