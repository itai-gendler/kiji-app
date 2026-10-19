import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isInAppMenuBarOs } from "@/services/ui/appMenuModel";

/**
 * On Windows/Linux the window's own controls are HTML: the main window's
 * AppMenuBar and the secondary windows' fixed caption buttons fill the top
 * strip and paint above the image lightbox. The lightbox close button must sit
 * below that strip, or a click on it lands on the window Close button.
 */

const read = (relativePath: string) =>
  readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

const lightboxCss = read("src/components/MainArea/ArticleImageLightbox.css");
const menuBarCss = read("src/components/AppMenuBar/AppMenuBar.css");
const captionCss = read("src/components/WindowChrome/WindowCaptionButtons.css");

interface CssRule {
  selectors: string[];
  body: string;
}

const parseRules = (css: string): CssRule[] => {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: CssRule[] = [];
  for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    rules.push({
      selectors: match[1].split(",").map((selector) => selector.trim().replace(/\s+/g, " ")),
      body: match[2],
    });
  }
  return rules;
};

const declaration = (body: string, property: string): string | null => {
  const escaped = property.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const match = new RegExp(`(?:^|[;\\s])${escaped}\\s*:\\s*([^;]+);`).exec(body);
  return match ? match[1].trim() : null;
};

const px = (value: string | null, label: string): number => {
  const match = value ? /^(-?\d+(?:\.\d+)?)px$/.exec(value) : null;
  if (!match) throw new Error(`${label}: expected a px value, got ${value}`);
  return Number(match[1]);
};

const ruleFor = (rules: CssRule[], selector: string): CssRule => {
  const rule = rules.find((candidate) => candidate.selectors.includes(selector));
  if (!rule) throw new Error(`Missing rule for ${selector}`);
  return rule;
};

const lightboxRules = parseRules(lightboxCss);

/** `--lightbox-top-inset` in effect for an OS (the per-OS rule wins over the base rule). */
const lightboxTopInset = (os: string): number => {
  const osRule = lightboxRules.find((rule) =>
    rule.selectors.includes(`:root[data-os="${os}"] .article-image-lightbox`),
  );
  const value = (osRule && declaration(osRule.body, "--lightbox-top-inset"))
    ?? declaration(ruleFor(lightboxRules, ".article-image-lightbox").body, "--lightbox-top-inset");
  return px(value, `--lightbox-top-inset (${os})`);
};

const closeButtonTop = px(
  declaration(ruleFor(lightboxRules, ".article-image-lightbox-close").body, "top"),
  "lightbox close top",
);

const menuBarHeight = px(
  declaration(ruleFor(parseRules(menuBarCss), ".app-menu-bar").body, "--app-menu-bar-height"),
  "--app-menu-bar-height",
);

const fixedCaptionHeight = px(
  declaration(ruleFor(parseRules(captionCss), ".window-caption-buttons-fixed").body, "height"),
  "fixed caption buttons height",
);

describe("image lightbox vs Windows/Linux window chrome", () => {
  it("positions the overlay from the top inset", () => {
    const base = ruleFor(lightboxRules, ".article-image-lightbox").body;
    expect(declaration(base, "inset")).toMatch(/^var\(--lightbox-top-inset\)/);
  });

  for (const os of ["windows", "linux", "other"]) {
    it(`keeps the close button below the caption strip on ${os}`, () => {
      expect(isInAppMenuBarOs(os)).toBe(true);
      const strip = Math.max(menuBarHeight, fixedCaptionHeight);
      expect(lightboxTopInset(os) + closeButtonTop).toBeGreaterThanOrEqual(strip);
    });
  }

  it("keeps the full-window overlay on macOS (native traffic lights)", () => {
    expect(isInAppMenuBarOs("macos")).toBe(false);
    expect(lightboxTopInset("macos")).toBe(0);
  });
});
