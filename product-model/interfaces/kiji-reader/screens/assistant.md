---
entities:
- entity: assistant-settings
  shows: &id001
  - Library access
  - Allow changes
  - Current article
  - Shared stations
  - Feeds without a station
  - Saved articles
  - Notes and highlights
  - Web address connections
  collects: *id001
- entity: station
  shows:
  - Name
references:
- kind: code
  role: implementation
  target: src/components/SettingsWindow/AssistantSettings.tsx#AssistantSettings
- kind: code
  role: implementation
  target: src/components/SettingsWindow/AssistantConnectList.tsx#AssistantConnectList
---

# Settings: Assistant

Settings → Assistant: whether assistants may read the library and make changes, what they can see, how to connect an assistant app, which assistants are connected, and connections by web address.
