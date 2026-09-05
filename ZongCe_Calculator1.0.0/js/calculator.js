(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.ScoreCalculator = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // 学校综合测评规定权重：D 8%、X 65%、C 15%、S 7%、W 5%。
  // 所有权重集中在此处，便于规则变更时统一维护。
  const WEIGHTS = Object.freeze({
    D: 0.08,
    X: 0.65,
    C: 0.15,
    S: 0.07,
    W: 0.05,
  });

  const SCORE_KEYS = Object.freeze(Object.keys(WEIGHTS));

  function validateScore(rawValue) {
    const text = String(rawValue ?? "").trim();

    if (text === "") {
      return { state: "empty", value: 0, message: "" };
    }

    const decimalPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
    if (!decimalPattern.test(text)) {
      return { state: "invalid", value: null, message: "请输入有效数字" };
    }

    const value = Number(text);
    if (!Number.isFinite(value)) {
      return { state: "invalid", value: null, message: "请输入有效数字" };
    }
    if (value < 0) {
      return { state: "invalid", value: null, message: "成绩不能低于 0" };
    }
    if (value > 100) {
      return { state: "invalid", value: null, message: "成绩不能高于 100" };
    }

    return { state: "valid", value, message: "" };
  }

  function calculateTotal(rawScores) {
    const fields = {};
    const errors = {};
    let total = 0;
    let completedCount = 0;

    SCORE_KEYS.forEach(function (key) {
      const field = validateScore(rawScores?.[key]);
      fields[key] = field;

      if (field.state === "invalid") {
        errors[key] = field.message;
        return;
      }

      if (field.state === "valid") {
        completedCount += 1;
      }

      total += field.value * WEIGHTS[key];
    });

    const isValid = Object.keys(errors).length === 0;

    // 加上极小修正量，避免 88.225 这类十进制值受浮点误差影响显示为 88.22。
    const roundedTotal = Math.round((total + Number.EPSILON) * 100) / 100;

    return {
      ok: isValid,
      total: isValid ? total : null,
      display: isValid ? roundedTotal.toFixed(2) : "--",
      fields,
      errors,
      completedCount,
      hasEmpty: completedCount < SCORE_KEYS.length,
    };
  }

  function getWeightTotal() {
    return SCORE_KEYS.reduce(function (sum, key) {
      return sum + WEIGHTS[key];
    }, 0);
  }

  return Object.freeze({
    WEIGHTS,
    SCORE_KEYS,
    validateScore,
    calculateTotal,
    getWeightTotal,
  });
});
