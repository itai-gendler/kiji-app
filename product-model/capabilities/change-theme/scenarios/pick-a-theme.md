---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User picks Automatic, Light or Dark under View → Theme, or with the theme button at the bottom of the
    sidebar
  kind: actor
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product applies it to every window, Automatic following the system
  kind: product
  actor: user
  entities:
  - entity: settings
    effect: changes
    facts:
    - Theme
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Pick a theme

## Trigger

The User wants dark reading at night.

## Outcome

Every window uses the chosen theme, with the light or dark version of the reader theme.
