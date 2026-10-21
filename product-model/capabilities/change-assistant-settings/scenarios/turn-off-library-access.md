---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User turns off Let assistants read your KiJi library
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
- text: The Product stops accepting assistant connections
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

# Turn off library access

## Trigger

The User is done with assistants for now.

## Outcome

Assistants that try to read are told KiJi is not open or access is off.
