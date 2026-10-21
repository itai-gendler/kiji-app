---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User turns on Keep a copy in a folder and picks a folder
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
- text: The Product saves the folder and shows its path with a Change… button
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

# Keep a copy in a folder

## Trigger

The User wants their saved articles as Markdown files, for example in a notes app's folder.

## Outcome

Saved articles start appearing in the folder a few seconds later.

## Edge cases

- Cancelling the folder picker leaves the switch off.
