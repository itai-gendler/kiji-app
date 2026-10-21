---
appliesTo:
- type: capability
  id: add-feed
- type: capability
  id: edit-feed
- type: capability
  id: import-feeds
- type: entity
  id: feed
  facts:
  - Feed address
references:
- kind: code
  role: implementation
  target: src-tauri/src/db/schema.rs
- kind: code
  role: implementation
  target: src/services/feeds/applyOpmlImportEntries.ts#applyOpmlImportEntries
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/useManageFeedsLibrary.ts#useManageFeedsLibrary
---

# A feed address is followed once

Adding a link already followed offers to show that feed instead; an edit to the address of another followed feed is refused; an imported list adds only addresses not followed yet, comparing them without a trailing slash or the part after #.
