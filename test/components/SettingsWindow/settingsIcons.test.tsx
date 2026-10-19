import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { cleanup, render } from "@testing-library/react";
import * as Glyphs from "@/components/SettingsWindow/settingsIcons";
import { ASSISTANT_CLIENT_ROWS } from "@/components/SettingsWindow/AssistantConnectList";

const glyphEntries = Object.entries(Glyphs).filter(([name]) => name.endsWith("Glyph")) as Array<[string, React.FC]>;

describe("settingsIcons", () => {
  afterEach(cleanup);

  it.each(glyphEntries)("%s is a hidden 1em line glyph in currentColor", (_name, Glyph) => {
    const { container } = render(<Glyph />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg).toHaveClass("settings-glyph");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", "1em");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("stroke-linecap", "round");
    expect(svg.querySelectorAll("path, circle, rect").length).toBeGreaterThan(0);
  });

  it("gives every assistant app row its own glyph", () => {
    const names = ASSISTANT_CLIENT_ROWS.map((row) => {
      const { container } = render(<row.Icon />);
      const name = container.querySelector("svg")?.getAttribute("data-glyph");
      cleanup();
      return name;
    });
    expect(new Set(names).size).toBe(ASSISTANT_CLIENT_ROWS.length);
    expect(names.every(Boolean)).toBe(true);
  });
});
