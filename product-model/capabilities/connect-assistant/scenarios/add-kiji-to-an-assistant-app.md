---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses the button for their app under Connect an Assistant
  kind: actor
  actor: user
  entities:
  - entity: assistant-settings
    effect: reads
    facts:
    - Library access
  - entity: assistant
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::assistant
- text: The Product opens the app's own install link for KiJi, or saves an extension file for the User to double-click
  kind: product
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::assistant
---

# Add KiJi to an assistant app

## Trigger

The User sets up an assistant app for the first time.

## Outcome

The assistant app lists KiJi and can connect while KiJi is open.
