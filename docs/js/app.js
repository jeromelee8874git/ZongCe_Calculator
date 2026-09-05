(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.ScoreApp = api;

  if (root.document && root.ScoreCalculator) {
    const start = function () {
      api.createScoreApp(root.document, root.ScoreCalculator);
    };

    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
      start();
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createScoreApp(documentRef, calculator) {
    if (!documentRef || !calculator) {
      throw new Error("缺少页面或计算器模块，无法初始化。 ");
    }

    const inputs = {};
    const weightInputs = {};
    const errorElements = {};
    const weightLabelElements = {};
    const legendWeightElements = {};
    const trackElements = {};

    calculator.SCORE_KEYS.forEach(function (key) {
      const suffix = key.toLowerCase();
      inputs[key] = documentRef.getElementById("score-" + suffix);
      weightInputs[key] = documentRef.getElementById("weight-" + suffix);
      errorElements[key] = documentRef.getElementById("error-" + suffix);
      weightLabelElements[key] = documentRef.getElementById("weight-label-" + suffix);
      legendWeightElements[key] = documentRef.getElementById("legend-weight-" + suffix);
      trackElements[key] = documentRef.getElementById("track-" + suffix);
    });

    const fitnessInput = documentRef.getElementById("fitness-t");
    const resetButton = documentRef.getElementById("reset-button");
    const resultCard = documentRef.getElementById("result-card");
    const resultScore = documentRef.getElementById("result-score");
    const resultStatus = documentRef.getElementById("result-status");
    const weightError = documentRef.getElementById("weight-error");
    const weightWarning = documentRef.getElementById("weight-warning");
    const weightTotal = documentRef.getElementById("weight-total");

    function readScores() {
      const scores = {};
      calculator.SCORE_KEYS.forEach(function (key) {
        scores[key] = inputs[key].value;
      });
      return scores;
    }

    function readWeights() {
      const weights = {};
      calculator.SCORE_KEYS.forEach(function (key) {
        weights[key] = weightInputs[key].value;
      });
      return weights;
    }

    function formatPercentage(value) {
      return String(Number(value.toFixed(2))) + "%";
    }

    function update() {
      const result = calculator.calculateTotal(readScores(), readWeights());

      calculator.SCORE_KEYS.forEach(function (key) {
        const field = result.fields[key];
        const weightField = result.weightFields[key];
        const isInvalid = field.state === "invalid";
        const isWeightInvalid = weightField.state === "invalid";
        inputs[key].setAttribute("aria-invalid", String(isInvalid));
        weightInputs[key].setAttribute("aria-invalid", String(isWeightInvalid));
        errorElements[key].textContent = isInvalid ? field.message : "";

        const weightText = isWeightInvalid ? "--%" : formatPercentage(weightField.value);
        weightLabelElements[key].textContent = weightText;
        legendWeightElements[key].textContent = weightText;

        const trackWidth = !isWeightInvalid && result.weightTotal > 0
          ? weightField.value / result.weightTotal * 100
          : 0;
        trackElements[key].style.width = trackWidth + "%";
      });

      const invalidWeightKeys = Object.keys(result.weightErrors);
      weightError.textContent = invalidWeightKeys.map(function (key) {
        return key + " 权重：" + result.weightErrors[key];
      }).join("；");
      weightTotal.textContent = invalidWeightKeys.length === 0
        ? formatPercentage(result.weightTotal)
        : "--";
      weightTotal.classList.toggle("is-warning", result.hasWeightAnomaly);

      weightWarning.hidden = !result.hasWeightAnomaly;
      weightWarning.textContent = result.hasWeightAnomaly
        ? "当前权重合计为 " + formatPercentage(result.weightTotal)
          + "，不是 100%。结果仍按当前权重计算，请核对学校、学院当年度正式文件。"
        : "";

      resultScore.textContent = result.display;
      resultCard.classList.toggle("is-invalid", !result.ok);

      const hasScoreError = Object.keys(result.errors).length > 0;
      const hasWeightError = invalidWeightKeys.length > 0;
      if (hasScoreError && hasWeightError) {
        resultStatus.textContent = "请修正标红的成绩和权重后查看总分";
      } else if (hasWeightError) {
        resultStatus.textContent = "请修正标红的权重后查看总分";
      } else if (hasScoreError) {
        resultStatus.textContent = "请修正标红的成绩后查看总分";
      } else if (result.completedCount === 0) {
        resultStatus.textContent = "尚未填写，空项暂按 0 计";
      } else if (result.hasEmpty) {
        resultStatus.textContent = result.completedCount + "/5 项已填写，空项暂按 0 计";
      } else if (result.hasWeightAnomaly) {
        resultStatus.textContent = "5 项已填写，已按当前异常权重计算（合计 "
          + formatPercentage(result.weightTotal) + "）";
      } else {
        resultStatus.textContent = "5 项已填写，已按当前权重计算（合计 "
          + formatPercentage(result.weightTotal) + "）";
      }

      return result;
    }

    function reset() {
      calculator.SCORE_KEYS.forEach(function (key) {
        inputs[key].value = "";
        weightInputs[key].value = String(Number((calculator.DEFAULT_WEIGHTS[key] * 100).toFixed(10)));
      });
      fitnessInput.value = "";
      const result = update();
      inputs.D.focus();
      return result;
    }

    calculator.SCORE_KEYS.forEach(function (key) {
      inputs[key].addEventListener("input", update);
      weightInputs[key].addEventListener("input", update);
    });
    resetButton.addEventListener("click", reset);

    update();

    return Object.freeze({ update, reset, readScores, readWeights });
  }

  return Object.freeze({ createScoreApp });
});
