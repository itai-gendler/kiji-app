---
appliesTo:
- type: capability
  id: add-feed-to-station
- type: capability
  id: delete-station
- type: capability
  id: export-feeds
references:
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/manageFeedsModel.ts#planStationDeleteWithFeeds
---

# A feed can be in several stations

A feed may be grouped in any number of stations or in none. Deleting a station with its feeds deletes only the feeds that are in no other station; exporting lists a feed under every station it is in.
