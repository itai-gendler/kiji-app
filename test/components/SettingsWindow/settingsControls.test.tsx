import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  Keycaps,
  SettingsRow,
  SettingsSlider,
  SettingsSwitch,
  shortcutKeyGroups,
} from "@/components/SettingsWindow/settingsControls";

describe("settingsControls", () => {
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute("data-os");
  });

  it("maps shortcut labels to macOS symbols", () => {
    expect(shortcutKeyGroups("Cmd + Shift + R", "macos")).toEqual([["⌘", "⇧", "R"]]);
    expect(shortcutKeyGroups("Ctrl + D / Ctrl + U", "macos")).toEqual([["⌃", "D"], ["⌃", "U"]]);
    expect(shortcutKeyGroups("gg", "macos")).toEqual([["gg"]]);
  });

  it("shows Ctrl instead of Cmd on Windows and Linux", () => {
    expect(shortcutKeyGroups("Cmd + N", "windows")).toEqual([["Ctrl", "N"]]);
    expect(shortcutKeyGroups("Cmd + Shift + R", "linux")).toEqual([["Ctrl", "Shift", "R"]]);
  });

  it("renders alternatives as separate keycap groups", () => {
    document.documentElement.setAttribute("data-os", "windows");
    const { container } = render(<Keycaps shortcut="Ctrl + D / Ctrl + U" />);
    expect(Array.from(container.querySelectorAll("kbd")).map((key) => key.textContent)).toEqual(["Ctrl", "D", "Ctrl", "U"]);
    expect(screen.getByText("or")).toBeInTheDocument();
  });

  it("renders the switch as an accessible switch that reports the new value", () => {
    const onChange = vi.fn();
    render(<SettingsSwitch label="Sync" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch", { name: "Sync" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("links a row label to its control and shows its status", () => {
    render(
      <SettingsRow
        label="Interval"
        htmlFor="interval"
        status="Saved."
        control={<select id="interval"><option>One</option></select>}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Interval" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Saved.");
  });

  it("fills the slider track up to the current value and commits on pointer up", () => {
    const onCommit = vi.fn();
    const onReset = vi.fn();
    render(
      <SettingsSlider
        label="Opacity"
        valueText="50%"
        min={0}
        max={200}
        step={1}
        value={50}
        onInput={vi.fn()}
        onCommit={onCommit}
        onReset={onReset}
      />,
    );
    const slider = screen.getByRole("slider", { name: "Opacity" });
    expect(slider.style.getPropertyValue("--settings-range-percent")).toBe("25%");
    fireEvent.pointerUp(slider);
    expect(onCommit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Reset opacity" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
