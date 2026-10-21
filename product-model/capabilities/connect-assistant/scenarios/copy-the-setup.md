---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Copy Command or Copy Setup for their app
  kind: actor
  actor: user
  entities: []
  contexts:
    desktop:
      place: kiji-reader::assistant
- text: The Product copies the command or settings text that points the app at this copy of KiJi, wherever it is
    installed
  kind: product
  actor: user
  entities:
  - entity: settings
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::assistant
---

# Copy the setup

## Trigger

The User's app is configured by a command or a settings file.

## Outcome

The User pastes the setup into the app; the button shows Copied for a moment.
