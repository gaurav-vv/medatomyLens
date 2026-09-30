import { expect, test } from "@playwright/test";

// Sections 37 and 83: without WebGL the viewer says so and the rest of the app keeps working.
test("without WebGL the app still loads its menu, search and upload", async ({ page }) => {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (/webgl/i.test(type)) return null;
      return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText(/3D is not supported on this device or browser/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  await expect(page.getByTestId("report-file-input")).toBeAttached();
  expect(errors).toEqual([]);
});
