# Design System Specification: The Vigilant Interface

## 1. Overview & Creative North Star: "The Digital Sentinel"
The design system for this enterprise security platform departs from the cluttered, "dashboard-heavy" tropes of legacy SaaS. Our Creative North Star is **The Digital Sentinel**: an interface that feels like a high-end editorial publication—authoritative, calm, and hyper-legible. 

To break the "template" look, we move away from rigid, boxed-in grids. We embrace **intentional asymmetry** and **tonal depth**. By utilizing expansive white space (or "dark space") and overlapping elements, we create a sense of sophisticated machinery working silently in the background. The goal is to reduce cognitive load for security professionals by prioritizing information through scale and contrast rather than borders and lines.

---

## 2. Colors & Surface Architecture
We utilize a sophisticated Material-based palette that favors deep indigo-tinted neutrals over flat grays to maintain a premium, high-contrast feel.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or layout containment. 
Boundaries must be defined solely through:
- **Background Color Shifts:** Placing a `surface-container-low` section against a `surface` background.
- **Tonal Transitions:** Using soft gradients or varying the `surface-container` tiers (Lowest to Highest) to denote change in context.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—stacked sheets of frosted glass or fine, heavy-weight paper.
- **Base Level:** `surface` (#0b1326)
- **Secondary Level:** `surface-container-low` (#131b2e) for secondary sidebars or background groupings.
- **Interactive Level:** `surface-container` (#171f33) for primary workspace areas.
- **Prominence Level:** `surface-container-high` (#222a3d) or `highest` (#2d3449) for cards and modals that require immediate focus.

### The "Glass & Gradient" Rule
Floating elements (modals, popovers, bottom navigation) should utilize **Glassmorphism**. Apply a semi-transparent `surface-variant` with a 12px to 20px `backdrop-blur`. 
**Signature Textures:** For primary CTAs and Hero sections, use a subtle linear gradient (135°) from `primary` (#afc6ff) to `primary-container` (#2065d1) to provide "visual soul" and depth.

---

## 3. Typography: Editorial Authority
The system pairs **Manrope** (Display/Headline) with **Inter** (Body/Labels) to balance modern aesthetics with clinical precision.

- **The Power of Scale:** Use `display-lg` (3.5rem) sparingly for high-level security scores or critical metrics to create an editorial "masthead" feel.
- **Precision Numbers:** All timestamps, IP addresses, and data strings must utilize `font-variant-numeric: tabular-nums;`. This ensures vertical alignment in logs and security audits.
- **Hierarchy through Weight:** Use `label-md` in all-caps with 0.05em tracking for metadata to differentiate it from actionable body text.

---

## 4. Elevation & Depth: Tonal Layering
Traditional structural lines are replaced by **The Layering Principle**.

- **Ambient Shadows:** Shadows are reserved for "floating" components only (e.g., Modals, Tooltips). Use a `40px` blur with `4%` opacity, tinted with `primary` (#afc6ff) to mimic natural ambient light. 
- **The "Ghost Border" Fallback:** If a border is required for accessibility (e.g., input fields), use `outline-variant` (#424753) at **20% opacity**. Never use 100% opaque borders.
- **Integrated Glass:** Use `surface-tint` (#afc6ff) at 5% opacity on top of containers to create a "sheen" that makes the UI feel like a singular, integrated piece of hardware.

---

## 5. Components

### Modern Cards & Lists
- **Forbid Dividers:** Do not use line separators. Use a `1.5` (0.3rem) to `3` (0.6rem) spacing gap or a slight shift to `surface-container-low` for separation.
- **Cards:** Use `xl` (0.75rem) roundedness. Content should be padded with `spacing-8` (1.75rem) to provide breathing room.

### Buttons & Interaction
- **Primary:** Gradient fill (Primary to Primary-Container). `md` (0.375rem) roundedness.
- **Secondary/Ghost:** `surface-container-highest` background with `on-surface` text. No border.
- **Status Chips:** High-contrast pill shapes (`full` roundedness). Use `secondary-container` for Success and `error_container` for Danger, with high-saturation text for legibility.

### Bottom Navigation (The Dock)
Designed as a floating "Dock" rather than a pinned bar.
- **Styling:** `surface-container-high` with 80% opacity and `backdrop-blur: 12px`. 
- **Active State:** A vertical `primary` bar (2px) or a subtle "glow" underneath the active icon.

### Input Fields
- **Background:** `surface-container-lowest`.
- **Active State:** Transition to a "Ghost Border" of `primary` at 40% opacity. 
- **Tabular Data:** Use `Inter` with `body-md` for all form entries to maintain a clean, professional SaaS aesthetic.

---

## 6. Do’s and Don’ts

### Do:
- **Use Asymmetry:** Align high-level titles to the left but position secondary actions/filters with generous, uneven padding to create a bespoke feel.
- **Prioritize Breathing Room:** Use the `spacing-16` and `spacing-20` scales to separate major content blocks.
- **Use High-Quality Icons:** Use 2px stroke weight icons; avoid "filled" icons unless indicating an active state.

### Don't:
- **Don't use #000000:** Even in Dark Mode, the darkest surface should be `surface` (#0b1326) to maintain tonal richness.
- **Don't use Box-Shadows for depth:** Use background color steps (Surface -> Surface Low -> Surface Lowest) instead.
- **Don't use Standard Grids:** Occasionally break the grid by having images or data visualizations bleed into the margins to enhance the "Editorial" look.