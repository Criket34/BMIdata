document.addEventListener("DOMContentLoaded", () => {
  const entriesContainer = document.getElementById("entries");
  const addEntryBtn = document.getElementById("add-entry-btn");
  const calculateBtn = document.getElementById("calculate-btn");
  const resultBox = document.getElementById("result");

  let entryCount = 0;

  const MET_VALUES = {
    "ウォーキング": 3.5,
    "ランニング": 7.0,
    "サイクリング": 6.0,
    "水泳": 6.0,
    "筋トレ（軽度）": 3.0,
    "筋トレ（中程度）": 4.5,
    "筋トレ（高強度）": 6.0,
    "ヨガ": 2.5,
    "ストレッチ": 2.3,
    "ジャンプロープ": 10.0
  };

  const createEntry = () => {
    entryCount++;

    const div = document.createElement("div");
    div.className = "entry-group";

    // 運動選択
    const activitySelect = document.createElement("select");
    activitySelect.className = "form-control mb-2";
    activitySelect.innerHTML = `<option disabled selected>運動を選択</option>` +
      Object.keys(MET_VALUES)
        .map(act => `<option value="${act}">${act}</option>`)
        .join("");
    
    // 時間入力
    const durationInput = document.createElement("input");
    durationInput.type = "number";
    durationInput.placeholder = "運動時間（分）";
    durationInput.className = "form-control mb-2";

    // 削除ボタン
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "削除";
    deleteBtn.className = "btn btn-sm btn-danger";
    deleteBtn.addEventListener("click", () => {
      entriesContainer.removeChild(div);
    });

    div.appendChild(activitySelect);
    div.appendChild(durationInput);
    div.appendChild(deleteBtn);
    entriesContainer.appendChild(div);
  };

  addEntryBtn.addEventListener("click", createEntry);

  calculateBtn.addEventListener("click", () => {
    const weight = parseFloat(document.getElementById("user-weight").value);
    if (isNaN(weight) || weight <= 0) {
      alert("体重を正しく入力してください。");
      return;
    }

    let totalCalories = 0;
    const entries = entriesContainer.querySelectorAll(".entry-group");

    entries.forEach(entry => {
      const select = entry.querySelector("select");
      const durationInput = entry.querySelector("input");

      const activity = select.value;
      const minutes = parseFloat(durationInput.value);

      if (!activity || isNaN(minutes) || minutes <= 0) return;

      const met = MET_VALUES[activity];
      const hours = minutes / 60;
      const calories = met * weight * hours;

      totalCalories += calories;
    });

    resultBox.textContent = `合計消費カロリー：${totalCalories.toFixed(2)} kcal`;
    resultBox.style.display = "block";
  });

  // 初期1件表示
  createEntry();
});