const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");

test("footer uses tuneboss.id domain", () => {
  const source = readFileSync("src/features/inventory/components/BrandFooter.tsx", "utf8");
  assert.match(source, /tuneboss\.id/);
  assert.doesNotMatch(source, /tuneboss\.co\.id/);
});

test("invoice modal defines print area and exact color adjustments", () => {
  const source = readFileSync("src/features/inventory/pages/MovementPage.tsx", "utf8");
  assert.match(source, /nativeID="tuneboss-printable-invoice"/);
  assert.match(source, /nativeID="tuneboss-no-print"/);
  assert.match(source, /print-color-adjust:\s*exact/);
  assert.match(source, /-webkit-print-color-adjust:\s*exact/);
  assert.match(source, /generateInvoicePrintHtml/);
  assert.match(source, /Inter/);
});
