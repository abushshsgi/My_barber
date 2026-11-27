# MySaloon V3 design system

The existing tokens stay the source of truth. This pass did not add a second brand color.

## Color

Use these names in feature UI. Do not hardcode hex values in guides or explore components.

| Role | Token |
| --- | --- |
| Page background | `bg-background` |
| Surface | `bg-surface` (`--surface`) |
| Elevated surface | `bg-surface-2` (`--surface-2`) |
| Primary text | `text-foreground` |
| Secondary / muted text | `text-muted-foreground` |
| Border | `border-border` |
| Accent / primary button | `bg-foreground` with `text-background` |
| Focus | `focus-visible:ring-foreground/30` |
| Success, warning, error | Existing semantic utilities already mapped in `styles.css`. Guides do not invent new ones. |

## Type

| Role | Use |
| --- | --- |
| Page heading | `text-3xl` on small screens, `sm:text-4xl`, `lg:text-5xl` only when the line still fits |
| Section heading | `text-2xl` display |
| Card title | `text-xl` |
| Body | `text-base` / `text-[17px]`, line height about 1.7 |
| Caption / label | `text-xs` or `text-sm`, muted, uppercase tracking only for category labels |

Article H1 must not jump to `text-5xl` at the `md` breakpoint. That breakpoint is 768px and was breaking short titles into three lines.

## Space

Follow Tailwind's 4px scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Page gutter comes from `DESKTOP_SHELL_INSET` (`px-4 sm:px-6 md:px-8 lg:px-10`). Guide pages should not add a second horizontal pad.

## Width

| Viewport | Behavior |
| --- | --- |
| Under 768 | Full shell width, 16–24px gutter, one column |
| 768–1023, including 860 | Full shell width. Article measure caps at `46rem` (about 736px before root font scale). |
| 1024+ | Shell caps at 1680px. Article text stays near 736px. Table of contents sits beside it. |

`isWidePublicPath` turns off `max-w-md` for `/guides`, `/guides/{slug}`, `/explore`, and `/explore/{id}` in Uzbek, Russian, and English prefixes. Try-on (`/explore/{id}/try`) stays on the existing full-bleed Morf layout.

## Components reused

- `PageHeader` for back navigation and the single page H1 on guides.
- Existing explore grid, persona pickers, and Morf card.
- Existing article markdown renderer. It allows only text, strong, and http(s) or root-relative links. It does not inject HTML.

Search and category chips on guides are plain controls using the same foreground, border, and radius as the rest of the app. Filter state stays in the page. It is not written into the URL, so search does not create extra indexable pages.
