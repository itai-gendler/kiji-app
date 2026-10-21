---
kind: alternate
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks for saved articles, by saved date and an optional keyword
  kind: actor
  actor: assistant
  entities:
  - entity: saved-article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: Saved articles are shared
  kind: condition
  actor: assistant
  entities:
  - entity: assistant-settings
    effect: reads
    facts:
    - Saved articles
  - entity: saved-article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: The Product returns the saved articles newest first, whatever station they came from
  kind: product
  actor: assistant
  entities:
  - entity: saved-article
    effect: reads
    facts:
    - Title
    - Link
    - Source
    - Saved on
  - entity: station
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
---

# List saved articles for an assistant

## Trigger

The User asks their assistant about something they saved.

## Outcome

The assistant has the matching saved articles and can ask for one in full.
