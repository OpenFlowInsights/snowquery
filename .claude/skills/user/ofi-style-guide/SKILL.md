---
name: ofi-style-guide
description: >
  Brand style guidelines for Open Flow Insights — an analytics consulting and SaaS company
  serving healthcare, aesthetics, and small business clients. Use this skill whenever creating
  ANY visual or written content for the business, including: websites, landing pages, SaaS
  application interfaces, dashboards, data visualizations, blog posts, marketing materials,
  pitch decks, email templates, social media content, documentation, or any customer-facing
  deliverable. Trigger this skill when the user mentions Open Flow Insights branding, asks
  for content that should match the company style, requests dashboard UI design, builds a
  web page or app for the business, writes blog posts or marketing copy, or creates any
  artifact that represents the Open Flow Insights brand. If in doubt about whether this
  skill applies, use it — brand consistency matters.
---

# Open Flow Insights — Brand Style Guide

This skill defines the visual identity, design system, and content voice for Open Flow Insights (OFI), an analytics consulting and SaaS company. Every piece of content — from a dashboard widget to a blog post to a landing page — should feel like it belongs to the same family.

## Brand Identity

Open Flow Insights provides analytics consulting, custom dashboards, and SaaS products to healthcare organizations (MSSP ACOs, Medicare Advantage plans, aesthetics practices) and other small-to-mid-size businesses. The brand communicates **clarity from complexity** — turning messy data into confident decisions.

**Brand personality**: Authoritative but approachable. Technically deep but never intimidating. Modern and clean, with the quiet confidence of someone who actually understands the data.

**Brand promise**: We make your data work for you — not the other way around.

---

## Color System

The palette is built on a deep navy-to-bright-blue gradient foundation, accented with clean neutrals and strategic pops of energy.

### Primary Colors

| Token               | Hex       | Usage                                                    |
|----------------------|-----------|----------------------------------------------------------|
| `--ofi-navy`         | `#0B1D3A` | Primary backgrounds, headers, hero sections, nav bars    |
| `--ofi-blue`         | `#1E5FBB` | Primary brand blue — buttons, links, key UI elements     |
| `--ofi-blue-bright`  | `#3B82F6` | Interactive highlights, hover states, active indicators   |
| `--ofi-blue-light`   | `#60A5FA` | Secondary accents, chart highlights, tags                |
| `--ofi-sky`          | `#DBEAFE` | Light backgrounds, card surfaces, subtle highlights       |

### Neutral Colors

| Token               | Hex       | Usage                                                    |
|----------------------|-----------|----------------------------------------------------------|
| `--ofi-white`        | `#F8FAFC` | Page backgrounds, card surfaces (not pure white)         |
| `--ofi-gray-50`      | `#F1F5F9` | Alternate row backgrounds, subtle dividers               |
| `--ofi-gray-200`     | `#E2E8F0` | Borders, separators, disabled states                     |
| `--ofi-gray-500`     | `#64748B` | Secondary text, labels, captions                         |
| `--ofi-gray-700`     | `#334155` | Body text on light backgrounds                           |
| `--ofi-gray-900`     | `#0F172A` | Headings on light backgrounds                            |

### Semantic / Accent Colors

| Token               | Hex       | Usage                                                    |
|----------------------|-----------|----------------------------------------------------------|
| `--ofi-success`      | `#10B981` | Positive metrics, completion, upward trends              |
| `--ofi-warning`      | `#F59E0B` | Caution states, moderate risk, attention needed          |
| `--ofi-danger`       | `#EF4444` | Errors, negative trends, critical alerts                 |
| `--ofi-accent-teal`  | `#14B8A6` | Secondary chart series, differentiator from primary blue |
| `--ofi-accent-purple`| `#8B5CF6` | Tertiary chart series, premium/highlight features        |

### Color Usage Rules

- Dark mode is the default for dashboards and SaaS UIs. Use `--ofi-navy` as the base with lighter blues for hierarchy.
- Light mode is the default for marketing sites, blog posts, and documentation. Use `--ofi-white` as the base with `--ofi-gray-900` text.
- Never use pure white (`#FFFFFF`) or pure black (`#000000`). The palette is intentionally off-axis for a softer, more modern feel.
- Charts should use the blue palette first (`--ofi-blue`, `--ofi-blue-bright`, `--ofi-blue-light`), then extend to teal and purple for additional series. Avoid red/green for primary data series — reserve them for semantic meaning.
- Gradients: Use `--ofi-navy` → `--ofi-blue` for hero sections and dramatic backgrounds. Use `--ofi-blue-bright` → `--ofi-accent-teal` sparingly for accent gradients on CTAs or feature highlights.

