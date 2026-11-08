# Design tokens and components

Larkspur is the app's small design system: custom properties in [`tokens.css`](../../web/src/styles/tokens.css), which holds every value, element defaults in [`base.css`](../../web/src/styles/base.css), shared `k-` classes in [`components.css`](../../web/src/styles/components.css) and page layouts in [`app.css`](../../web/src/styles/app.css). Components use the tokens only, so a theme changes in one place.

## Themes

Light values sit on `:root`. Dark values apply when the system prefers dark and the person has not forced light, or when the header's switch sets `data-theme="dark"` on `<html>`; the remembered choice is applied before the first render. `color-scheme` follows the theme, so native controls match. `web/tests/design-tokens.test.ts` checks that the two copies of the dark palette are identical.

## Colour

| Token                             | Used for                                                       |
| --------------------------------- | -------------------------------------------------------------- |
| `--color-bg`                      | Page background                                                |
| `--color-surface`                 | Cards, header, inputs, dialogs                                 |
| `--color-sunken`                  | Notices, the readiness checklist, the filter group, hovers     |
| `--color-text`                    | Body text and headings                                         |
| `--color-text-muted`              | Hints, metadata, summary labels, filters that are off          |
| `--color-border`                  | Card and panel outlines (decorative, so 1.4.11 does not apply) |
| `--color-border-strong`           | Borders of inputs, selects, secondary buttons and Fix links    |
| `--color-primary`                 | Links, primary buttons, current and finished steps             |
| `--color-on-primary`              | Text and icons on `--color-primary`                            |
| `--color-primary-soft`            | The unread badge, Fix-link hover                               |
| `--color-accent`                  | Eyebrow text, the unread dot, the logo's lines                 |
| `--color-danger`                  | Field errors, invalid borders, Decline and Leave buttons       |
| `--color-danger-soft`             | Error notices, danger-button hover                             |
| `--color-success`                 | The Accepted pill, "Everything is in place"                    |
| `--color-warning`                 | The In-review pill, the checklist's heading and edge           |
| `--color-info`                    | The Submitted pill                                             |
| `--color-focus`                   | The focus ring                                                 |
| `--color-grid`, `--color-overlay` | The landing page's dotted background; the dialog backdrop      |

## Contrast

WCAG 2.2 contrast ratios for every foreground and background pair the screens use. Text needs 4.5:1 (success criterion 1.4.3); control borders and the focus ring need 3:1 (1.4.11). `web/tests/design-tokens.test.ts` reads this table, recomputes each ratio from `tokens.css` in both themes, and fails if a pair falls short or a figure here is wrong.

| Use                                            | Foreground on background     | Light   | Dark    | Needs |
| ---------------------------------------------- | ---------------------------- | ------- | ------- | ----- |
| Body text                                      | `text` on `bg`               | 14.98:1 | 15.57:1 | 4.5:1 |
| Text on cards                                  | `text` on `surface`          | 16.01:1 | 14.42:1 | 4.5:1 |
| Text on sunken panels                          | `text` on `sunken`           | 13.83:1 | 16.31:1 | 4.5:1 |
| Secondary text                                 | `text-muted` on `bg`         | 6.10:1  | 7.90:1  | 4.5:1 |
| Secondary text on cards; Draft pill            | `text-muted` on `surface`    | 6.52:1  | 7.31:1  | 4.5:1 |
| Secondary text on panels; filters that are off | `text-muted` on `sunken`     | 5.64:1  | 8.28:1  | 4.5:1 |
| Links                                          | `primary` on `bg`            | 5.98:1  | 8.97:1  | 4.5:1 |
| Links and Fix links on cards                   | `primary` on `surface`       | 6.39:1  | 8.31:1  | 4.5:1 |
| Unread badge                                   | `primary` on `primary-soft`  | 5.18:1  | 6.09:1  | 4.5:1 |
| Primary buttons, skip link                     | `on-primary` on `primary`    | 6.39:1  | 8.44:1  | 4.5:1 |
| Eyebrow text                                   | `accent` on `bg`             | 6.03:1  | 8.90:1  | 4.5:1 |
| Field errors, Decline button                   | `danger` on `surface`        | 6.57:1  | 6.08:1  | 4.5:1 |
| Decline button on hover                        | `danger` on `danger-soft`    | 5.41:1  | 5.43:1  | 4.5:1 |
| Error notice text                              | `text` on `danger-soft`      | 13.18:1 | 12.87:1 | 4.5:1 |
| Accepted pill                                  | `success` on `surface`       | 6.05:1  | 8.53:1  | 4.5:1 |
| In-review pill                                 | `warning` on `surface`       | 6.33:1  | 9.61:1  | 4.5:1 |
| Checklist heading                              | `warning` on `sunken`        | 5.47:1  | 10.88:1 | 4.5:1 |
| Submitted pill                                 | `info` on `surface`          | 7.00:1  | 7.69:1  | 4.5:1 |
| Input and button borders (non-text)            | `border-strong` on `surface` | 4.02:1  | 3.44:1  | 3:1   |
| Primary button against a card (non-text)       | `primary` on `surface`       | 6.39:1  | 8.31:1  | 3:1   |
| Focus ring on the page (non-text)              | `focus` on `bg`              | 5.02:1  | 8.02:1  | 3:1   |
| Focus ring on cards (non-text)                 | `focus` on `surface`         | 5.36:1  | 7.43:1  | 3:1   |

