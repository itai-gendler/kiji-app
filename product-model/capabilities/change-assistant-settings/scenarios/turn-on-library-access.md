---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User turns on Let assistants read your KiJi library
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
- text: The Product starts accepting assistant connections and says it is ready while KiJi is open
  kind: product
  actor: user
  entities:
  - entity: assistant-settings
    effect: changes
    facts:
    - Library access
  - entity: assistant
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::assistant
---

# Turn on library access

## Trigger

The User wants to ask an AI app about their feeds.

## Outcome

Assistants on this computer can connect and read what is shared, without changing anything.
