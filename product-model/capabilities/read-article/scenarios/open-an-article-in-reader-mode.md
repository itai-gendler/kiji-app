---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User opens an article of a feed whose articles open in reader mode
  kind: actor
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: Reader mode is on for that feed
  kind: condition
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Reader mode
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product fetches the article's page and shows the text it extracts in place of the feed's text
  kind: product
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Link
    - Title
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product marks the article read
  kind: product
  actor: user
  entities:
  - entity: article
    effect: changes
    from: Unread
    to: Read
    facts:
    - Last read
  contexts:
    desktop:
      place: kiji-reader::article
references:
- kind: code
  role: implementation
  target: src/components/MainArea/ArticleView.tsx#ArticleView
- kind: code
  role: implementation
  target: src/services/articles/readerModeService.ts
---

# Open an article from a reader-mode feed

## Trigger

The User reads a feed that only carries summaries.

## Outcome

The full text from the site is shown without the User turning reader mode on again.
