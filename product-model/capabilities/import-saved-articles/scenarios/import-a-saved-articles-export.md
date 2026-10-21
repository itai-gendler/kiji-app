---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User picks a .zip file under From a file in Add Feeds
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product closes the dialog and reads the export's list of articles with each article's Markdown text
  kind: product
  actor: user
  entities:
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product adds each article not already saved, with its title, link, text and the date it was added
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
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product says in the sidebar how many were imported and how many were already saved
  kind: product
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Import a saved-articles export

## Trigger

The User brings their saved articles from another computer or another reader.

## Outcome

The articles are in Saved, newest added first, with no duplicates.
