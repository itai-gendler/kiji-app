---
singleton: true
domain: assistant
references:
- kind: code
  role: implementation
  target: src-tauri/src/mcp/settings.rs#AssistantSettings
- kind: code
  role: implementation
  target: src/components/SettingsWindow/AssistantSettings.tsx#AssistantSettings
---

# Assistant settings

What assistants may reach in KiJi, kept once on this computer apart from the other settings.

## Information kept

- **Library access** — "Let assistants read your KiJi library": off until the user turns it on.
- **Allow changes** — "Allow assistants to make changes": off until the user turns it on.
- **Current article** — Whether assistants see the article open in KiJi, even when its station isn't shared; on by default.
- **Shared stations** — All stations, or only the stations the user chooses.
- **Feeds without a station** — Whether feeds in no station are shared; on by default.
- **Saved articles** — Whether everything in Saved is shared; on by default.
- **Notes and highlights** — Whether highlights and notes kept on saved articles are shared; off by default.
- **Web address connections** — Whether apps that only take a web address may connect, and the port they use (47615 unless changed).
- **Access key** — The private key a web-address setup carries.
