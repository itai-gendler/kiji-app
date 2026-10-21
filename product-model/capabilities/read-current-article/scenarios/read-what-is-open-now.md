---
kind: primary
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks for the article open in KiJi right now
  kind: actor
  actor: assistant
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: The User has an article open and shares the article they are reading
  kind: condition
  actor: assistant
  entities:
  - entity: assistant-settings
    effect: reads
    facts:
    - Current article
  - entity: article
    effect: reads
    facts: []
  - entity: user
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: The Product returns the article open in the most recently focused window, with the reader-mode text when
    reader mode is on, even when its station is not shared
  kind: product
  actor: assistant
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
    - Content
    - Link
    - Author
    - Published
  - entity: station
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
---

# Read what is open now

## Trigger

The User asks their assistant to explain what they are reading.

## Outcome

The assistant has the open article's text.

## Edge cases

- Highlights and notes on a saved copy are included only when both Saved articles and Notes and highlights are shared.
