---
availability:
- place: kiji-reader
domain: stations
references:
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/StationsPane.tsx#DeleteStationDialog
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/manageFeedsModel.ts#planStationDeleteWithFeeds
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/useManageFeedsLibrary.ts#useManageFeedsLibrary
---

# Delete a station

Remove a station, keeping its feeds or deleting the ones that are in no other station.
