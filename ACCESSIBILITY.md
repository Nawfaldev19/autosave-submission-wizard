# Accessibility

**Target:** [WCAG 2.2](https://www.w3.org/TR/WCAG22/) level AA, using the [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) for widgets. This is a target, not a claim of conformance.

## What is checked, and how

| Check                   | How                                                                                                                                                                                                                                             | Result                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Automated audit         | axe-core 4.14.0, WCAG 2.0–2.2 A and AA rules, over 24 page states of the production build in both themes. Run by hand with the commands in [audit accessibility](docs/how-to/audit-accessibility.md).                                           | 0 violations on 2026-10-17 |
| Contrast                | `web/tests/design-tokens.test.ts` recomputes the WCAG ratio of every colour pair in the [design tokens](docs/reference/design-tokens.md#contrast) table, in both themes, from `tokens.css`: 4.5:1 for text, 3:1 for borders and the focus ring. | Passing                    |
| Keyboard                | End-to-end test "signing in and opening a submission work with the keyboard": the skip link is the first stop, Enter signs in, focus lands on the new page's heading, and a queue item opens with Tab and Enter.                                | Passing                    |
| Focus management        | Component tests: focus moves to each new page's heading; a Fix link focuses its field once; focus returns to the file input after an upload; "Show older" moves focus to the first new entry; dialogs keep focus inside.                        | Passing                    |
| Names, roles and states | Component and end-to-end tests find elements by role and accessible name, so a missing label fails a test.                                                                                                                                      | Passing                    |
| Announcements           | Errors are alerts. Success messages go through one polite live region that is present from the start; upload results and loading states use `role="status"`.                                                                                    | Covered by component tests |
| Reflow and targets      | `e2e/responsive.spec.ts` fails if key pages scroll sideways at 375 and 768px and checks the stepper's targets; `e2e/tablet.spec.ts` runs at 768×1024 with touch.                                                                                | Passing                    |
| Motion                  | With `prefers-reduced-motion: reduce` every duration token is 0ms (checked by the design-tokens test) and the loading shimmer stops.                                                                                                            | Passing                    |

## Known limitations

- No manual testing with a screen reader (NVDA, JAWS, VoiceOver, TalkBack) and no testing with disabled users. Automated checks find only part of what WCAG covers.
- The axe-core audit is not part of the gate.
- Text resizing to 200% is not tested.
- Uploaded manuscripts are the authors' own files; their accessibility is outside the app's control.

## Reporting a barrier

Open an issue with the bug report form: what you tried, what assistive technology you use (if any), and what happened. If you would rather not report in public, contact the maintainer through their GitHub profile. Barriers are treated as bugs.
