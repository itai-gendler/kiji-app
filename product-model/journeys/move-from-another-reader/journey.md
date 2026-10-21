---
actors:
- user
references:
- kind: code
  role: implementation
  target: src/services/feeds/opmlUiWorkflow.ts#navigateAfterOpmlImport
---

# Move from another reader

## Goal

The User brings their subscriptions over from another reader and starts reading.

## Success criterion

The imported feeds are followed in their stations and an article of the first imported station is open.
