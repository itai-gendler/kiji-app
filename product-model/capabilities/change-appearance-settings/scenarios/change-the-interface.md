---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User picks Modern or Classic, moves Surface opacity, or picks an interface font
  kind: actor
  actor: user
  entities:
  - entity: settings
    effect: reads
    facts:
    - Interface style
    - Surface opacity
    - Interface font
  contexts:
    desktop:
      place: kiji-reader::appearance-settings
- text: The Product applies it at once
  kind: product
  actor: user
  entities:
  - entity: settings
    effect: changes
    facts:
    - Interface style
    - Surface opacity
    - Interface font
  contexts:
    desktop:
      place: kiji-reader::appearance-settings
---

# Change the interface style or font

## Trigger

The User adjusts how the app looks.

## Outcome

The sidebar and dialogs follow the new style.
