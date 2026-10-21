---
kind: primary
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
- text: The Product finds a link in the clipboard text, fetches the page and extracts its title, site, author, date
    and text with the chosen cleanup engine
  kind: product
  actor: user
  entities:
  - entity: settings
    effect: reads
    facts:
    - Article cleanup
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product shows the page as an article, without adding it to any feed
  kind: product
  actor: user
  entities:
  - entity: article
    effect: reads
    facts: []
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article
---

# Open the copied link

## Trigger

The User copied a link to something no feed delivers.

## Outcome

The page is open as an article; it stays only if the User saves it.

## Edge cases

- A link to a PDF opens it in the article view.
