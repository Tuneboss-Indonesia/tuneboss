const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

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
    "../api": { apiRequest, formatDate: value => `fmt:${value}` },
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

  return {
    render() {
      cursor = 0;
      return component();
    },
  };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
function find(tree, type) { return nodes(tree).find(node => node.type === type); }
function openModal(h) {
  find(h.render(), "CrudShell").props.onButton();
  return nodes(h.render()).find(node => typeof node.type === "function");
}

test("master dealers display matched last transaction date from outbound history", async () => {
  const h = harness(async (path) => {
    if (path === "/dealers") {
      return [{ id: "d1", name: "Joko", address: "Solo", phone: "08123" }];
    }
    if (path.startsWith("/stock/movements")) {
      return {
        data: [
          { customerName: "Joko", timestamp: "2026-09-10T10:00:00Z" },
          { customerName: "Joko", timestamp: "2026-09-11T12:00:00Z" },
        ],
      };
    }
    return [];
  });

  await openModal(h).props.onSaved();
  await new Promise((resolve) => setImmediate(resolve));
  const row = find(h.render(), "TableRow");
  assert.ok(row);
  assert.equal(row.props.cells[0], "Joko");
  assert.equal(row.props.cells[3], "fmt:2026-09-11T12:00:00Z");
});
