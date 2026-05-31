import { expect, test, type Page } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/** Type a distinct tile label into a peer's Settings drawer.
 *
 * NOTE: `openTwoPeers` runs both pages in one BrowserContext on one origin, so
 * they SHARE `localStorage`. We therefore cannot give peers distinct labels via
 * `localStorage` — the second write clobbers the first. Driving the in-app
 * "Your tile label" input sets per-page React state (`myLabel`), which is the
 * value actually published to Yjs awareness, so each peer keeps its own label
 * regardless of the shared storage. This mirrors reality, where two devices
 * have separate localStorage. */
async function setLabel(page: Page, label: string): Promise<void> {
  const drawer = page.locator(".mesh-settings-drawer, .settings-drawer");
  if ((await drawer.count()) === 0) {
    await page.getByLabel("Open settings").click();
  }
  const input = page.locator("label", { hasText: /your tile label/i }).locator("input");
  await input.fill(label);
  // Close the drawer so its backdrop no longer intercepts clicks on the
  // "Open camera & join" arm button behind it.
  await drawer.getByRole("button", { name: "Close" }).click();
  await expect(drawer).toHaveCount(0);
}

/**
 * Load-bearing cross-peer test for the advertised core action.
 *
 * Advertised: "2-4 friends each point a camera at a view; every phone tiles
 * all the OTHERS' feeds into one composite." The camera frame itself is a
 * sensor we cannot drive from a headless browser, but the SHARED MESH STATE
 * behind the collage — *which peers are present and what each is labelled* —
 * is plain Yjs awareness and IS testable. When a peer joins ("Open camera &
 * join"), SharedWindow writes its `window` field (`{ label, frame: undefined }`)
 * to awareness *before* the first frame, so a labelled placeholder tile must
 * appear in every OTHER peer's collage.
 *
 * This drives the join on both peers with distinct labels and asserts each
 * peer's collage gains a tile carrying the OTHER peer's label — i.e. presence
 * really crossed the mesh. It fails on any regression that breaks awareness
 * propagation or collapses the tile roster.
 */
test("each peer's labelled tile appears in the other peer's collage", async ({
  browser,
  baseURL,
}) => {
  const roomId = `e2e-${Math.random().toString(36).slice(2, 8)}`;
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", {
    storagePrefix,
    roomId,
  });
  try {
    const labelA = "Alice-Window";
    const labelB = "Bob-Garden";
    await setLabel(a, labelA);
    await setLabel(b, labelB);

    // Both peers arm (join the collage). Camera may be unavailable in headless;
    // the awareness presence write happens regardless, synchronously, before
    // the async camera open.
    await a.locator("button.window-arm-button").click();
    await b.locator("button.window-arm-button").click();

    // THE load-bearing cross-peer assertions: each peer's collage must show a
    // tile labelled with the OTHER peer's label — presence crossed the mesh.
    await expect(b.locator(".window-tile-label", { hasText: labelA })).toBeVisible({
      timeout: 15_000,
    });
    await expect(a.locator(".window-tile-label", { hasText: labelB })).toBeVisible({
      timeout: 15_000,
    });

    // Each peer's collage holds at least the two peers' tiles.
    await expect(b.locator(".window-hud")).toContainText(/[2-9]\d* tiles/);
    await expect(a.locator(".window-hud")).toContainText(/[2-9]\d* tiles/);
  } finally {
    await cleanup();
  }
});
