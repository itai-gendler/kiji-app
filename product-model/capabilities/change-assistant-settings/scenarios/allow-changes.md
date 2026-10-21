---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User turns on Allow assistants to make changes while library access is on
  kind: actor
  actor: user
  entities:
  - entity: assistant-settings
    effect: reads
    facts:
    - Library access
    - Allow changes
  - entity: assistant
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::assistant
- text: The Product offers connected assistants the tools to mark read or unread, star and save
  kind: product
  actor: user
  entities:
  - entity: assistant-settings
    effect: changes
    facts:
    - Allow changes
  - entity: assistant
    effect: reads
    facts: []
  contexts:
    desktop:
      place: kiji-reader::assistant
---

# Allow assistants to make changes

## Trigger

The User wants to say "mark these as read" to their assistant.

## Outcome

Assistants can change read, starred and saved status of articles they can see, and nothing else.
