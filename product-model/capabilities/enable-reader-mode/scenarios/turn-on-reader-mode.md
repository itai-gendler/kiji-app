---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Enable reader mode on an article from a feed
  kind: actor
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
    - Link
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product fetches the article's page and shows the article text it extracts, without the page's styling
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
- text: The Product remembers reader mode for the article's feed, so its other articles open in reader mode too
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

# Turn on reader mode

## Trigger

The feed carries only a summary, or the text reads badly.

## Outcome

The article shows its full text, and the feed's next articles open the same way.

## Edge cases

- A YouTube link is shown as an embedded video.
- The toggle is not offered for saved articles or links opened from the clipboard.
