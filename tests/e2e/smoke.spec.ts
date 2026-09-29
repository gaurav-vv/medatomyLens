import { expect, test, type Page } from "@playwright/test";

const layersReady = (page: Page) =>
  expect(page.locator("[data-layers-ready]")).toHaveAttribute("data-layers-ready", "true", { timeout: 90_000 });

test("app shell loads with 3D canvas, disclaimer and manifest", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page.getByText("AnatomyLens").first()).toBeVisible();
  await expect(page.getByTestId("anatomy-viewer").locator("canvas")).toBeVisible();
  await expect(page.getByText(/does not provide a medical diagnosis/)).toBeVisible();

  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect((await manifest.json()).display).toBe("standalone");

  expect(errors).toEqual([]);
});

test("about page shows disclaimer, licenses and returns to the viewer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "About" }).click();
  await expect(page.getByRole("heading", { name: "About AnatomyLens" })).toBeVisible();
  await expect(page.getByText(/does not provide a medical diagnosis/)).toBeVisible();
  await expect(page.getByText(/CC BY-SA 2\.1 JP/)).toBeVisible();
  await expect(page.getByText(/HuBMAP Human Reference Atlas, CC BY 4\.0/)).toBeVisible();
  await page.getByRole("link", { name: /Back to the viewer/ }).click();
  await expect(page.getByTestId("anatomy-viewer").locator("canvas")).toBeVisible();
});

test("anatomy loads, search selects organs and parts, layers toggle", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://localhost")) external.push(r.url());
  });
  const shot = async (name: string) => {
    await page.waitForTimeout(800);
    await page.screenshot({ path: testInfo.outputPath(name), timeout: 30_000 });
  };

  await page.goto("/");
  await layersReady(page);
  const search = page.getByRole("combobox", { name: "Search anatomy" }).locator("visible=true");
  await expect(search).toBeEnabled();
  await shot("1-body.png");

  const panel = page.getByRole("complementary", { name: "Selected structure" });

  await search.fill("kidney");
  await expect(page.getByRole("option").first()).toContainText(/kidney/i);
  await search.press("Enter");
  await expect(panel).toContainText(/kidney/i);
  await expect(panel).toContainText(/side of the body/);
  await shot("2-kidney.png");

  await search.fill("heart");
  await expect(page.getByRole("option").first()).toContainText("Heart");
  await search.press("Enter");
  await expect(panel).toContainText("Heart");
  await expect(panel).toContainText("model parts");
  await shot("3-heart.png");

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();

  // A structure in a hidden layer: selecting it turns its layer on.
  await search.fill("left biceps");
  await search.press("Enter");
  await expect(page.getByRole("switch", { name: /Muscles/ })).toHaveAttribute("aria-checked", "true");
  await layersReady(page);
  await expect(panel).toContainText(/biceps/i);
  await shot("4-biceps.png");

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Reset view/ }).locator("visible=true").click();
  await shot("5-muscles.png");

  // Privacy / free-first: no third-party requests (fonts are self-hosted by next/font).
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("detail view: open from body, parts, Escape back to body with selection kept", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = async (name: string) => {
    await page.waitForTimeout(800);
    await page.screenshot({ path: testInfo.outputPath(name), timeout: 30_000 });
  };
  const detailReady = () =>
    expect(page.locator("[data-detail-status]")).toHaveAttribute("data-detail-status", "ready", { timeout: 90_000 });

  await page.goto("/");
  await layersReady(page);
  const search = page.getByRole("combobox", { name: "Search anatomy" }).locator("visible=true");
  const panel = page.getByRole("complementary", { name: "Selected structure" });
  const parts = page.getByRole("complementary", { name: "Structure parts" });

  // Heart: a multi-part organ.
  await search.fill("heart");
  await search.press("Enter");
  await expect(panel).toContainText("Heart");
  await panel.getByRole("button", { name: "Open detailed view" }).click();
  await detailReady();
  await expect(page.getByRole("button", { name: /Back to body/ })).toBeVisible();
  await expect(page.getByText("Generic normal reference")).toBeVisible();
  await expect(page.getByText(/not your actual anatomy/).locator("visible=true").first()).toBeVisible();
  await expect(parts).toContainText(/Parts in this model \(\d+\)/);
  await expect(search).toHaveCount(0); // body controls hidden in detail
  await shot("6-heart-detail.png");

  // Highlight a part from the list, then Escape clears it, Escape again goes back.
  const firstPart = parts.getByRole("button").first();
  await firstPart.click();
  await expect(firstPart).toHaveAttribute("aria-pressed", "true");
  await shot("7-heart-part.png");
  await page.keyboard.press("Escape");
  await expect(firstPart).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /Back to body/ })).toHaveCount(0);
  await expect(panel).toContainText("Heart"); // selection kept (Section 103)

  // Kidney: detailed atlas model with real internal parts.
  const search2 = page.getByRole("combobox", { name: "Search anatomy" }).locator("visible=true");
  await search2.fill("right kidney");
  await search2.press("Enter");
  await panel.getByRole("button", { name: "Open detailed view" }).click();
  await detailReady();
  await expect(parts).toContainText("Renal pyramid");
  await expect(parts).toContainText("Renal medulla");
  await expect(parts).toContainText("Right renal pelvis");
  await expect(parts).toContainText("Human Reference Atlas");
  await shot("8-kidney-detail.png");
  await page.getByRole("switch", { name: "See inside" }).click();
  await expect(page.getByRole("switch", { name: "See inside" })).toHaveAttribute("aria-checked", "true");
  await shot("9-kidney-inside.png");
  await parts.getByRole("button", { name: /Renal pyramid/ }).click();
  await expect(parts).toContainText("Showing: Renal pyramid");
  await shot("10-kidney-pyramid.png");
  await page.getByRole("button", { name: /Back to body/ }).click();
  await expect(panel).toContainText("Right kidney");

  // A structure without a detailed atlas model keeps the body mesh and says so.
  await search2.fill("right femur");
  await search2.press("Enter");
  await panel.getByRole("button", { name: "Open detailed view" }).click();
  await detailReady();
  await expect(parts).toContainText("no separate internal parts");
  await page.keyboard.press("Escape");

  expect(errors).toEqual([]);
});


