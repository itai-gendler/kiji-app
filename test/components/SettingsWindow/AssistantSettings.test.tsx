import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AssistantStatus } from "@/lib/tauriClient/assistant";

const baseStatus = (): AssistantStatus => ({
  settings: {
    enabled: false,
    shareCurrentArticle: true,
    sharedStations: null,
    includeUnstationedFeeds: true,
    shareSavedArticles: true,
    shareNotesAndHighlights: false,
    allowChanges: false,
    httpEnabled: false,
    httpPort: 47615,
  },
  local: { state: "off" },
  http: { state: "off" },
  clients: [],
});

const { assistant, clipboardWrite, saveFile, confirmDialog } = vi.hoisted(() => ({
  assistant: {
    getStatus: vi.fn(),
    updateSettings: vi.fn(),
    resetAccess: vi.fn(),
    getClientSetup: vi.fn(),
    openClientLink: vi.fn(),
    writeExtension: vi.fn(),
  },
  clipboardWrite: vi.fn(),
  saveFile: vi.fn(),
  confirmDialog: vi.fn(),
}));

vi.mock("@/lib/tauriClient", () => ({
  tauriClient: {
    assistant,
    feeds: {
      tags: {
        list: vi.fn().mockResolvedValue([
          { name: "Tech", emoji: "💻", color: null, createdAt: "", sortOrder: 0 },
          { name: "Health", emoji: null, color: null, createdAt: "", sortOrder: 1 },
        ]),
      },
    },
    system: { clipboard: { writeText: (request: { text: string }) => clipboardWrite(request) } },
    shell: {
      dialog: { saveFile: (request: unknown) => saveFile(request) },
      confirmDialog: (request: unknown) => confirmDialog(request),
    },
  },
}));

