const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Exercise the component's handlers without a native renderer or live API.
function harness(apiRequest) {
  const state = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const module = { exports: {} };
  const mocks = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [state[index], (next) => { state[index] = typeof next === "function" ? next(state[index]) : next; }];
      },
      useEffect() {},
    },
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "react-native": { Alert: { alert() {} }, ...Object.fromEntries(["Modal", "Pressable", "ScrollView", "Text", "TextInput", "View"].map(name => [name, name])) },
    "../api": { apiRequest, formatDate: value => value },
    "../components/common": Object.fromEntries(["CrudShell", "DataTable", "EmptyRow", "RowActions", "TableRow"].map(name => [name, name])),
    "../InventoryDataContext": { useInventoryData: () => ({ token: "test-token" }) },
    "../styles": { styles: {} },
  };
  const source = readFileSync(`${__dirname}/DealerPage.tsx`, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require(name) {
    assert.ok(name in mocks, `Unexpected dependency: ${name}`);
    return mocks[name];
  } });
  let component = module.exports.DealerPage;
  let props = {};
  return {
    render() { cursor = 0; return component(props); },
    mount(element) { state.length = 0; component = element.type; props = element.props; },
  };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
function find(tree, type) { return nodes(tree).find(node => node.type === type); }
function text(tree) { return nodes(tree).filter(node => node.type === "Text").map(node => node.props.children).join(" "); }
function openModal(h) {
  find(h.render(), "CrudShell").props.onButton();
  return nodes(h.render()).find(node => typeof node.type === "function");
}

test("saved dealers refresh from the API's unwrapped array", async () => {
  const h = harness(async () => [{ id: "dealer", name: "Dealer Test", address: null, phone: null }]);
  await openModal(h).props.onSaved();
  await new Promise(resolve => setImmediate(resolve));
  const row = find(h.render(), "TableRow");
  assert.ok(row, "saved dealer should appear in the list");
  assert.equal(row.props.cells[0], "Dealer Test");
});

test("empty dealer master loads paginated transaction history", async () => {
  const h = harness(async path => path === "/dealers" ? [] : { data: [{ customerName: "History Dealer", customerPhone: "", saleAddress: "Address", timestamp: "2026-01-01" }] });
  await openModal(h).props.onSaved();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(find(h.render(), "TableRow").props.cells[0], "History Dealer");
});

test("empty master and history show the empty state", async () => {
  const h = harness(async path => path === "/dealers" ? [] : { data: [] });
  await openModal(h).props.onSaved();
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(find(h.render(), "EmptyRow"));
});

test("refresh failure is visible instead of an empty success state", async () => {
  const h = harness(async () => { throw new Error("offline"); });
  await openModal(h).props.onSaved();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(text(h.render()), /gagal dimuat/i);
  assert.equal(find(h.render(), "EmptyRow"), undefined);
});

test("save failure stays in the modal with a visible message", async () => {
  const h = harness(async () => { throw new Error("offline"); });
  h.mount(openModal(h));
  const name = nodes(h.render()).find(node => node.props.placeholder === "Nama dealer");
  name.props.onChangeText("Dealer Test");
  const save = nodes(h.render()).find(node => node.type === "Pressable" && text(node) === "Simpan");
  save.props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(text(h.render()), /gagal disimpan/i);
});
