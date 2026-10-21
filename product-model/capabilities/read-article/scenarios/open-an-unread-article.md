---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User opens an unread article from the list
  kind: actor
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The Product shows the article with its title, feed, author, publication date and reading time
  kind: product
  actor: user
  entities:
  - entity: article
    effect: reads
    facts:
    - Title
    - Author
    - Published
    - Content
  - entity: feed
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::article
- text: The Product marks the article read and records when it was opened
  kind: product
  actor: user
  entities:
  - entity: article
    effect: changes
    from: Unread
    to: Read
    facts:
    - Last read
  contexts:
    desktop:
      place: kiji-reader::article
---

# Open an unread article

## Trigger

The User picks an article to read.

## Outcome

The article is open and counts as read in its feeds and stations.

## Edge cases

- A thin bar shows how far the User has read.
- Escape or the left arrow closes the article.
