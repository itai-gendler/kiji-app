---
appliesTo:
- type: capability
  id: create-station
- type: capability
  id: rename-station
- type: entity
  id: station
  facts:
  - Name
references:
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/manageFeedsModel.ts#validateStationName
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/manageFeedsModel.ts#nextStationName
---

# Station names are unique and never empty

No two stations share a name, ignoring case. A new station takes the first free name of New Station, New Station 2, New Station 3 and so on.
