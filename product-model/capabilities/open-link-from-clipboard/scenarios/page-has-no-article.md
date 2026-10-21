---
kind: edge
routes:
  desktop: KiJi Reader app
steps:
- text: The User presses P in an article window
  kind: actor
  actor: user
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article
- text: Neither cleanup engine can extract the page's text
  kind: condition
  actor: user
  entities:
  - entity: settings
    effect: reads
    facts:
    - Article cleanup
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product says the article content could not be extracted
  kind: product
  actor: user
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article
---

# The page has no article text

## Trigger

The link points at a page that is not an article.

## Outcome

An error is shown in the window.
