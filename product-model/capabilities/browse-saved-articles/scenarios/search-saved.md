---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User types words in the search field while Saved is open
  kind: actor
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product lists the saved articles whose title, summary or author has a word starting with each typed
    word
  kind: product
  actor: user
  entities:
  - entity: saved-article
    effect: reads
    facts:
    - Title
    - Author
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Search Saved

## Trigger

The User looks for one article in Saved.

## Outcome

Only the matching saved articles are listed.
