---
kind: validation
routes:
  desktop: KiJi Reader app
steps:
- text: The User picks a .zip file that is not a KiJi export
  kind: actor
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::add-feeds
- text: The Product reports the import as failed in the sidebar
  kind: product
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# The export has no article list

## Trigger

The User picked a ZIP that is not a saved-articles export.

## Outcome

Nothing is imported.
