---
availability:
- place: kiji-reader
domain: stations
references:
- kind: code
  role: implementation
  target: src/services/feeds/libraryOrderPersist.ts#persistNestedMembershipOrder
- kind: code
  role: implementation
  target: src/services/feeds/libraryOrderPersist.ts#persistUnstationedOrder
---

# Reorder feeds

Change the order of feeds within a station or among the feeds in no station.
