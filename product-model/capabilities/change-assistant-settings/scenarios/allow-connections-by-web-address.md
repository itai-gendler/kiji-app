---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User turns on Allow connections by web address and, if needed, changes the port
  kind: actor
  actor: user
  entities:
  - entity: assistant-settings
    effect: reads
    facts:
    - Web address connections
  contexts:
    desktop:
      place: kiji-reader::assistant
- text: The port is 1024 or higher
  kind: condition
  actor: user
  entities:
  - entity: assistant-settings
    effect: reads
    facts:
    - Web address connections
  contexts:
    desktop:
      place: kiji-reader::assistant
- text: The Product starts the web address on this computer and offers Copy Web Address Setup with the access key
  kind: product
  actor: user
  entities:
  - entity: assistant-settings
    effect: changes
    facts:
    - Web address connections
  contexts:
    desktop:
      place: kiji-reader::assistant
---

# Allow connections by web address

## Trigger

The User's assistant app only accepts a web address.

## Outcome

Apps on this computer that carry the key can connect.

## Edge cases

- A port below 1024 is refused with "Choose a port number of 1024 or higher."
