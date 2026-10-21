---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User picks a .csv file of links under From a file in Add Feeds
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product fetches each link, twenty at a time in the background, and extracts its title, text, author,
    site and date with the chosen cleanup engine
  kind: product
  actor: user
  entities:
  - entity: settings
    effect: reads
    facts:
    - Article cleanup
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product adds each page not already saved
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
      place: kiji-reader::article-list
- text: The Product says in the sidebar how many were imported and how many were already saved
  kind: product
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Import a list of links

## Trigger

The User has a reading list as a spreadsheet of links.

## Outcome

Each readable link is in Saved with its text.

## Edge cases

- Links that cannot be fetched or read are left out.
