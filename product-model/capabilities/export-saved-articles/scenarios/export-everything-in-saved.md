---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Export Saved Articles in the File menu and picks where to save
  kind: actor
  actor: user
  entities:
  - entity: saved-article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader
- text: The Product writes a ZIP with a Markdown file per saved article, an articles.md index, and a list of each
    article's title, link, date added and its feed's stations
  kind: product
  actor: user
  entities:
  - entity: saved-article
    effect: reads
    facts:
    - Title
    - Link
    - Content
    - Saved on
    - Source
  - entity: article
    effect: reads
    facts: []
  - entity: feed
    effect: reads
    facts: []
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader
- text: The Product shows the progress in the sidebar and says how many articles it exported
  kind: product
  actor: user
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Export everything in Saved

## Trigger

The User backs up what they saved.

## Outcome

The ZIP can be imported again as saved articles, by KiJi or another reader.

## Edge cases

- With nothing in Saved, the export finishes at once and reports none.
