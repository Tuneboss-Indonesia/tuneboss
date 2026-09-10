const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const jsx = require("react/jsx-runtime");

function table(width, columns) {
  const module = { exports: {} };
  const mocks = {
    react: { ...React, useState: value => [value, () => {}] },
    "react/jsx-runtime": jsx,
    "react-native": { View: "View", ScrollView: "ScrollView", Text: "Text", Pressable: "Pressable", useWindowDimensions: () => ({ width }) },
    "lucide-react-native": {},
    "../../../theme/tokens": { colors: {}, fonts: {} },
    "../styles": { styles: {} },
  };
  const code = ts.transpileModule(readFileSync(`${__dirname}/common.tsx`, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => { assert.ok(name in mocks); return mocks[name]; } });
  return module.exports.DataTable({ columns, children: jsx.jsx(module.exports.TableRow, { cells: ["Dealer"], actions: jsx.jsx("Pressable", {}) }), pagination: { currentPage: 1, lastPage: 1, total: 1 }, onPageChange() {} });
}
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== "object") return [];
  return [node, ...nodes(node.props?.children)];
}
const columns = ["Tanggal", "Produk", "Jumlah", "No. Seri", "Pembeli/Dealer", "Status Bayar", "Alamat", "Catatan", "Aksi"];
test("tablet landscape tables scroll horizontally without squeezing actions", () => {
  const root = table(1024, columns);
  const scroll = nodes(root).find(node => node.type === "ScrollView");
  assert.ok(scroll, "table must have a horizontal scroll container");
  assert.equal(scroll.props.horizontal, true);
  assert.equal(scroll.props.showsHorizontalScrollIndicator, true);
  assert.ok(scroll.props.children.props.style.some(style => style?.minWidth >= 1200));
  assert.ok(nodes(scroll).some(node => node.props.children === "Aksi"));
  assert.ok(root.props.children.some(node => typeof node?.type === "function" && node.props.pagination));
});
test("desktop tables retain the horizontal overflow container", () => {
  assert.ok(nodes(table(1440, columns)).some(node => node.type === "ScrollView" && node.props.horizontal));
});
test("phone cards remain compact instead of forcing a wide table", () => {
  const root = table(390, columns);
  assert.equal(nodes(root).some(node => node.type === "ScrollView"), false);
  assert.ok(nodes(root).some(node => node.props.compact === true && node.props.actions));
});
