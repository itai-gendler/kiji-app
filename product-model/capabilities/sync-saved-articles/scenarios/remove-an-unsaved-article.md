---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: An article is unsaved while a folder is chosen
  kind: condition
  unattended: true
  entities:
  - entity: settings
    effect: reads
    facts:
    - Saved articles folder
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product deletes the Markdown file named after its title and takes it out of the index
  kind: product
  entities: []
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Remove an unsaved article's file

## Trigger

The User unsaves an article.

## Outcome

The folder no longer holds that article.
