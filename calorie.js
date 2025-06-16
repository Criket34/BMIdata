document.addEventListener("DOMContentLoaded", () => {
  const entriesContainer = document.getElementById("entries");
  const addEntryBtn = document.getElementById("add-entry-btn");
  const calculateBtn = document.getElementById("calculate-btn");
  const resultBox = document.getElementById("result");

  const CATEGORIES = {
    "ウォーキング": {
      "時速4km（ゆっくり）": 3.5,
      "時速6km（やや速め）": 4.5
    },
    "ランニング": {
      "時速8km程度": 7.0,
      "時速10km": 10.0,
      "時速12km": 12.5,
      "時速14km以上": 14.0
    },
    "サイクリング": {
      "ゆっくり（時速15km未満）": 4.5,
      "普通（時速15〜20km）": 6.0,
      "速い（時速20〜25km）": 9.0
    },
    "筋トレ（自重）": {
      "腕立て伏せ": 5.0,
      "スクワット": 5.0,
      "ランジ": 6.0,
      "プランク": 3.5,
      "クランチ（腹筋）": 5.0,
      "レッグレイズ": 4.0,
      "サイドプランク": 3.5,
      "ヒップリフト": 4.0
    },
    "ストレッチ・軽運動": {
      "ラジオ体操第一": 4.0,
      "軽いストレッチ": 2.0,
      "壁腕立て": 2.0,
      "足踏み": 2.0
    },
    "その他運動": {
      "バーピージャンプ": 10.0,
      "マウンテンクライマー": 8.0,
      "ジャンピングジャック": 8.0,
      "ハイニー（もも上げ）": 7.0,
      "ニートゥチェスト": 5.0,
      "ステップ昇降": 6.0,
      "カーフレイズ": 3.0,
      "クライマーもどき": 5.0
    },
    "水泳": {
      "平泳ぎ": 8.0,
      "背泳ぎ": 8.0,
      "クロール（中強度）": 10.0,
      "クロール（高速）": 12.0,
      "バタフライ": 13.0
    }
  };

  const createEntry = () => {
    const div = document.createElement("div");
    div.className = "entry-group";

    // カテゴリー選択
    const categorySelect = document.createElement("select");
    categorySelect.className = "form-control mb-2";
    categorySelect.innerHTML = `<option disabled selected>運動カテゴリーを選択</option>` +
      Object.keys(CATEGORIES).map(cat => `<option value="${cat}">${cat}</option>`).join("");

    // 運動名選択（動的に変化）
    const activitySelect = document.createElement("select");
    activitySelect.className = "form-control mb-2";
    activitySelect.disabled = true;

    categorySelect.addEventListener("change", () => {
      const selectedCategory = categorySelect.value;
      const activities = CATEGORIES[selectedCategory];

      activitySelect.innerHTML = `<option disabled selected>運動名を選択</option>` +
        Object.entries(activities).map(([name]) => `<option value="${name}">${name}</option>`).join("");
      activitySelect.disabled = false;
    });

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

    div.appendChild(categorySelect);
    div.appendChild(activitySelect);
    div.appendChild(durationInput);
    div.appendChild(deleteBtn);
    entriesContainer.appendChild(div);
  };

  addEntryBtn.addEventListener("click", createEntry);

  calculateBtn.addEventListener("click", () => {
    const entries = entriesContainer.querySelectorAll(".entry-group");
    let totalCalories = 0;

    entries.forEach(entry => {
      const category = entry.querySelectorAll("select")[0].value;
      const activity = entry.querySelectorAll("select")[1].value;
      const minutes = parseFloat(entry.querySelector("input").value);

      if (!category || !activity || isNaN(minutes) || minutes <= 0) return;

      const calPerMin = CATEGORIES[category][activity];
      totalCalories += calPerMin * minutes;
    });

    resultBox.textContent = `合計消費カロリー：${totalCalories.toFixed(2)} kcal`;
    resultBox.style.display = "block";
  });

  // 初期表示
  createEntry();
});
