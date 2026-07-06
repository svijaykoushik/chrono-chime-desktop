# ChronoChime — Branding & Theme

ChronoChime's visual identity is **"Aesthetic Bubblegum Pink"**, derived from
the app icon (`assets/icons/chrono-chime-icon-*.png`): a bubblegum-pink disc
with sound waves and a white bell, edged by a deeper rose shadow.

**This is the canonical theme. All future UI work must follow it.**

## Brand palette

| Token | Hex | Role |
| --- | --- | --- |
| Rose | `#EE5A8A` | Primary action color (light mode). Buttons, FAB, active tabs, links. Pairs with white text. |
| Bubblegum | `#F589B2` | The signature hue (icon disc fill). Primary in dark mode; secondary in light mode. |
| Blush | `#FFF0F6` | Soft light tint for app background / hover surfaces. |
| Rose Deep | `#C73E6E` | Pressed / deep accent. |
| Bubblegum Light | `#FBB6D0` | Light bubblegum for contrast on dark surfaces. |
| White | `#FFFFFF` | Bell, waves, paper surfaces, on-rose text. |

These are sampled directly from the icon (the disc is `#F589B2`, the
shadow/outline `#EE5A8A`).

## Where it lives

The single source of truth is `src/renderer/theme.ts`:

- `BRAND` — the named color constants above. Reference these instead of
  hardcoding hex values anywhere in the renderer.
- `makeTheme(mode)` — builds the MUI (Material 3) theme for `light` / `dark`.

## Mode mapping

| Role | Light mode | Dark mode |
| --- | --- | --- |
| `primary.main` | Rose `#EE5A8A` | Bubblegum `#F589B2` |
| `secondary.main` | Bubblegum `#F589B2` | Bubblegum Light `#FBB6D0` |
| `background.default` | Blush `#FFF0F6` | `#17121A` (plum-tinted dark) |
| `background.paper` | White | `#221820` |

Dark mode uses the lighter bubblegum as primary so it stays legible on dark
surfaces; light mode uses the deeper rose so primary buttons have enough
contrast with white text.

## Guidelines for future work

- Build new components from `theme.palette` (`primary`/`secondary`) and the
  `BRAND` constants — never introduce off-brand hues or raw hex.
- Keep surfaces calm and rounded (`shape.borderRadius: 16`), consistent with the
  product's "calm, trustworthy, lightweight" UX principles.
- Honor the user's theme setting (Light / Dark / Match system); the theme is
  produced by `makeTheme` in `App` and reacts to `Settings.theme`.
- If the icon is ever re-styled, re-sample its colors and update `BRAND` (and
  this doc) so the app and identity stay in sync.
