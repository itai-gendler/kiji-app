---
availability:
- place: kiji-reader
domain: import-and-export
references:
- kind: code
  role: implementation
  target: src/services/feeds/opmlImportService.ts#parseOpmlEntries
- kind: code
  role: implementation
  target: src/services/feeds/opmlStationResolution.ts#resolveOutlineStationName
- kind: code
  role: implementation
  target: src/services/feeds/applyOpmlImportEntries.ts#applyOpmlImportEntries
- kind: code
  role: implementation
  target: src/services/feeds/opmlUiWorkflow.ts#navigateAfterOpmlImport
---

# Import feeds

Bring in subscriptions from a feed list (OPML) exported by another reader; its folders become stations.