`--color-border` is deliberately faint: it outlines cards and panels, which are not controls. Disabled buttons are drawn at half opacity, which WCAG exempts. Status never relies on colour alone: every pill has an icon and a word.

## Type, space and shape

- **Fonts:** Bricolage Grotesque for headings and the brand, Atkinson Hyperlegible for everything else, JetBrains Mono for eyebrows, step numbers and word counts. They are bundled through Fontsource and served from the app's own origin, so the CSP keeps `font-src 'self'`.
- **Sizes** follow a 1.25 ratio from 16px (`--text-xs` 12px to `--text-4xl` 49px), with 13 and 14px for dense controls; inputs stay at 16px so phones do not zoom on focus. Body text has a line height of 1.5, headings 1.15.
- **Space** is on a 4px base (`--space-0-5` 2px to `--space-12` 48px); the content column is at most 1180px, and the header lines up with it.
- **Radius:** 6px for controls, 10px for cards, 16px for dialogs, 999px for pills.
- **Shadow:** `--shadow-1` raises cards and the pressed queue filter, `--shadow-2` lifts dialogs. The dark theme separates layers with borders instead.
- **Motion:** `--duration-micro` (120ms) animates button presses and the skip link. With `prefers-reduced-motion: reduce` it becomes 0ms, which the design-tokens test checks, and the loading shimmer stops.

Custom properties cannot be used in media queries, so the three breakpoints are numbers:

| Width       | What changes                                                                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| up to 479px | Phones: cards pad 16px instead of 24px; Sign out shows its icon only; page titles step down to `--text-xl`; the queue filters fill the width; the dialog's buttons stack.           |
| up to 599px | The stepper becomes numbered dots joined by a line (the page heading names the step); summaries put each label above its value; the press name leaves the header; list items stack. |
| up to 860px | The landing page and the decision screen become one column (the sign-in card comes before the feature points); from 600 to 860px the points sit three across.                       |

## Focus and target sizes

Every focusable element gets a 2px `--color-focus` outline, offset 2px, on `:focus-visible`; text inputs, selects and text areas show it on any focus, because a date input's inner parts never match `:focus-visible`. Headings that receive focus after navigation draw no ring, since they are not interactive. The header is not sticky, so nothing covers a focused element.

Pointer targets are at least 24 by 24px (WCAG 2.5.8): buttons are at least 38px tall (34px in the filter group), inputs 40px, Fix links and links on their own line 32px, stepper items 34px, lock buttons 26px. Checkboxes and radio buttons are 20px inside labels at least 32px tall, which are the target.

## Components

| Component           | Accessibility                                                                                                 | File                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `Button`            | Native `<button type="button">`; disabled and `aria-busy` while busy; icon-only uses need `aria-label`        | [`ui.tsx`](../../web/src/components/ui.tsx)                       |
| `Notice`            | Errors are `role="alert"`; other tones are page content, announced through the live region when they are news | [`ui.tsx`](../../web/src/components/ui.tsx)                       |
| `Loading`           | `role="status"` named by its `label`                                                                          | [`ui.tsx`](../../web/src/components/ui.tsx)                       |
| `Main`              | `id="main"` for the skip link; focusable for navigation                                                       | [`ui.tsx`](../../web/src/components/ui.tsx)                       |
| `Empty`             | An `h1` when it is the whole page (not found, wrong role), else an `h2`                                       | [`ui.tsx`](../../web/src/components/ui.tsx)                       |
| `ConfirmDialog`     | Modal `<dialog role="alertdialog">`, labelled and described; the safe choice first; Escape cancels            | [`ConfirmDialog.tsx`](../../web/src/components/ConfirmDialog.tsx) |
| `AnnouncerProvider` | One polite live region, present before any message and cleared first so a repeat is heard                     | [`Announcer.tsx`](../../web/src/components/Announcer.tsx)         |
| `Header`            | The theme button's name states the theme; Sign out keeps its name when only the icon shows                    | [`Header.tsx`](../../web/src/components/Header.tsx)               |
| `StatusPill`        | Icon plus word                                                                                                | [`StatusPill.tsx`](../../web/src/components/StatusPill.tsx)       |
| `Field`             | Hint and error tied with `aria-describedby`; `aria-invalid` while there is an error                           | [`fields.tsx`](../../web/src/wizard/fields.tsx)                   |
| `LockedValue`       | WAI-ARIA disclosure with `aria-expanded`, `aria-controls` and a label per field                               | [`SubmissionView.tsx`](../../web/src/author/SubmissionView.tsx)   |

CSS-only patterns: `k-card`, `k-stack` and `k-cluster` for layout; `k-input`, `k-select`, `k-textarea` and `k-field` for forms; `k-segmented` for the queue filters, where the pressed one is raised with a strong border; `stepper`, which becomes dots on phones; `checklist` and `fix-link` on the review step; `summary` for label and value pairs; `choice` for radio buttons and checkboxes.
