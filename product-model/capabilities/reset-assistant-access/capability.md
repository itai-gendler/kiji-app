---
availability:
- place: kiji-reader
domain: assistant
references:
- kind: code
  role: implementation
  target: src/components/SettingsWindow/AssistantSettings.tsx#AssistantSettings
- kind: code
  role: implementation
  target: src-tauri/src/mcp/settings.rs#AssistantSettings
---

# Reset assistant access

Disconnect every assistant and stop older web-address setups from working.
