---
kind: alternate
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks to save an article, or the one open in KiJi
  kind: actor
  actor: assistant
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: Changes are allowed and saved articles are shared
  kind: condition
  actor: assistant
  entities:
  - entity: assistant-settings
    effect: reads
    facts:
    - Allow changes
    - Saved articles
  - entity: saved-article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: The Product keeps a copy in Saved with the text KiJi stores for the article, its lead image first
  kind: product
  actor: assistant
  entities:
  - entity: saved-article
    effect: creates
    facts:
    - Title
    - Link
    - Author
    - Published
    - Saved on
    - Content
    - Source
  - entity: article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: The Product marks the article as saved, and the open windows show it in Saved right away
  kind: product
  actor: assistant
  entities:
  - entity: article
    effect: changes
    facts:
    - Saved
  contexts:
    assistant:
      place: assistant-connection
---

# Save an article for the user

## Trigger

The User asks their assistant to save an article.

## Outcome

The article is in Saved as if the user had saved it.

## Edge cases

- An article already in Saved is not saved twice; the Assistant is told it already is.
