#!/bin/sh
# Starts KiJi's assistant bridge (MCP over stdio). Needs the KiJi app.
for app in '__KIJI_LAUNCHER__' \
  "/Applications/KiJi.app/Contents/MacOS/kiji-app" \
  "$HOME/Applications/KiJi.app/Contents/MacOS/kiji-app"; do
  if [ -x "$app" ]; then
    exec "$app" --mcp "$@"
  fi
done
found=$(mdfind "kMDItemCFBundleIdentifier == 'com.yomilab.kiji'" 2>/dev/null | head -n 1)
if [ -n "$found" ] && [ -x "$found/Contents/MacOS/kiji-app" ]; then
  exec "$found/Contents/MacOS/kiji-app" --mcp "$@"
fi
echo "KiJi isn't installed. Get it from https://kiji.yomilab.app" >&2
exit 1
