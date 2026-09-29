/** The page itself: what a crawler and a stranger see, and no local link to nothing. */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SITE = fileURLToPath(new URL("../../site", import.meta.url));
const pages = readdirSync(SITE).filter((file) => file.endsWith(".html"));

describe("the site's pages", () => {
  it("has an index and a 404", () => {
    expect(pages.sort()).toEqual(["404.html", "index.html"]);
  });

  for (const page of pages) {
    it(`${page} has a title and a viewport, and every local reference exists`, () => {
      const html = readFileSync(join(SITE, page), "utf8");
      expect(html).toMatch(/<title>[^<]+<\/title>/);
      expect(html).toContain('name="viewport"');
      const local = [...html.matchAll(/(?:href|src)="(\/[^"#?]*)"/g)]
        .map((m) => m[1] ?? "")
        .filter((path) => path !== "/");
      for (const path of local) expect(existsSync(join(SITE, path)), path).toBe(true);
    });
  }

  it("says what Nightshift is and points at the repository", () => {
    const html = readFileSync(join(SITE, "index.html"), "utf8");
    expect(html).toContain('name="description"');
    expect(html).toContain("https://github.com/wildorder/nightshift");
  });
});
