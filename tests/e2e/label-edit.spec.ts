import { expect, test } from "@playwright/test";

/**
 * Regression test for a bug found in the 2026-08 TRL re-audit: editing the
 * "Your tile label" field while armed re-ran the camera-opening effect
 * (because it was keyed on `myLabel`), tearing down the active MediaStream
 * and calling `getUserMedia()` again on every keystroke. That flashed the
 * peer's tile to "opening…" for the whole room and repeatedly hit the
 * camera hardware while the user was just typing a name.
 *
 * `getUserMedia` is unavailable in this headless environment, so instead of
 * asserting on the video stream itself we count calls to it — the fix must
 * not call it again just because the label changed.
 */
test("editing the tile label after joining does not re-request the camera", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __gumCalls: number }).__gumCalls = 0;
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (...args: Parameters<typeof orig>) => {
      (window as unknown as { __gumCalls: number }).__gumCalls++;
      return orig(...args).catch(() => Promise.reject(new Error("no camera in CI")));
    };
  });
  await page.goto("/");

  await page.getByLabel("Open settings").click();
  const label = page.locator("label", { hasText: /your tile label/i }).locator("input");
  await label.fill("A");
  await page
    .locator(".mesh-settings-drawer, .settings-drawer")
    .getByRole("button", { name: "Close" })
    .click();

  await page.locator("button.window-arm-button").click();
  await page.waitForTimeout(300);
  const afterJoin = await page.evaluate(
    () => (window as unknown as { __gumCalls: number }).__gumCalls,
  );
  expect(afterJoin).toBeGreaterThan(0);

  // Simulate a user typing a longer label one keystroke at a time.
  await page.getByLabel("Open settings").click();
  const label2 = page.locator("label", { hasText: /your tile label/i }).locator("input");
  await label2.fill("");
  await label2.pressSequentially("Alice Window View", { delay: 10 });
  await page.waitForTimeout(300);

  const afterTyping = await page.evaluate(
    () => (window as unknown as { __gumCalls: number }).__gumCalls,
  );
  expect(afterTyping).toBe(afterJoin);

  // The label change must still reach the peer's own tile.
  await page
    .locator(".mesh-settings-drawer, .settings-drawer")
    .getByRole("button", { name: "Close" })
    .click();
  await expect(page.locator(".window-tile-self .window-tile-label")).toContainText(
    "Alice Window View",
  );
});
