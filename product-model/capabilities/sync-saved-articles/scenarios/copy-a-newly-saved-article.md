---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User or an assistant saves an article while a folder is chosen
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
  - entity: assistant
    effect: reads
    facts: []
  - entity: user
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: Half a second later, the Product writes articles/Title.md with the title, a Source line with the link, and
    the text as Markdown, unless a file of that name is already there
  kind: product
  entities:
  - entity: saved-article
    effect: reads
    facts:
    - Title
    - Link
    - Content
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product adds the article to the articles.md index in the folder
  kind: product
  entities:
  - entity: saved-article
    effect: reads
    facts:
    - Title
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# Copy a newly saved article

## Trigger

The User saves an article with Keep a copy in a folder turned on.

## Outcome

The folder holds the article as a Markdown file, listed in the index.

## Edge cases

- A second article with the same title gets a numbered name, such as Title-2.md.
