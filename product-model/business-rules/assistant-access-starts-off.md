---
appliesTo:
- type: capability
  id: change-assistant-settings
- type: entity
  id: assistant-settings
  facts:
  - Library access
  - Allow changes
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/settings.rs#AssistantSettings
- kind: code
  role: implementation
  target: src/components/SettingsWindow/AssistantSettings.tsx#AssistantSettings
---

# Assistant access starts off and read-only

Library access and Allow changes are off until the user turns them on, and Allow changes can be turned on only while library access is on. Assistants connect only while KiJi is open.
