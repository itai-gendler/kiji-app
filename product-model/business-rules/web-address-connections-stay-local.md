---
appliesTo:
- type: capability
  id: change-assistant-settings
- type: capability
  id: reset-assistant-access
- type: entity
  id: assistant-settings
  facts:
  - Web address connections
  - Access key
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/http.rs
- kind: code
  role: implementation
  target: src-tauri/src/mcp/settings.rs#AssistantSettings
---

# Web-address connections are for apps on this computer that hold the key

Connections by web address are accepted only from this computer and only with the current access key; Reset Access replaces the key, so setups copied before stop working. The port is 1024 or higher.
