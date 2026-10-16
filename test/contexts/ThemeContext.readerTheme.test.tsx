import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, type UserSettings } from "@/services/settings";
import { FontStack } from "@/services/settings/fontFamilies";
import { findReaderTheme } from "@/services/settings/readerThemes";

const getSettings = vi.fn<() => Promise<UserSettings>>();

vi.mock("@/services/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/settings")>();
  return {
    ...actual,
    settingsManager: {
      getSettings: () => getSettings(),
      setTheme: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock("@/lib/tauriClient", () => ({
  tauriClient: { system: { appearance: { set: vi.fn().mockResolvedValue(undefined) } } },
}));

vi.mock("@/utils/googleFonts", () => ({
  loadFontsFromFamilyString: vi.fn().mockResolvedValue(undefined),
}));

const { ThemeProvider } = await import("@/contexts/ThemeContext");
const { loadFontsFromFamilyString } = await import("@/utils/googleFonts");

const root = document.documentElement;
const sepia = findReaderTheme("sepia")!;
const quiet = findReaderTheme("quiet")!;

function settingsWith(overrides: Partial<UserSettings>): UserSettings {
  return { ...DEFAULT_SETTINGS, theme: "light", readerTheme: "sepia", ...overrides };
}

function setWindowType(windowType: string | null) {
  window.history.replaceState({}, "", windowType ? `/?window=${windowType}` : "/");
}

describe("ThemeProvider reader themes", () => {
  beforeEach(() => {
    setWindowType(null);
  });

  afterEach(() => {
    root.removeAttribute("data-reader-theme");
    root.removeAttribute("data-reader-scheme");
    root.removeAttribute("data-theme");
    root.style.cssText = "";
    setWindowType(null);
  });

  it("applies the theme's light version, its fonts, and its reading rhythm in light mode", async () => {
    getSettings.mockResolvedValue(settingsWith({}));
    render(<ThemeProvider><div /></ThemeProvider>);

    await waitFor(() => expect(root.getAttribute("data-reader-theme")).toBe("sepia"));
    expect(root.getAttribute("data-reader-scheme")).toBe("light");
    await waitFor(() => expect(root.style.getPropertyValue("--font-family-article-content")).toBe(sepia.bodyFont));
    expect(root.style.getPropertyValue("--font-family-article-title")).toBe(sepia.titleFont);
    expect(root.style.getPropertyValue("--article-content-line-height")).toBe(String(sepia.contentLineHeight));
    expect(root.getAttribute("data-theme")).toBe("light");
  });

  it("uses the same theme's dark version when the app is dark", async () => {
    getSettings.mockResolvedValue(settingsWith({ theme: "dark" }));
    render(<ThemeProvider><div /></ThemeProvider>);

    await waitFor(() => expect(root.getAttribute("data-reader-theme")).toBe("sepia"));
    expect(root.getAttribute("data-reader-scheme")).toBe("dark");
    expect(root.getAttribute("data-theme")).toBe("dark");
  });

  it("keeps a font the user picked instead of the theme font", async () => {
    getSettings.mockResolvedValue(settingsWith({
      fontFamilies: { ...DEFAULT_SETTINGS.fontFamilies, articleContentFont: FontStack.GEORGIA },
    }));
    render(<ThemeProvider><div /></ThemeProvider>);

    await waitFor(() => expect(root.getAttribute("data-reader-theme")).toBe("sepia"));
    await waitFor(() => expect(root.style.getPropertyValue("--font-family-article-title")).toBe(sepia.titleFont));
    expect(root.style.getPropertyValue("--font-family-article-content")).toBe(FontStack.GEORGIA);
  });

  it("leaves the default palette without a reader theme attribute", async () => {
    getSettings.mockResolvedValue(settingsWith({ readerTheme: "default" }));
    render(<ThemeProvider><div /></ThemeProvider>);

    await waitFor(() => expect(root.getAttribute("data-theme")).toBe("light"));
    await waitFor(() => expect(root.style.getPropertyValue("--font-family-article-content"))
      .toBe(DEFAULT_SETTINGS.fontFamilies.articleContentFont));
    expect(root.hasAttribute("data-reader-theme")).toBe(false);
    expect(root.hasAttribute("data-reader-scheme")).toBe(false);
  });

  it("does not theme the Settings window", async () => {
    setWindowType("settings");
    getSettings.mockResolvedValue(settingsWith({}));
    render(<ThemeProvider><div /></ThemeProvider>);

    await waitFor(() => expect(root.getAttribute("data-theme")).toBe("light"));
    await waitFor(() => expect(root.style.getPropertyValue("--font-family-article-content"))
      .toBe(DEFAULT_SETTINGS.fontFamilies.articleContentFont));
    expect(root.hasAttribute("data-reader-theme")).toBe(false);
    expect(root.hasAttribute("data-reader-scheme")).toBe(false);
  });

  it("themes standalone article windows", async () => {
    setWindowType("article");
    getSettings.mockResolvedValue(settingsWith({}));
    render(<ThemeProvider><div /></ThemeProvider>);

    await waitFor(() => expect(root.getAttribute("data-reader-theme")).toBe("sepia"));
  });

  describe.each([
    ["the superseded load settles last", ["stale", "fresh"] as const],
    ["the superseded load settles first", ["fresh", "stale"] as const],
  ])("when a theme switch races a slow Google Font load and %s", (_label, settleOrder) => {
    afterEach(() => {
      Reflect.deleteProperty(window, "kijiAPI");
    });

    it("keeps the newly chosen theme's fonts", async () => {
      // Each applyFonts run issues 4 loads; hold every load so the test decides settle order.
      const runs: Array<() => void> = [];
      let pendingInRun = 0;
      let releaseCurrent: (() => void) | null = null;
      vi.mocked(loadFontsFromFamilyString).mockImplementation(() => {
        if (pendingInRun === 0) {
          let release!: () => void;
          const gate = new Promise<void>((resolve) => { release = resolve; });
          releaseCurrent = () => release();
          runs.push(releaseCurrent);
          (loadFontsFromFamilyString as unknown as { gate: Promise<void> }).gate = gate;
        }
        pendingInRun = (pendingInRun + 1) % 4;
        return (loadFontsFromFamilyString as unknown as { gate: Promise<void> }).gate;
      });

      let notifySettingsChanged: (() => void) | undefined;
      Reflect.set(window, "kijiAPI", {
        onSettingsChanged: (callback: () => void) => {
          notifySettingsChanged = callback;
          return () => undefined;
        },
      });

      getSettings.mockResolvedValue(settingsWith({ readerTheme: "sepia" }));
      render(<ThemeProvider><div /></ThemeProvider>);
      await waitFor(() => expect(runs).toHaveLength(1));

      getSettings.mockResolvedValue(settingsWith({ readerTheme: "quiet" }));
      await act(async () => { notifySettingsChanged?.(); });
      await waitFor(() => expect(root.getAttribute("data-reader-theme")).toBe("quiet"));
      await waitFor(() => expect(runs).toHaveLength(2));

      const [staleRun, freshRun] = runs;
      for (const which of settleOrder) {
        await act(async () => { (which === "stale" ? staleRun : freshRun)(); });
      }

      expect(root.style.getPropertyValue("--font-family-article-content")).toBe(quiet.bodyFont);
      expect(root.style.getPropertyValue("--font-family-article-title")).toBe(quiet.titleFont);
    });
  });
});
