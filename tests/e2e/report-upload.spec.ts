import { expect, test, type Page } from "@playwright/test";
import { labTablePage, makePdf } from "../fixtures/makePdf";

/**
 * PDF report reading (Phase 2), with SYNTHETIC PDFs generated in the test
 * (AGENTS.md Section 75). Everything must run on the device: the test fails
 * on any request that leaves localhost.
 */

const layersReady = (page: Page) =>
  expect(page.locator("[data-layers-ready]")).toHaveAttribute("data-layers-ready", "true", { timeout: 90_000 });

const ROWS = [
  ["Test", "Result", "Unit", "Reference range"],
  ["Creatinine", "1.9", "mg/dL", "0.7 - 1.3"],
  ["ALT (SGPT)", "28", "U/L", "7 - 56"],
  ["Vitamin B6", "12", "ng/mL", "5 - 50"],
];

function watch(page: Page) {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (!r.url().startsWith("http://localhost")) external.push(r.url());
  });
  return { errors, external };
}

async function upload(page: Page, name: string, data: Uint8Array | Buffer, mimeType = "application/pdf") {
  await page.getByTestId("report-file-input").setInputFiles({ name, mimeType, buffer: Buffer.from(data) });
}

test("text PDF: read, review, show on the body, open a finding", { tag: "@3d" }, async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const { errors, external } = watch(page);
  await page.goto("/");
  await layersReady(page);

  await upload(page, "synthetic-lab.pdf", makePdf([labTablePage("SYNTHETIC TEST REPORT - not a real patient", ROWS)]));
  const dialog = page.getByRole("dialog", { name: "Check what was read" });
  await expect(dialog).toBeVisible({ timeout: 60_000 });
  await expect(dialog.getByTestId("review-summary")).toHaveText("3 test results found on 1 page.");
  await expect(dialog).toContainText("Creatinine | 1.9 | mg/dL | 0.7 - 1.3");
  await expect(dialog).toContainText("Associated with: Left kidney, Right kidney");
  await expect(dialog).toContainText("Not in the app's terminology yet");
  await expect(dialog).toContainText("not uploaded or saved");
  await page.screenshot({ path: testInfo.outputPath("upload-1-review.png") });

  // Untick one row: it is left out of the report.
  await dialog.getByRole("checkbox", { name: /Vitamin B6/ }).uncheck();
  await dialog.getByRole("button", { name: "Show results (2)" }).click();
  await expect(dialog).toBeHidden();

  const card = page.getByRole("region", { name: "Report findings" });
  await expect(card).toContainText("YOUR REPORT · ON THIS DEVICE");
  await expect(card).not.toContainText("DEMO");
  await expect(card).toContainText("2 findings · 2 shown on the body");
  await card.getByRole("button", { name: /Creatinine/ }).click();
  const finding = page.getByRole("complementary", { name: "Finding details" });
  await expect(finding).toContainText("Creatinine | 1.9 | mg/dL | 0.7 - 1.3");
  await expect(finding).toContainText("Uploaded report · page 1");
  await expect(finding).toContainText("Above reported range");
  await page.screenshot({ path: testInfo.outputPath("upload-2-finding.png") });

  await page.getByRole("button", { name: "Close report" }).click();
  await expect(page.getByRole("button", { name: "Upload report (PDF)" }).first()).toBeVisible();
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("imaging text PDF: statement placed on the named side and region, negation not marked", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  const { errors, external } = watch(page);
  await page.goto("/");
  await layersReady(page);
  const lines = [
    "SYNTHETIC ULTRASOUND ABDOMEN - not a real patient",
    "Right kidney: 1.8 cm simple cortical cyst at the lower pole.",
    "Left kidney: normal in size. No calculus in the left kidney.",
    "Liver is normal in size and echotexture.",
  ];
  await upload(page, "synthetic-usg.pdf", makePdf([{ texts: lines.map((text, i) => ({ x: 40, y: 60 + i * 20, text, size: 11 })) }]));
  const dialog = page.getByRole("dialog", { name: "Check what was read" });
  await expect(dialog.getByTestId("review-summary")).toHaveText("2 report statements found on 1 page.", { timeout: 60_000 });
  await expect(dialog).toContainText("The report names: Right kidney · Right kidney, lower pole");
  await expect(dialog).toContainText("not found: listed, not marked");
  await dialog.getByRole("button", { name: "Show results (2)" }).click();

  const card = page.getByRole("region", { name: "Report findings" });
  await expect(card).toContainText("1 shown on the body");
  await card.getByRole("button", { name: /Left kidney \(report statement\)/ }).click();
  const finding = page.getByRole("complementary", { name: "Finding details" });
  await expect(finding).toContainText("The report states this was not found");
  // Phones collapse the list after opening a finding: expand it again.
  const expand = card.getByRole("button", { name: /findings ▾/ });
  if (await expand.isVisible()) await expand.click();
  await card.getByRole("button", { name: /Right kidney \(report statement\)/ }).click();
  await finding.getByRole("button", { name: /Right kidney/ }).click();
  const panel = page.getByRole("complementary", { name: "Selected structure" });
  await panel.getByRole("button", { name: "Open detailed view" }).click();
  await expect(page.locator("[data-detail-status]")).toHaveAttribute("data-detail-status", "ready", { timeout: 90_000 });
  const organFindings = page.getByRole("region", { name: "Organ findings" });
  await expect(organFindings).toContainText("Right kidney, lower pole");
  await expect(organFindings).toContainText("Size as reported: 1.8 cm");
  await page.screenshot({ path: testInfo.outputPath("upload-4-imaging-organ.png") });
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("X-ray text PDF: statements placed on the named bone and side", { tag: "@3d" }, async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const { errors, external } = watch(page);
  await page.goto("/");
  await layersReady(page);
  const lines = [
    "SYNTHETIC X-RAY REPORT - not a real patient",
    "Right femur: fracture of the shaft.",
    "Lumbar spine: anterior wedging of L1.",
    "No fracture of the left tibia.",
    "Lumbar spine: L4-L5 disc space narrowing.",
  ];
  await upload(page, "synthetic-xray.pdf", makePdf([{ texts: lines.map((text, i) => ({ x: 40, y: 60 + i * 20, text, size: 11 })) }]));
  const dialog = page.getByRole("dialog", { name: "Check what was read" });
  await expect(dialog.getByTestId("review-summary")).toHaveText("3 report statements found on 1 page.", { timeout: 60_000 });
  await expect(dialog).toContainText("Right femur, shaft");
  await page.screenshot({ path: testInfo.outputPath("xray-1-review.png") });
  await dialog.getByRole("button", { name: /Show results/ }).click();

  const card = page.getByRole("region", { name: "Report findings" });
  await expect(card).toContainText("2 shown on the body");
  await card.getByRole("button", { name: /Right femur \(report statement\)/ }).click();
  const finding = page.getByRole("complementary", { name: "Finding details" });
  await expect(finding).toContainText("Right femur: fracture of the shaft.");
  await finding.getByRole("button", { name: /Right femur/ }).first().click();
  const panel = page.getByRole("complementary", { name: "Selected structure" });
  await expect(panel).toContainText(/femur/i);
  await panel.getByRole("button", { name: "Open detailed view" }).click();
  await expect(page.locator("[data-detail-status]")).toHaveAttribute("data-detail-status", "ready", { timeout: 90_000 });
  await expect(page.getByRole("region", { name: "Organ findings" })).toContainText("Right femur, shaft");
  await expect(page.getByText("Reported area", { exact: false }).first()).toBeVisible();
  await page.waitForTimeout(900);
  await page.screenshot({ path: testInfo.outputPath("xray-2-femur.png") });
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("upload errors are explained and recoverable", async ({ page }) => {
  test.setTimeout(120_000);
  const { errors } = watch(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Upload report (PDF)" }).first()).toBeVisible();

  // A renamed non-PDF file: checked by content, not by name or MIME type.
  await upload(page, "fake.pdf", Buffer.from("PK\u0003\u0004 not a pdf"));
  const dialog = page.getByRole("dialog", { name: "The report could not be read" });
  await expect(dialog).toContainText("This file is not a PDF");
  await expect(dialog.getByRole("button", { name: "Choose another file" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // Password-protected: a clear next step, and retry is offered.
  await upload(page, "locked.pdf", makePdf([labTablePage("SYNTHETIC", ROWS)], { passwordProtected: true }));
  await expect(dialog).toContainText("password-protected", { timeout: 60_000 });
  await expect(dialog.getByRole("button", { name: "Try again" })).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});

test("scanned PDF: text recognition runs on the device and is labeled", async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const { errors, external } = watch(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Upload report (PDF)" }).first()).toBeVisible();

  // Draw a synthetic table into pixels in the browser, then wrap it as an image-only PDF page.
  const W = 1400;
  const H = 360;
  const b64 = await page.evaluate(
    ({ W, H, rows }) => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#000";
      ctx.font = "34px Arial, Helvetica, sans-serif";
      const cols = [40, 520, 760, 1020];
      rows.forEach((cells, r) => cells.forEach((t, i) => ctx.fillText(t, cols[i]!, 70 + r * 80)));
      const px = ctx.getImageData(0, 0, W, H).data;
      const gray = new Uint8Array(W * H);
      for (let i = 0; i < gray.length; i++) gray[i] = px[i * 4]!;
      let s = "";
      for (let i = 0; i < gray.length; i += 0x8000) s += String.fromCharCode(...gray.subarray(i, i + 0x8000));
      return btoa(s);
    },
    { W, H, rows: ROWS },
  );
  const gray = new Uint8Array(Buffer.from(b64, "base64"));
  await upload(page, "synthetic-scan.pdf", makePdf([{ image: { gray, width: W, height: H, x: 20, y: 60, w: 555, h: (555 * H) / W } }]));

  const dialog = page.getByRole("dialog", { name: "Check what was read" });
  await expect(dialog).toBeVisible({ timeout: 240_000 });
  await expect(dialog).toContainText("was a scanned image, read by text recognition");
  await expect(dialog).toContainText("Creatinine");
  // OCR values are never pre-selected: the user compares them with the report first.
  // (Checked for every row: exact OCR text depends on the fonts installed on the machine.)
  const boxes = dialog.getByRole("checkbox");
  await expect(boxes.first()).toBeVisible();
  for (const box of await boxes.all()) await expect(box).not.toBeChecked();
  await expect(dialog).toContainText("tick only if it matches your report");
  await page.screenshot({ path: testInfo.outputPath("upload-3-ocr-review.png") });
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