vi.mock("@/services/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { AssistantSettings } from "@/components/SettingsWindow/AssistantSettings";

describe("AssistantSettings", () => {
  beforeEach(() => {
    assistant.getStatus.mockResolvedValue(baseStatus());
    assistant.updateSettings.mockImplementation(async (patch) => {
      const status = baseStatus();
      status.settings = { ...status.settings, ...patch };
      if (status.settings.enabled) status.local = { state: "ready" };
      return status;
    });
    assistant.getClientSetup.mockResolvedValue({
      client: "claude-code",
      text: "claude mcp add --scope user kiji -- '/Applications/KiJi.app/Contents/MacOS/kiji-app' --mcp",
      hint: "Run this once in Terminal.",
      hasInstallLink: false,
    });
    clipboardWrite.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("starts with access off and turns it on", async () => {
    render(<AssistantSettings />);
    const toggle = await screen.findByLabelText("Let assistants read your KiJi library");
    expect((toggle as HTMLInputElement).checked).toBe(false);
    fireEvent.click(toggle);
    await waitFor(() => expect(assistant.updateSettings).toHaveBeenCalledWith({ enabled: true }));
    expect(await screen.findByText("Ready. Assistants can connect while KiJi is open.")).toBeTruthy();
  });

  it("keeps changes off by default and only allows them once access is on", async () => {
    render(<AssistantSettings />);
    const changes = (await screen.findByLabelText("Allow assistants to make changes")) as HTMLInputElement;
    expect(changes.checked).toBe(false);
    expect(changes.disabled).toBe(true);

    fireEvent.click(screen.getByLabelText("Let assistants read your KiJi library"));
    await waitFor(() => expect((screen.getByLabelText("Allow assistants to make changes") as HTMLInputElement).disabled).toBe(false));
    assistant.updateSettings.mockClear();
    fireEvent.click(screen.getByLabelText("Allow assistants to make changes"));
    await waitFor(() => expect(assistant.updateSettings).toHaveBeenCalledWith({ allowChanges: true }));
  });

  it("switches to chosen stations and saves the picked list", async () => {
    render(<AssistantSettings />);
    const select = await screen.findByDisplayValue("All stations");
    fireEvent.change(select, { target: { value: "chosen" } });
    await waitFor(() =>
      expect(assistant.updateSettings).toHaveBeenCalledWith({ sharedStations: ["Tech", "Health"] }),
    );
    const health = await screen.findByLabelText(/Health/);
    fireEvent.click(health);
    await waitFor(() => expect(assistant.updateSettings).toHaveBeenLastCalledWith({ sharedStations: ["Tech"] }));
  });

  it("switches back to all stations with a null list", async () => {
    const chosen = baseStatus();
    chosen.settings.sharedStations = ["Tech"];
    assistant.getStatus.mockResolvedValue(chosen);
    render(<AssistantSettings />);
    const select = await screen.findByDisplayValue("Only stations I choose");
    fireEvent.change(select, { target: { value: "all" } });
    await waitFor(() => expect(assistant.updateSettings).toHaveBeenCalledWith({ sharedStations: null }));
  });

  it("shows plain words, never raw errors, when something fails", async () => {
    assistant.updateSettings.mockRejectedValueOnce("Failed to lock the assistant settings.");
    assistant.getClientSetup.mockRejectedValueOnce("Unknown assistant app `x`.");
    render(<AssistantSettings />);
    fireEvent.click(await screen.findByLabelText("Share saved articles"));
    expect(await screen.findByText("Something went wrong. Please try again.")).toBeTruthy();
    fireEvent.click((await screen.findAllByRole("button", { name: "Copy Command" }))[0]);
    await waitFor(() => expect(screen.getAllByText("Something went wrong. Please try again.").length).toBe(2));
    expect(screen.queryByText(/Failed to lock/)).toBeNull();
    expect(screen.queryByText(/Unknown assistant app/)).toBeNull();
  });

  it("copies the Claude Code command and shows the hint", async () => {
    render(<AssistantSettings />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Copy Command" }))[0]);
    await waitFor(() => expect(clipboardWrite).toHaveBeenCalled());
    expect(clipboardWrite.mock.calls[0][0].text).toContain("--mcp");
    expect(await screen.findByText("Copied. Run this once in Terminal.")).toBeTruthy();
  });

  it("saves the Claude Desktop extension where the user picks", async () => {
    saveFile.mockResolvedValue({ canceled: false, filePath: "/Users/me/Downloads/KiJi.mcpb" });
    assistant.writeExtension.mockResolvedValue(undefined);
    render(<AssistantSettings />);
    fireEvent.click(await screen.findByRole("button", { name: "Download Extension" }));
    await waitFor(() => expect(assistant.writeExtension).toHaveBeenCalledWith("/Users/me/Downloads/KiJi.mcpb"));
    expect(await screen.findByText(/Double-click KiJi.mcpb/)).toBeTruthy();
  });

  it("resets access only after confirmation", async () => {
    confirmDialog.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    assistant.resetAccess.mockResolvedValue(baseStatus());
    render(<AssistantSettings />);
    const button = await screen.findByRole("button", { name: "Reset Access" });
    fireEvent.click(button);
    await waitFor(() => expect(confirmDialog).toHaveBeenCalledTimes(1));
    expect(assistant.resetAccess).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(assistant.resetAccess).toHaveBeenCalledTimes(1));
  });

  it("lists connected assistants", async () => {
    const status = baseStatus();
    status.settings.enabled = true;
    status.local = { state: "ready" };
    status.clients = [
      { name: "Claude Code", transport: "local", connectedAt: "2026-10-19T01:00:00.000Z", lastAction: "list_articles" },
    ];
    assistant.getStatus.mockResolvedValue(status);
    render(<AssistantSettings />);
    // One row under "Connect an Assistant", one under "Connected Assistants".
    expect(await screen.findAllByText("Claude Code")).toHaveLength(2);
    expect(await screen.findByText(/listed articles/)).toBeTruthy();
  });
});
