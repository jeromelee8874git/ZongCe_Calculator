(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.ScoreCalculator = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // 页面首次打开及重置时使用的默认权重。
  const DEFAULT_WEIGHTS = Object.freeze({
    D: 0.08,
    X: 0.65,
    C: 0.15,
    S: 0.07,
    W: 0.05,
  });

  // 保留 WEIGHTS 名称，兼容旧版中可能直接读取默认权重的代码。
  const WEIGHTS = DEFAULT_WEIGHTS;
  const SCORE_KEYS = Object.freeze(Object.keys(DEFAULT_WEIGHTS));
  const decimalPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

  function validateScore(rawValue) {
    const text = String(rawValue ?? "").trim();

    if (text === "") {
      return { state: "empty", value: 0, message: "" };
    }

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

  function validateWeight(rawValue) {
    const text = String(rawValue ?? "").trim();

    if (text === "") {
      return { state: "invalid", value: null, message: "请输入权重" };
    }
    if (!decimalPattern.test(text)) {
      return { state: "invalid", value: null, message: "请输入有效数字" };
    }

    const value = Number(text);
    if (!Number.isFinite(value)) {
      return { state: "invalid", value: null, message: "请输入有效数字" };
    }
    if (value < 0 || value > 100) {
      return { state: "invalid", value: null, message: "权重须在 0～100% 之间" };
    }

    return { state: "valid", value, message: "" };
  }

  function calculateTotal(rawScores, rawWeights) {
    const fields = {};
    const weightFields = {};
    const errors = {};
    const weightErrors = {};
    let total = 0;
    let completedCount = 0;

    SCORE_KEYS.forEach(function (key) {
      const defaultPercentage = DEFAULT_WEIGHTS[key] * 100;
      const rawWeight = rawWeights == null ? defaultPercentage : rawWeights[key];
      const weightField = validateWeight(rawWeight);
      weightFields[key] = weightField;

      if (weightField.state === "invalid") {
        weightErrors[key] = weightField.message;
      }
    });

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

      if (weightFields[key].state === "valid") {
        total += field.value * weightFields[key].value / 100;
      }
    });

    const isValid = Object.keys(errors).length === 0 && Object.keys(weightErrors).length === 0;
    const weightTotal = SCORE_KEYS.reduce(function (sum, key) {
      const weight = weightFields[key];
      return sum + (weight.state === "valid" ? weight.value : 0);
    }, 0);
    const hasWeightAnomaly = Object.keys(weightErrors).length === 0
      && Math.abs(weightTotal - 100) > 0.000001;

    // 加上极小修正量，避免 88.225 这类十进制值受浮点误差影响显示为 88.22。
    const roundedTotal = Math.round((total + Number.EPSILON) * 100) / 100;

    return {
      ok: isValid,
      total: isValid ? total : null,
      display: isValid ? roundedTotal.toFixed(2) : "--",
      fields,
      weightFields,
      errors,
      weightErrors,
      weightTotal,
      hasWeightAnomaly,
      completedCount,
      hasEmpty: completedCount < SCORE_KEYS.length,
    };
  }

  function getWeightTotal(rawWeights) {
    return SCORE_KEYS.reduce(function (sum, key) {
      const value = rawWeights == null ? DEFAULT_WEIGHTS[key] * 100 : rawWeights[key];
      const field = validateWeight(value);
      return sum + (field.state === "valid" ? field.value / 100 : 0);
    }, 0);
  }

  return Object.freeze({
    DEFAULT_WEIGHTS,
    WEIGHTS,
    SCORE_KEYS,
    validateScore,
    validateWeight,
    calculateTotal,
    getWeightTotal,
  });
});
