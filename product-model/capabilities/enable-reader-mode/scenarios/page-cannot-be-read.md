---
kind: edge
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Enable reader mode
  kind: actor
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Link
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product remembers reader mode for the article's feed
  kind: product
  actor: user
  entities:
  - entity: feed
    effect: changes
    facts:
    - Reader mode
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article
- text: The page cannot be fetched, is not a page KiJi can read, or yields no article text
  kind: condition
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Link
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product shows an error, with the site's status code when there is one
  kind: product
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::article
---

# Reader text cannot be extracted

## Trigger

The site refuses the request or the page is not an article.

## Outcome

An error is shown in place of the text; turning reader mode off shows the feed's text again.
