---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User selects feeds in the Feeds tab and chooses Add to Station
  kind: actor
  actor: user
  entities:
  - entity: feed
    effect: reads
    facts:
    - Name
  - entity: station
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::feeds
- text: The User picks a station
  kind: actor
  actor: user
  entities:
  - entity: station
    effect: reads
    facts:
    - Name
  contexts:
    desktop:
      place: kiji-reader::feeds
- text: The Product adds the feeds that are not in it yet to the station
  kind: product
  actor: user
  entities:
  - entity: station
    effect: changes
    facts:
    - Feeds
  - entity: feed
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::feeds
---

# Add selected feeds to a station

## Trigger

The User sorts new feeds into a topic.

## Outcome

The station lists the feeds in the sidebar and in Manage Feeds.

## Edge cases

- Add to Station is unavailable while there are no stations.
