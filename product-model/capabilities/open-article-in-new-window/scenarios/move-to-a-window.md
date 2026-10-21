---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User presses N while reading
  kind: actor
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product opens the article in a new window and closes it in the main window
  kind: product
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
    - Content
  contexts:
    desktop:
      place: kiji-reader::article
---

# Move the article to its own window

## Trigger

The User wants to keep the article beside the list.

## Outcome

The article is open in its own window, where it can be read, saved and shared.
