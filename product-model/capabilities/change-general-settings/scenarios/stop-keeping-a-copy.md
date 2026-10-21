---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User turns off Keep a copy in a folder
  kind: actor
  actor: user
  entities:
  - entity: settings
    effect: reads
    facts:
    - Saved articles folder
  contexts:
    desktop:
      place: kiji-reader::general-settings
- text: The Product forgets the folder and stops writing to it, leaving the files already there
  kind: product
  actor: user
  entities:
  - entity: settings
    effect: changes
    facts:
    - Saved articles folder
  contexts:
    desktop:
      place: kiji-reader::general-settings
---

# Stop keeping a copy

## Trigger

The User no longer wants the folder copy.

## Outcome

The folder keeps its files; nothing new is written.
