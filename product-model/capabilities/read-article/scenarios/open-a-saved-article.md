---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User opens an article from Saved
  kind: actor
  actor: user
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
- text: The Product shows the saved copy's own text, as it was saved
  kind: product
  actor: user
  entities:
  - entity: saved-article
    effect: reads
    facts:
    - Title
    - Author
    - Published
    - Content
    - Source
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product records when the copy was opened, on the original article too when KiJi still has it, without
    marking anything read
  kind: product
  actor: user
  entities:
  - entity: saved-article
    effect: changes
    facts:
    - Last read
  - entity: article
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article
---

# Open a saved article

## Trigger

The User returns to an article they kept.

## Outcome

The saved text is shown, even when its feed has since been deleted.
