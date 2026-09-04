const test = require("node:test");
const assert = require("node:assert/strict");
const calculator = require("../js/calculator.js");

test("五项权重合计为 100%", () => {
  assert.ok(Math.abs(calculator.getWeightTotal() - 1) < Number.EPSILON * 10);
});

test("自定义权重会参与实时总分计算", () => {
  const scores = { D: 90, X: 85, C: 90, S: 80, W: 90 };
  const weights = { D: 10, X: 50, C: 20, S: 10, W: 10 };
  const result = calculator.calculateTotal(scores, weights);
  assert.equal(result.ok, true);
  assert.equal(result.display, "86.50");
  assert.equal(result.weightTotal, 100);
});

test("允许自定义权重合计不等于 100%", () => {
  const result = calculator.calculateTotal(
    { D: 100, X: 100, C: 100, S: 100, W: 100 },
    { D: 10, X: 50, C: 20, S: 10, W: 0 },
  );
  assert.equal(result.ok, true);
  assert.equal(result.display, "90.00");
  assert.equal(result.weightTotal, 90);
});

test("空白或超范围权重会阻止显示结果", () => {
  const blank = calculator.calculateTotal({}, { D: "", X: 65, C: 15, S: 7, W: 5 });
  assert.equal(blank.ok, false);
  assert.equal(blank.display, "--");
  assert.equal(blank.weightErrors.D, "请输入权重");

  const tooLarge = calculator.validateWeight("100.01");
  assert.equal(tooLarge.state, "invalid");
  assert.match(tooLarge.message, /0～100%/);
});

test("五项全部为 0 时 P 为 0.00", () => {
  const result = calculator.calculateTotal({ D: 0, X: 0, C: 0, S: 0, W: 0 });
  assert.equal(result.ok, true);
  assert.equal(result.display, "0.00");
});

test("五项全部为 100 时 P 为 100.00", () => {
  const result = calculator.calculateTotal({ D: 100, X: 100, C: 100, S: 100, W: 100 });
  assert.equal(result.ok, true);
  assert.equal(result.display, "100.00");
});

test("正常整数严格按规定公式计算", () => {
  const result = calculator.calculateTotal({ D: 90, X: 85, C: 90, S: 80, W: 90 });
  assert.equal(result.display, "86.05");
});

test("小数输入保留两位小数", () => {
  const result = calculator.calculateTotal({ D: 90, X: 86.5, C: 95, S: 80, W: 92 });
  assert.equal(result.display, "87.88");
});

test("空项按 0 计算且状态为未填完", () => {
  const result = calculator.calculateTotal({ D: 100, X: "", C: 100, S: 100, W: 100 });
  assert.equal(result.ok, true);
  assert.equal(result.display, "35.00");
  assert.equal(result.hasEmpty, true);
  assert.equal(result.completedCount, 4);
});

test("非数字内容返回友好校验结果", () => {
  const result = calculator.calculateTotal({ D: "优秀", X: 80, C: 80, S: 80, W: 80 });
  assert.equal(result.ok, false);
  assert.equal(result.display, "--");
  assert.equal(result.errors.D, "请输入有效数字");
});

test("小于 0 的成绩被拒绝", () => {
  const result = calculator.calculateTotal({ D: -0.1 });
  assert.equal(result.ok, false);
  assert.equal(result.errors.D, "成绩不能低于 0");
});

test("大于 100 的成绩被拒绝", () => {
  const result = calculator.calculateTotal({ X: 100.01 });
  assert.equal(result.ok, false);
  assert.equal(result.errors.X, "成绩不能高于 100");
});

test("多次修改输入后每次都返回对应的新结果", () => {
  const scores = { D: 90, X: 85, C: 90, S: 80, W: 90 };
  assert.equal(calculator.calculateTotal(scores).display, "86.05");
  scores.X = 88;
  assert.equal(calculator.calculateTotal(scores).display, "88.00");
  scores.C = "";
  assert.equal(calculator.calculateTotal(scores).display, "74.50");
  scores.C = 91.5;
  assert.equal(calculator.calculateTotal(scores).display, "88.23");
});
