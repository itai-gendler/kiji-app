---
availability:
- place: kiji-reader
domain: import-and-export
references:
- kind: code
  role: implementation
  target: src/services/feeds/opmlExportService.ts
- kind: code
  role: implementation
  target: src/hooks/useApplicationMenuCommands.ts#useApplicationMenuCommands
- kind: code
  role: implementation
  target: src/components/ManageFeedsWindow/ImportExportPane.tsx#ImportExportPane
---

# Export feeds

Save every feed and station to an OPML file another reader can import.
