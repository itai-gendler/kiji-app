---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User saves the article an article window opened from the clipboard
  kind: actor
  actor: user
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product keeps a copy in Saved with the extracted text, the site as its source
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
---

# Save a link opened from the clipboard

## Trigger

The User reads a page that no feed delivers.

## Outcome

The page is in Saved; no feed article changes.
