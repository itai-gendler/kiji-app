---
kind: edge
routes:
  desktop: KiJi Reader app
steps:
- text: A scheduled pass reaches a feed
  kind: condition
  unattended: true
  entities:
  - entity: feed
    effect: reads
    facts:
    - Feed address
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: The site does not answer in time or sends no readable feed
  kind: condition
  entities:
  - entity: feed
    effect: reads
    facts:
    - Feed address
  contexts:
    desktop:
      place: kiji-reader::article-list
- text: 'The Product counts one more failed update and leaves the feed out of scheduled passes for a while: five
    minutes after the first failure, doubling each time, up to an hour'
  kind: product
  entities:
  - entity: feed
    effect: changes
    from: Updated
    to: Can't update
    facts:
    - Failed updates
  contexts:
    desktop:
      place: kiji-reader::article-list
---

# A feed fails to update

## Trigger

A site is down or its feed address stopped working.

## Outcome

Manage Feeds lists the feed under Can't Update with how many times it failed; the rest of the pass carries on.

## Edge cases

- For feeds that post five or more times a day the wait is at most 10 minutes, and for feeds that post daily at most 40 minutes.
- A pass cancelled part-way, by sleep or by opening a station, does not count as a failure.
