---
appliesTo:
- type: capability
  id: reset-settings
- type: entity
  id: assistant-settings
references:
- kind: code
  role: implementation
  target: src/services/settings/settingsManager.ts
- kind: code
  role: implementation
  target: src/hooks/useAppEffects.ts
---

# Resetting settings keeps the library

Reset All Settings returns every setting to its default but keeps feeds, stations, articles, saved articles and the assistant settings.