### CSS Variables Block

When building any web content, include these at the root:

```css
:root {
  --ofi-navy: #0B1D3A;
  --ofi-blue: #1E5FBB;
  --ofi-blue-bright: #3B82F6;
  --ofi-blue-light: #60A5FA;
  --ofi-sky: #DBEAFE;
  --ofi-white: #F8FAFC;
  --ofi-gray-50: #F1F5F9;
  --ofi-gray-200: #E2E8F0;
  --ofi-gray-500: #64748B;
  --ofi-gray-700: #334155;
  --ofi-gray-900: #0F172A;
  --ofi-success: #10B981;
  --ofi-warning: #F59E0B;
  --ofi-danger: #EF4444;
  --ofi-accent-teal: #14B8A6;
  --ofi-accent-purple: #8B5CF6;
}
```

---

## Typography

### Font Stack

| Role         | Font Family                              | Fallback                          |
|--------------|------------------------------------------|-----------------------------------|
| **Headings** | `"Plus Jakarta Sans", sans-serif`        | `"Outfit", "Inter", sans-serif`   |
| **Body**     | `"Inter", sans-serif`                    | `system-ui, sans-serif`           |
| **Code/Data**| `"JetBrains Mono", monospace`            | `"Fira Code", monospace`          |

Import via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type Scale

| Element       | Size     | Weight | Line Height | Letter Spacing |
|---------------|----------|--------|-------------|----------------|
| Hero heading  | 3rem+    | 800    | 1.1         | -0.03em        |
| H1            | 2.25rem  | 700    | 1.2         | -0.025em       |
| H2            | 1.75rem  | 700    | 1.25        | -0.02em        |
| H3            | 1.25rem  | 600    | 1.3         | -0.01em        |
| Body          | 1rem     | 400    | 1.6         | 0              |
| Body small    | 0.875rem | 400    | 1.5         | 0.01em         |
| Caption/Label | 0.75rem  | 500    | 1.4         | 0.03em         |
| KPI number    | 2rem+    | 700    | 1.1         | -0.02em        |

### Typography Rules

- Headings use Plus Jakarta Sans with tight letter-spacing for a modern, confident feel.
- Body text uses Inter for maximum readability at all sizes.
- Dashboard KPI numbers should be large, bold, and use tabular (monospace) figures for alignment.
- Use font-weight to create hierarchy, not font-size alone. A bold 1rem label can outrank a light 1.25rem subtitle.
- Uppercase text is acceptable only for small labels and category tags (always with increased letter-spacing of 0.05em+).

---

## Layout & Spacing

### Spacing Scale

Use a consistent 4px base unit: 4, 8, 12, 16, 24, 32, 48, 64, 96.

### Layout Principles

- **Cards are the primary container.** Content lives in cards with `border-radius: 12px`, subtle borders (`--ofi-gray-200`), or soft shadows.
- **Generous whitespace.** Don't crowd elements. Padding inside cards should be 24px minimum. Section gaps should be 48–64px on marketing pages.
- **Grid-based layouts.** Dashboards use CSS Grid with consistent gutter widths (16–24px). Marketing pages use a max-width container (1200–1400px) with centered content.
- **Responsive first.** All layouts should work at mobile, tablet, and desktop breakpoints. Dashboard layouts can collapse sidebar navigation into a top bar or hamburger on mobile.

### Border & Shadow System

| Element                | Style                                                             |
|------------------------|-------------------------------------------------------------------|
| Card (light mode)      | `border: 1px solid var(--ofi-gray-200); box-shadow: 0 1px 3px rgba(0,0,0,0.06)` |
| Card (dark mode)       | `border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04)` |
| Elevated card / modal  | `box-shadow: 0 10px 25px rgba(11,29,58,0.15)`                    |
| Input fields           | `border: 1px solid var(--ofi-gray-200); border-radius: 8px`      |
| Focus state            | `outline: 2px solid var(--ofi-blue-bright); outline-offset: 2px`  |

### Border Radius

