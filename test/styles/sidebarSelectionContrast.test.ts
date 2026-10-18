import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(process.cwd(), "src/styles/theme.css"), "utf8");

/** The first `:root {…}` block holds the built-in light tokens. */
const lightBlock = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
const darkBlock = /\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";

const token = (block: string, name: string): string => {
  const match = new RegExp(`${name}:\\s*([^;]+);`).exec(block);
  if (!match) throw new Error(`Missing ${name}`);
  return match[1].trim();
};

/** macOS accent colors (System Settings → Appearance), light appearance. */
const MACOS_ACCENTS = {
  blue: "#007AFF",
  purple: "#A550A7",
  pink: "#F74F9E",
  red: "#FF5257",
  orange: "#F7821B",
  yellow: "#FFC600",
  green: "#62BA46",
  graphite: "#8C8C8C",
};

/** Light sidebar fill (`--theme-sidebar-bg` without vibrancy). */
const LIGHT_SIDEBAR = "#FAFAF9";

type Rgb = [number, number, number];

const hex = (value: string): Rgb => {
  const n = Number.parseInt(value.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const mix = (a: Rgb, b: Rgb, percentA: number): Rgb =>
  a.map((channel, index) => channel * (percentA / 100) + b[index] * (1 - percentA / 100)) as Rgb;

const luminance = ([r, g, b]: Rgb): number => {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (a: Rgb, b: Rgb): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** `color-mix(in srgb, var(--system-accent-color) N%, <other>)` → N. */
const accentPercent = (value: string): number => {
  const match = /color-mix\(in srgb,\s*var\(--system-accent-color\)\s*(\d+(?:\.\d+)?)%/.exec(value);
  if (!match) throw new Error(`Expected an accent color-mix, got ${value}`);
  return Number(match[1]);
};

describe("sidebar selected row (light)", () => {
  const bgPercent = accentPercent(token(lightBlock, "--sidebar-selected-bg"));
  const textValue = token(lightBlock, "--sidebar-selected-color");
  const textPercent = accentPercent(textValue);
  const ink = hex(token(lightBlock, "--theme-primary-color"));

  it("darkens the accent toward the ink instead of using the raw accent", () => {
    expect(textValue).toContain("var(--theme-primary-color)");
    expect(textPercent).toBeLessThan(100);
  });

  it.each(Object.entries(MACOS_ACCENTS))("keeps %s text at 4.5:1 or more on its tinted row", (_name, accent) => {
    const background = mix(hex(accent), hex(LIGHT_SIDEBAR), bgPercent);
    const text = mix(hex(accent), ink, textPercent);
    expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the raw accent for the dark theme, where yellow already reads", () => {
    expect(token(darkBlock, "--sidebar-selected-color")).toBe("var(--system-accent-color)");
  });
});

describe("article-list favicon chip", () => {
  it("is a light chip in light mode, not the dark gray used for dark mode", () => {
    const light = token(lightBlock, "--article-list-favicon-chip-bg");
    expect(luminance(hex(light))).toBeGreaterThan(0.8);
    expect(token(darkBlock, "--article-list-favicon-chip-bg")).toContain("--theme-text-primary");
  });

  it("is applied by the article list", () => {
    const listCss = readFileSync(path.resolve(process.cwd(), "src/components/MainArea/ArticleList.css"), "utf8");
    expect(listCss).toMatch(/\.article-list-favicon-container \{[^}]*background-color: var\(--article-list-favicon-chip-bg\)/);
  });
});
