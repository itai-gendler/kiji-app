---
kind: primary
routes:
  desktop: KiJi Reader app
steps:
- text: The User chooses Reset Access under Connected Assistants
  kind: actor
  actor: user
  entities:
  - entity: assistant
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::assistant
- text: The Product disconnects every connected assistant and replaces the access key
  kind: product
  actor: user
  entities:
  - entity: assistant-settings
    effect: changes
    facts:
    - Access key
  - entity: assistant
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::assistant
---

# Reset access

## Trigger

The User no longer trusts a setup they copied somewhere.

## Outcome

No assistant is connected; web-address setups copied before stop working until copied again.
