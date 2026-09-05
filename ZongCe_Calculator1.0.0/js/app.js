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
    const errorElements = {};

    calculator.SCORE_KEYS.forEach(function (key) {
      inputs[key] = documentRef.getElementById("score-" + key.toLowerCase());
      errorElements[key] = documentRef.getElementById("error-" + key.toLowerCase());
    });

    const fitnessInput = documentRef.getElementById("fitness-t");
    const resetButton = documentRef.getElementById("reset-button");
    const resultCard = documentRef.getElementById("result-card");
    const resultScore = documentRef.getElementById("result-score");
    const resultStatus = documentRef.getElementById("result-status");

    function readScores() {
      const scores = {};
      calculator.SCORE_KEYS.forEach(function (key) {
        scores[key] = inputs[key].value;
      });
      return scores;
    }

    function update() {
      const result = calculator.calculateTotal(readScores());

      calculator.SCORE_KEYS.forEach(function (key) {
        const field = result.fields[key];
        const isInvalid = field.state === "invalid";
        inputs[key].setAttribute("aria-invalid", String(isInvalid));
        errorElements[key].textContent = isInvalid ? field.message : "";
      });

      resultScore.textContent = result.display;
      resultCard.classList.toggle("is-invalid", !result.ok);

      if (!result.ok) {
        resultStatus.textContent = "请修正标红的成绩后查看总分";
      } else if (result.completedCount === 0) {
        resultStatus.textContent = "尚未填写，空项暂按 0 计";
      } else if (result.hasEmpty) {
        resultStatus.textContent = result.completedCount + "/5 项已填写，空项暂按 0 计";
      } else {
        resultStatus.textContent = "5 项已填写，已按规定权重计算";
      }

      return result;
    }

    function reset() {
      calculator.SCORE_KEYS.forEach(function (key) {
        inputs[key].value = "";
      });
      fitnessInput.value = "";
      const result = update();
      inputs.D.focus();
      return result;
    }

    calculator.SCORE_KEYS.forEach(function (key) {
      inputs[key].addEventListener("input", update);
    });
    resetButton.addEventListener("click", reset);

    update();

    return Object.freeze({ update, reset, readScores });
  }

  return Object.freeze({ createScoreApp });
});
