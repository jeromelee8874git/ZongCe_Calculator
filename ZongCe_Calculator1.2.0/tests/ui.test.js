const test = require("node:test");
const assert = require("node:assert/strict");
const calculator = require("../js/calculator.js");
const { createScoreApp } = require("../js/app.js");

class FakeClassList {
  constructor() {
    this.names = new Set();
  }

  toggle(name, force) {
    if (force) this.names.add(name);
    else this.names.delete(name);
  }

  contains(name) {
    return this.names.has(name);
  }
}

class FakeElement {
  constructor() {
    this.value = "";
    this.textContent = "";
    this.attributes = {};
    this.listeners = {};
    this.classList = new FakeClassList();
    this.focused = false;
    this.style = {};
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  addEventListener(type, callback) {
    this.listeners[type] = callback;
  }

  dispatch(type) {
    this.listeners[type]?.({ target: this });
  }

  focus() {
    this.focused = true;
  }
}

function createFakeDocument() {
  const ids = [
    "score-d", "score-x", "score-c", "score-s", "score-w",
    "weight-d", "weight-x", "weight-c", "weight-s", "weight-w",
    "error-d", "error-x", "error-c", "error-s", "error-w",
    "weight-label-d", "weight-label-x", "weight-label-c", "weight-label-s", "weight-label-w",
    "legend-weight-d", "legend-weight-x", "legend-weight-c", "legend-weight-s", "legend-weight-w",
    "track-d", "track-x", "track-c", "track-s", "track-w",
    "weight-error", "weight-total",
    "fitness-t", "reset-button", "result-card", "result-score", "result-status",
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement()]));
  const defaultWeights = { d: "8", x: "65", c: "15", s: "7", w: "5" };
  Object.entries(defaultWeights).forEach(([key, value]) => {
    elements["weight-" + key].value = value;
  });
  return {
    elements,
    getElementById(id) {
      return elements[id];
    },
  };
}

test("修改任意输入框后总分立即更新", () => {
  const documentRef = createFakeDocument();
  createScoreApp(documentRef, calculator);

  const values = { d: "90", x: "85", c: "90", s: "80", w: "90" };
  Object.entries(values).forEach(([key, value]) => {
    const input = documentRef.elements["score-" + key];
    input.value = value;
    input.dispatch("input");
  });
  assert.equal(documentRef.elements["result-score"].textContent, "86.05");

  documentRef.elements["score-x"].value = "88";
  documentRef.elements["score-x"].dispatch("input");
  assert.equal(documentRef.elements["result-score"].textContent, "88.00");
});

test("删除成绩后按 0 实时重算", () => {
  const documentRef = createFakeDocument();
  const app = createScoreApp(documentRef, calculator);
  ["d", "x", "c", "s", "w"].forEach((key) => {
    documentRef.elements["score-" + key].value = "100";
  });
  app.update();
  assert.equal(documentRef.elements["result-score"].textContent, "100.00");

  documentRef.elements["score-x"].value = "";
  documentRef.elements["score-x"].dispatch("input");
  assert.equal(documentRef.elements["result-score"].textContent, "35.00");
  assert.match(documentRef.elements["result-status"].textContent, /空项暂按 0 计/);
});

test("修改任意权重后 P、标签和合计立即更新", () => {
  const documentRef = createFakeDocument();
  createScoreApp(documentRef, calculator);
  ["d", "x", "c", "s", "w"].forEach((key) => {
    documentRef.elements["score-" + key].value = "100";
  });

  const weightX = documentRef.elements["weight-x"];
  weightX.value = "50";
  weightX.dispatch("input");

  assert.equal(documentRef.elements["result-score"].textContent, "85.00");
  assert.equal(documentRef.elements["weight-label-x"].textContent, "50%");
  assert.equal(documentRef.elements["legend-weight-x"].textContent, "50%");
  assert.equal(documentRef.elements["weight-total"].textContent, "85%");
});

test("非法权重显示提示且不会显示旧结果", () => {
  const documentRef = createFakeDocument();
  createScoreApp(documentRef, calculator);
  const weightD = documentRef.elements["weight-d"];

  weightD.value = "";
  weightD.dispatch("input");

  assert.equal(documentRef.elements["result-score"].textContent, "--");
  assert.match(documentRef.elements["weight-error"].textContent, /D 权重：请输入权重/);
  assert.equal(weightD.attributes["aria-invalid"], "true");
});

test("非法输入会显示提示且不会抛出错误", () => {
  const documentRef = createFakeDocument();
  createScoreApp(documentRef, calculator);
  const input = documentRef.elements["score-c"];

  input.value = "abc";
  assert.doesNotThrow(() => input.dispatch("input"));
  assert.equal(documentRef.elements["result-score"].textContent, "--");
  assert.equal(documentRef.elements["error-c"].textContent, "请输入有效数字");
  assert.equal(input.attributes["aria-invalid"], "true");
  assert.equal(documentRef.elements["result-card"].classList.contains("is-invalid"), true);
});

test("清空按钮恢复初始状态并清除体测记录", () => {
  const documentRef = createFakeDocument();
  createScoreApp(documentRef, calculator);
  documentRef.elements["score-d"].value = "90";
  documentRef.elements["score-x"].value = "bad";
  documentRef.elements["fitness-t"].value = "合格";

  documentRef.elements["reset-button"].dispatch("click");

  ["d", "x", "c", "s", "w"].forEach((key) => {
    assert.equal(documentRef.elements["score-" + key].value, "");
  });
  assert.equal(documentRef.elements["fitness-t"].value, "");
  assert.deepEqual(
    ["d", "x", "c", "s", "w"].map((key) => documentRef.elements["weight-" + key].value),
    ["8", "65", "15", "7", "5"],
  );
  assert.equal(documentRef.elements["result-score"].textContent, "0.00");
  assert.equal(documentRef.elements["score-d"].focused, true);
});
