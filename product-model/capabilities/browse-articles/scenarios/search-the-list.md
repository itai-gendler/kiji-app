---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User opens the search field and types some words
  kind: actor
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product narrows the current list to the articles whose title, summary or author has a word starting
    with each typed word, and marks the matches
  kind: product
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
    - Summary
    - Author
  contexts:
    desktop:
      place: kiji-reader::article-list
references:
- kind: code
  role: implementation
  target: src-tauri/src/db/search.rs#create_fts_prefix_query
---

# Search the list

## Trigger

The User looks for something within the selected feed, station or view.

## Outcome

Only matching articles of the current source are listed.

## Edge cases

- The article text itself is not searched.
- Search is unavailable until at least one feed is added.
