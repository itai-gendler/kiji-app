---
kind: alternate
routes:
  assistant: Assistant connection
steps:
- text: The Assistant asks for the full text of one article, or of up to 20 at once
  kind: actor
  actor: assistant
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    assistant:
      place: assistant-connection
- text: The Product returns each shared article as Markdown or plain text, with its title, feed, author, date and
    link, and leaves it unread or read as it was
  kind: product
  actor: assistant
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
    - Content
    - Author
    - Published
    - Link
  - entity: feed
    effect: reads
    facts:
    - Name
  contexts:
    assistant:
      place: assistant-connection
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/protocol.rs
- kind: code
  role: implementation
  target: src-tauri/src/mcp/format.rs
---

# Read articles for an assistant

## Trigger

The User asks their assistant to explain or summarise articles.

## Outcome

The assistant has the text; nothing in KiJi changes.

## Edge cases

- Long text is cut at 20,000 characters for one article and 8,000 each for several, unless the Assistant asks for another length.
