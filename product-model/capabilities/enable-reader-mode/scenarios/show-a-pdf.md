---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Enable reader mode on an article whose link is a PDF
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
- text: The Product shows the PDF inside the article view
  kind: product
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
---

# Show a PDF in reader mode

## Trigger

The feed links to papers or reports.

## Outcome

The document can be read without leaving KiJi.
