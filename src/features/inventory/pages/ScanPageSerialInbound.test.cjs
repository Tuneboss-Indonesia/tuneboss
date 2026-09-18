const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");

test("ScanPage supports serial numbers on inbound stock movement and add-product shortcut on error", () => {
  const source = readFileSync("src/features/inventory/pages/ScanPage.tsx", "utf8");
  assert.match(source, /serialNumbers/);
  assert.match(source, /serialList\.length/);
  assert.match(source, /serialNumbers: serialList\.length \? serialList : undefined/);
  assert.match(source, /Kode Produk \+ No Seri/);
  assert.match(source, /isNewSerial/);
  assert.match(source, /setMovementType\(found\.serialStatus === "in_stock" \? "keluar" : "masuk"\)/);
  assert.match(source, /onAddProduct/);
  assert.match(source, /Tambah Master Produk Baru/);
});
