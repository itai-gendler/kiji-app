---
kind: alternate
routes:
  desktop: KiJi Reader app
steps:
- text: The User picks Ripple, Ripple Dark, Light or Dark, or a custom image
  kind: actor
  actor: user
  entities:
  - entity: settings
    effect: reads
    facts:
    - App icon
  contexts:
    desktop:
      place: kiji-reader::appearance-settings
- text: The Product sets the app icon; picking a variant clears a custom image
  kind: product
  actor: user
  entities:
  - entity: settings
    effect: changes
    facts:
    - App icon
  contexts:
    desktop:
      place: kiji-reader::appearance-settings
---

# Choose an app icon

## Trigger

The User wants a different icon in the Dock.

## Outcome

The new icon shows; a custom image asks for a relaunch to refresh the Dock.
