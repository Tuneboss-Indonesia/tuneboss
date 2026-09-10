const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");

test("ActionModal supports dealer autofill in outbound movement", () => {
  const source = readFileSync("src/features/inventory/components/ActionModal.tsx", "utf8");
  assert.match(source, /Pilih Dealer/);
  assert.match(source, /dealerOptions/);
  assert.match(source, /setCustomerName\(dealer\.name\)/);
  assert.match(source, /setCustomerPhone\(dealer\.phone\)/);
  assert.match(source, /setParty\(dealer\.address\)/);
});
