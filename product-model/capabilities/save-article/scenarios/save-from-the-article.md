---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Save article while reading
  kind: actor
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
    - Saved
  contexts:
    desktop:
      place: kiji-reader::article
- text: 'The Product keeps a copy in Saved with the text on screen: the reader-mode text when reader mode is on,
    otherwise the feed''s text'
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
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product marks the article as saved in the list
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

# Save the open article

## Trigger

The User wants to keep an article.

## Outcome

The article is in Saved, with its own copy of the text.

## Edge cases

- With reader mode on but the reader text not loaded yet, KiJi fetches it before saving.