test("detailed atlas organs open with their internal parts", async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await layersReady(page);
  const panel = page.getByRole("complementary", { name: "Selected structure" });
  const parts = page.getByRole("complementary", { name: "Structure parts" });
  const detailStatus = page.locator("[data-detail-status]");

  const organs: [query: string, title: RegExp, part: RegExp][] = [
    ["heart", /^heart$/i, /Mitral valve/],
    ["liver", /^liver$/i, /Caudate lobe of liver/],
    ["left lung", /^lungs$/i, /Upper lobe of left lung/i],
    ["brain", /^brain$/i, /Corpus callosum/],
    ["left eyeball", /^left eyeball$/i, /Left retina/],
  ];
  for (const [query, title, part] of organs) {
    const search = page.getByRole("combobox", { name: "Search anatomy" }).locator("visible=true");
    await search.fill(query);
    await expect(page.getByRole("option").first()).toBeVisible();
    await search.press("Enter");
    await panel.getByRole("button", { name: "Open detailed view" }).click();
    await expect(detailStatus).toHaveAttribute("data-detail-status", "ready", { timeout: 90_000 });
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(parts).toContainText(part);
    await expect(parts).toContainText("Human Reference Atlas");
    await page.getByRole("switch", { name: "See inside" }).click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: testInfo.outputPath(`organ-${query.replace(/\s+/g, "-")}.png`), timeout: 30_000 });
    await page.getByRole("button", { name: /Back to body/ }).click();
    await expect(detailStatus).toHaveAttribute("data-detail-status", "closed");
  }
  expect(errors).toEqual([]);
});

test("demo report: body highlight, organ view modes, region marker, explanation", async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const shot = async (name: string) => {
    await page.waitForTimeout(900);
    await page.screenshot({ path: testInfo.outputPath(name), timeout: 30_000 });
  };
  const wide = (page.viewportSize()?.width ?? 0) >= 768;
  const detailStatus = page.locator("[data-detail-status]");

  await page.goto("/");
  await layersReady(page);
  await page.getByRole("button", { name: "Try the demo report" }).click();
  const card = page.getByRole("region", { name: "Report findings" });
  await expect(card).toContainText("DEMO / SAMPLE DATA");
  await expect(card).toContainText("5 findings · 4 shown on the body · 1 not mapped");
  await shot("demo-1-list.png");

  // Finding → anatomy: creatinine emphasises both kidneys.
  await card.getByRole("button", { name: /Creatinine/ }).click();
  const finding = page.getByRole("complementary", { name: "Finding details" });
  await expect(finding).toContainText("Creatinine | 1.9 | mg/dL | 0.7 - 1.3");
  await expect(finding).toContainText("Above reported range");
  await expect(finding).toContainText("Location not specified in the report");
  await expect(finding.getByRole("img", { name: /above reported range/ })).toBeVisible();
  await shot("demo-2-creatinine.png");

  // Open the right kidney from the finding, then its organ view.
  await finding.getByRole("button", { name: /Right kidney/ }).click();
  const panel = page.getByRole("complementary", { name: "Selected structure" });
  await expect(panel).toContainText("Reported findings");
  await panel.getByRole("button", { name: "Open detailed view" }).click();
  await expect(detailStatus).toHaveAttribute("data-detail-status", "ready", { timeout: 90_000 });
  const organFindings = page.getByRole("region", { name: "Organ findings" });
  await organFindings.getByRole("button", { name: /Right kidney \(ultrasound\)/ }).click();
  await expect(page.getByText("Reported area", { exact: false }).first()).toBeVisible();
  await expect(organFindings).toContainText("Right kidney, lower pole");
  await expect(organFindings).toContainText("Size as reported: 1.8 cm");
  await expect(page.getByText(/not your actual anatomy/).locator("visible=true").first()).toBeVisible();
  await shot("demo-3-reported.png");

  await page.getByRole("radio", { name: "Normal" }).click();
  await expect(page.locator("[data-view-mode]")).toHaveAttribute("data-view-mode", "normal");
  await expect(page.getByText("Generic normal reference").first()).toBeVisible();
  await shot("demo-4-normal.png");

  if (wide) {
    await page.getByRole("radio", { name: "Side by side" }).click();
    await expect(page.locator("[data-view-mode]")).toHaveAttribute("data-view-mode", "side_by_side");
    await shot("demo-5-side-by-side.png");
  } else {
    await expect(page.getByRole("radio", { name: "Side by side" })).toHaveCount(0);
    await page.getByRole("button", { name: "Expand details" }).click();
    await shot("demo-5-sheet.png");
  }

  await page.getByRole("button", { name: /Back to body/ }).click();
  await expect(detailStatus).toHaveAttribute("data-detail-status", "closed");
  await expect(panel).toContainText("Right kidney");
  expect(errors).toEqual([]);
});
