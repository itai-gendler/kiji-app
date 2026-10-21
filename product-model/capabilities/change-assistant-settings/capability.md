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
- kind: code
  role: implementation
  target: src-tauri/src/mcp/mod.rs
---

# Change Assistant settings

Choose whether assistants may read the library and make changes, what they can see, and whether apps may connect by web address.