| Element       | Radius |
|---------------|--------|
| Cards         | 12px   |
| Buttons       | 8px    |
| Inputs        | 8px    |
| Tags/badges   | 6px    |
| Avatars       | 50%    |
| Tooltips      | 6px    |

---

## Component Patterns

### Buttons

```
Primary:   bg: --ofi-blue       text: white       hover: --ofi-blue-bright
Secondary: bg: transparent       text: --ofi-blue  border: --ofi-blue     hover: bg --ofi-sky
Ghost:     bg: transparent       text: --ofi-gray-500  hover: bg --ofi-gray-50
Danger:    bg: --ofi-danger      text: white       hover: darken 10%
```

- Buttons use 500 weight, 0.875rem text, 8–12px vertical / 16–24px horizontal padding.
- Primary actions get one primary button per section. Don't stack multiple primary buttons.
- Icon + text buttons should use 8px gap between icon and label.

### Navigation

- **SaaS/Dashboard sidebar**: Dark navy background (`--ofi-navy`), white/light text, active item highlighted with `--ofi-blue-bright` left border or background tint.
- **Marketing site**: Clean top nav on light background, logo left, links center or right, CTA button right-aligned.
- Active nav items use `--ofi-blue-bright` color or an underline/pill indicator.

### Data Visualization

- Default chart library preference: Recharts (React) or Chart.js. D3 for custom/complex needs.
- Chart backgrounds should be transparent or match their card surface.
- Axis labels use `--ofi-gray-500`, 0.75rem, Inter.
- Grid lines should be very subtle: `--ofi-gray-200` at 0.5px or dashed.
- Tooltips: dark background (`--ofi-navy` at 95% opacity), white text, 8px radius, subtle shadow.
- Always include data labels or tooltips — never leave the user guessing at values.
- Use the blue palette for primary series, teal and purple for secondary. Semantic colors only for their intended purpose.

### KPI Cards

KPI cards are a signature element for OFI dashboards:

```
┌─────────────────────────┐
│  Label (caption style)  │
│  $1.2M  ↑ 12.3%        │  ← Large number + trend indicator
│  vs. prior period       │  ← Context line
└─────────────────────────┘
```

- Large KPI number uses Plus Jakarta Sans, 700 weight, 2rem+.
- Trend arrows use semantic colors (green up, red down).
- Include a comparison context line (vs. last month, vs. benchmark, etc.).

### Tables

- Header row: `--ofi-gray-50` background, `--ofi-gray-700` text, 600 weight, uppercase, small font.
- Alternating row backgrounds optional: `--ofi-white` / `--ofi-gray-50`.
- Hover rows: subtle blue tint (`--ofi-sky` at 50% opacity).
- Right-align numeric columns. Left-align text. Center short status columns.
- Use pill badges for status values (Active = blue, Inactive = gray, Alert = red).

---

## Content Voice & Writing Style

### Tone

- **Confident, not cocky.** We know our stuff. We don't need jargon to prove it.
- **Clear, not dumbed-down.** Assume the reader is smart but busy. Explain concepts efficiently.
- **Warm, not casual.** Professional but human. We're a trusted partner, not a corporate vendor.
- **Precise, not pedantic.** Use exact numbers and specific claims over vague generalizations.

### Writing Rules

- Lead with the insight or benefit, not the feature. "See exactly where your shared savings come from" beats "Dashboard includes financial breakdown module."
- Use active voice. "We built a risk adjustment model" not "A risk adjustment model was built."
- Headlines should be punchy and specific. "Turn CMS Data Into Revenue" not "Our Data Solutions."
- Blog posts should open with a real problem the reader faces, not a history lesson.
- Avoid: "leverage," "synergy," "best-in-class," "cutting-edge," "robust," "seamless." Use plain, specific language instead.
- Healthcare-specific content can use industry terminology (HCC, RAF, MSSP, ACO, HEDIS) but should briefly contextualize for readers who may not know every acronym.
- CTAs should be action-oriented and specific: "See Your Dashboard Demo" > "Learn More" > "Click Here."

### Blog Post Structure

1. **Hook** (1–2 sentences): A specific pain point, surprising stat, or timely question.
2. **Context** (1–2 paragraphs): Why this matters right now — regulation changes, market shifts, etc.
3. **Substance** (bulk of post): The analysis, methodology, or insight. Use subheadings every 200–300 words. Include data, examples, or screenshots when possible.
4. **Takeaway** (1 paragraph): What the reader should do next.
5. **CTA**: Drive to a specific next step — demo, consultation, related resource.

