const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");

test("LaporanPage displays outbound movements as fallback if sales endpoint is empty", () => {
  const source = readFileSync("src/features/inventory/pages/LaporanPage.tsx", "utf8");
  assert.match(source, /sales\.length > 0/);
  assert.match(source, /movements\.filter\(\(item\) => item\.type === "outbound"\)/);
});
