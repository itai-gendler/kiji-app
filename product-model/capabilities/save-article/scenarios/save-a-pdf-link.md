---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User saves an article whose link is a PDF or a page KiJi cannot show as text
  kind: actor
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
    - Link
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product keeps a copy in Saved that holds only the link
  kind: product
  actor: user
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
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product marks the article as saved
  kind: product
  actor: user
  entities:
  - entity: article
    effect: changes
    facts:
    - Saved
  contexts:
    desktop:
      place: kiji-reader::article
---

# Save a PDF or an unsupported page

## Trigger

The User saves a document rather than a web page.

## Outcome

Saved has an entry that opens the link.