---

## Motion & Interaction

### Animation Defaults

```css
--ofi-transition-fast: 150ms ease;
--ofi-transition-base: 250ms ease;
--ofi-transition-slow: 400ms ease-out;
```

- Hover states: Use `--ofi-transition-fast`. Subtle scale (1.01–1.02) or color shift.
- Page transitions: Fade + slight upward translate (8–16px) over `--ofi-transition-slow`.
- Dashboard data loading: Use skeleton loaders with a subtle shimmer animation (navy → blue-light pulse).
- Chart animations: Stagger bar/line reveals over 600–800ms for visual interest on first load.
- Avoid: Bouncy/elastic animations, excessive movement, or anything that slows down a power user.

### Micro-interactions

- Buttons: Slight scale-down on press (0.98), color shift on hover.
- Cards: Lift shadow + subtle border-color shift on hover.
- Toggle switches: Smooth slide with color transition.
- Toast notifications: Slide in from top-right, auto-dismiss after 4s.

---

## Imagery & Iconography

- **Icons**: Use Lucide icons as the primary icon set. Consistent 24px default size, 1.5px stroke weight.
- **Illustrations**: Prefer clean, geometric, abstract data visualizations as hero imagery over stock photos. Think: flowing lines, node graphs, abstract chart shapes — reinforcing the "flow" in Open Flow Insights.
- **Screenshots**: Dashboard screenshots used in marketing should be wrapped in a device frame or placed on a subtle angled surface with shadow for depth.
- **Avoid**: Generic stock photos of people pointing at screens, clip art, overly literal metaphors.

---

## Dark Mode Dashboard Template

A typical OFI dashboard layout:

```
┌─────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard Title              [Search] [Profile] │  ← Top bar: --ofi-navy
├────────┬────────────────────────────────────────────────┤
│        │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│ Nav    │  │ KPI  │ │ KPI  │ │ KPI  │ │ KPI  │         │  ← KPI row
│ Items  │  └──────┘ └──────┘ └──────┘ └──────┘         │
│        │  ┌────────────────────┐ ┌──────────────┐      │
│        │  │                    │ │              │      │
│        │  │   Main Chart       │ │  Side Panel  │      │  ← Content area
│        │  │                    │ │              │      │
│        │  └────────────────────┘ └──────────────┘      │
│        │  ┌────────────────────────────────────┐       │
│        │  │          Data Table                 │       │  ← Table section
│        │  └────────────────────────────────────┘       │
└────────┴────────────────────────────────────────────────┘
```

- Sidebar: 240px wide, collapsible. `--ofi-navy` background.
- Content area: Slightly lighter than sidebar (e.g., `#0F2347` or `rgba(255,255,255,0.02)` over navy).
- Cards float above the content area with the dark-mode card treatment described above.

---

## Light Mode Marketing Template

```
┌─────────────────────────────────────────────────────────┐
│ [Logo]       Services  About  Blog        [Get a Demo]  │  ← Nav bar
├─────────────────────────────────────────────────────────┤
│                                                         │
│          Hero: Gradient (navy → blue)                   │
│          White heading text, subheading, CTA button     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Feature cards (3 columns)                             │  ← --ofi-white bg
│   Icon + heading + short description                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Social proof / metrics bar                            │  ← --ofi-sky bg
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Detailed sections with screenshots                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│          CTA section: Gradient bg, white text            │
├─────────────────────────────────────────────────────────┤
│          Footer: --ofi-navy bg, light text               │
└─────────────────────────────────────────────────────────┘
```

---

## Quick-Reference Checklist

Before shipping any OFI-branded content, verify:

- [ ] Colors use the defined palette (no pure black/white, no off-brand blues)
- [ ] Headings use Plus Jakarta Sans; body uses Inter
- [ ] Cards have 12px radius, proper borders/shadows for light or dark mode
- [ ] Charts use the blue-first color sequence
- [ ] KPI cards include trend indicators and comparison context
- [ ] Copy leads with benefits, uses active voice, avoids jargon buzzwords
- [ ] CTAs are specific and action-oriented
- [ ] Dark mode for dashboards, light mode for marketing (unless specified otherwise)
- [ ] Spacing follows the 4px grid system
- [ ] Animations are subtle and purposeful
