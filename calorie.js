// calorie.js - Firebase v10 module version
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  set,
  remove,
  query,
  orderByChild,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---------- Firebase 設定 ----------
const firebaseConfig = {
  apiKey: "AIzaSyAqrTNSA-E-fq_63oS3cNjgeC7WYr3l-bQ",
  authDomain: "bmi-app-a99f3.firebaseapp.com",
  databaseURL: "https://bmi-app-a99f3-default-rtdb.firebaseio.com",
  projectId: "bmi-app-a99f3",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// ---------- DOM 要素 ----------
const entriesDiv = document.getElementById("entries");
const addEntryBtn = document.getElementById("add-entry-btn");
const calculateBtn = document.getElementById("calculate-btn");
const historyList = document.getElementById("history-list");
const resultBox = document.getElementById("result");
const userWeightInput = document.getElementById("user-weight");
const goalInput = document.getElementById("calorie-goal");
const setGoalBtn = document.getElementById("set-goal-btn");
const goalStatus = document.getElementById("goal-status");
const csvBtn = document.getElementById("download-csv");
const chartCanvas = document.getElementById("comparisonChart");

let currentUID = null;
let chart = null;

// ---------- CATEGORIES (provided by user) ----------
const CATEGORIES = {
  "ウォーキング": { "時速4km（ゆっくり）": 3.5, "時速6km（やや速め）": 4.5 },
  "ランニング": { "時速8km程度": 7.0, "時速10km": 10.0, "時速12km": 12.5, "時速14km以上": 14.0 },
  "サイクリング": { "ゆっくり（時速15km未満）": 4.5, "普通（時速15〜20km）": 6.0, "速い（時速20〜25km）": 9.0 },
  "筋トレ（自重）": {
    "腕立て伏せ": 5.0, "スクワット": 5.0, "ランジ": 6.0, "プランク": 3.5,
    "クランチ（腹筋）": 5.0, "レッグレイズ": 4.0, "サイドプランク": 3.5,
    "ヒップリフト": 4.0
  },
  "ストレッチ・軽運動": {
    "ラジオ体操第一": 4.0, "軽いストレッチ": 2.0, "壁腕立て": 2.0,
    "足踏み": 2.0
  },
  "その他運動": {
    "バーピージャンプ": 10.0, "マウンテンクライマー": 8.0,
    "ジャンピングジャック": 8.0, "ハイニー（もも上げ）": 7.0,
    "ニートゥチェスト": 5.0, "ステップ昇降": 6.0,
    "カーフレイズ": 3.0, "クライマーもどき": 5.0
  },
  "水泳": {
    "平泳ぎ": 8.0, "背泳ぎ": 8.0, "クロール（中強度）": 10.0,
    "クロール（高速）": 12.0, "バタフライ": 13.0
  }
};

// ---------- ヘルパー関数 ----------
const DEFAULT_WEIGHT = 60;

function createCategorySelect() {
  const sel = document.createElement("select");
  sel.className = "form-control category-select mb-2";
  const options = ['<option value="" disabled selected>運動カテゴリーを選択</option>']
    .concat(Object.keys(CATEGORIES).map(cat => `<option value="${cat}">${cat}</option>`))
    .join("");
  sel.innerHTML = options;
  return sel;
}

function createActivitySelect(disabled = true) {
  const sel = document.createElement("select");
  sel.className = "form-control activity-select mb-2";
  sel.disabled = disabled;
  sel.innerHTML = `<option value="" disabled selected>運動を選択</option>`;
  return sel;
}

function createDurationInput() {
  const inp = document.createElement("input");
  inp.type = "number";
  inp.min = "0";
  inp.className = "form-control duration-input mb-2";
  inp.placeholder = "運動時間（分）";
  return inp;
}

function createKcalDisplay() {
  const d = document.createElement("div");
  d.className = "kcal-result";
  return d;
}

function populateActivityOptions(category, activitySelect) {
  const items = CATEGORIES[category];
  activitySelect.innerHTML = `<option value="" disabled selected>運動を選択</option>` +
    Object.entries(items).map(([name]) => `<option value="${name}">${name}</option>`).join("");
  activitySelect.disabled = false;
}

function calcSingleKcal(met, weight, minutes) {
  return met * weight * (minutes / 60);
}

// ---------- エントリ生成 ----------
function addEntry(initialCategory = "", initialActivity = "", initialMinutes = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "entry-group";

  const categorySelect = createCategorySelect();
  const activitySelect = createActivitySelect(!initialCategory);
  const durationInput = createDurationInput();
  const kcalDisplay = createKcalDisplay();
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-sm btn-danger mt-2";
  deleteBtn.textContent = "削除";

  // set initial values if provided
  if (initialCategory) {
    categorySelect.value = initialCategory;
    populateActivityOptions(initialCategory, activitySelect);
  }
  if (initialActivity) {
    activitySelect.value = initialActivity;
  }
  if (initialMinutes) {
    durationInput.value = initialMinutes;
  }

  // イベント - カテゴリ変更で活動を更新
  categorySelect.addEventListener("change", () => {
    const cat = categorySelect.value;
    populateActivityOptions(cat, activitySelect);
    kcalDisplay.textContent = "";
  });

  // イベント - 活動 or duration 変更で kcal 表示更新
  const updateKcal = () => {
    const cat = categorySelect.value;
    const act = activitySelect.value;
    const minutes = parseFloat(durationInput.value);
    const weight = parseFloat(userWeightInput.value) || DEFAULT_WEIGHT;
    if (cat && act && !isNaN(minutes) && minutes > 0) {
      const met = CATEGORIES[cat][act];
      const kcal = calcSingleKcal(met, weight, minutes);
      kcalDisplay.textContent = `この運動の消費カロリー：約 ${kcal.toFixed(1)} kcal`;
    } else {
      kcalDisplay.textContent = "";
    }
  };

  activitySelect.addEventListener("change", updateKcal);
  durationInput.addEventListener("input", updateKcal);
  userWeightInput.addEventListener("input", updateKcal);

  deleteBtn.addEventListener("click", () => {
    wrapper.remove();
    // 最低1つは残す
    if (entriesDiv.querySelectorAll(".entry-group").length === 0) addEntry();
  });

  // DOM 組み立て
  wrapper.appendChild(categorySelect);
  wrapper.appendChild(activitySelect);
  wrapper.appendChild(durationInput);
  wrapper.appendChild(kcalDisplay);
  wrapper.appendChild(deleteBtn);
  entriesDiv.appendChild(wrapper);

  return wrapper;
}

// 最低1つのエントリを初期表示
addEntry();

// 追加ボタン
if (addEntryBtn) addEntryBtn.addEventListener("click", () => addEntry());

// ---------- 計算・保存 ----------
async function calculateAndSave() {
  const groups = Array.from(entriesDiv.querySelectorAll(".entry-group"));
  const weight = parseFloat(userWeightInput.value) || DEFAULT_WEIGHT;
  let total = 0;
  const activities = [];

  for (const g of groups) {
    const cat = g.querySelector(".category-select")?.value;
    const act = g.querySelector(".activity-select")?.value;
    const minutes = parseFloat(g.querySelector(".duration-input")?.value);
    if (!cat || !act || isNaN(minutes) || minutes <= 0) continue;
    const met = CATEGORIES[cat][act];
    const kcal = calcSingleKcal(met, weight, minutes);
    total += kcal;
    activities.push({ category: cat, type: act, time_min: minutes, kcal: Math.round(kcal) });
  }

  resultBox.style.display = "block";
  resultBox.textContent = `合計消費カロリー：${Math.round(total)} kcal`;

  // 保存（currentUID がない場合は保存せず、ユーザーに促す）
  if (!currentUID) {
    alert("履歴を保存するにはログインしてください（別ページでログイン済みならページを再読み込みしてください）。");
    return;
  }

  const now = new Date();
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timestamp = now.getTime();

  const record = {
    userId: currentUID,
    date,
    timestamp,
    activities,
    total: Math.round(total),
    isWeekend: (now.getDay() === 0 || now.getDay() === 6) ? 1 : 0 // 1 = weekend, 0 = weekday
  };

  const recRef = push(ref(db, `calorieRecords/${currentUID}`));
  await set(recRef, record);

  // 更新後、履歴を再読み込み（onValue でもリアルタイム更新されますが読み込みを促す）
  // (loadHistory は onAuthStateChanged による自動更新で反映されます)
  // ここではグラフを更新
  updateChart();
}

// 計算ボタン
if (calculateBtn) calculateBtn.addEventListener("click", calculateAndSave);

// ---------- 履歴読み込み ----------
function loadHistory() {
  if (!currentUID) {
    historyList.innerHTML = `<li class="list-group-item">ログインしてください（履歴は表示されません）。</li>`;
    return;
  }
  const dbRef = ref(db, `calorieRecords/${currentUID}`);
  // リアルタイムで取得
  onValue(dbRef, snapshot => {
    historyList.innerHTML = "";
    const val = snapshot.val();
    if (!val) return;

    // オブジェクト -> 配列に変換して日付（timestamp）降順でソート
    const records = Object.entries(val).map(([key, v]) => ({ key, ...v }));
    records.sort((a, b) => b.timestamp - a.timestamp);

    for (const rec of records) {
      const li = document.createElement("li");
      li.className = "list-group-item";

      // 日付表示を短めに（例: 2025-10-22 09:12）
      const d = new Date(rec.timestamp);
      const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;

      // 合計表示と活動内訳（簡易）
      const activitiesText = rec.activities?.map(a => `${a.type}(${a.time_min}m=${a.kcal}kcal)`).join(" / ") || "";
      li.innerHTML = `<div><strong>${dateStr}</strong> — ${rec.total} kcal</div><div class="small text-muted">${activitiesText}</div>`;

      // 削除ボタン
      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-sm btn-outline-danger float-right";
      delBtn.textContent = "削除";
      delBtn.addEventListener("click", async () => {
        if (!confirm("この記録を削除しますか？")) return;
        await remove(ref(db, `calorieRecords/${currentUID}/${rec.key}`));
      });

      li.appendChild(delBtn);
      historyList.appendChild(li);
    }

    // グラフ更新
    updateChart();
  });
}

// ---------- 目標設定（ローカルストレージで制限） ----------
setGoalBtn?.addEventListener("click", () => {
  const newGoal = parseFloat(goalInput.value);
  if (!newGoal || newGoal <= 0) {
    alert("有効なカロリー数を入力してください。");
    return;
  }
  const lastSet = localStorage.getItem("goalSetDate");
  const now = new Date();
  if (lastSet) {
    const diffDays = (now - new Date(lastSet)) / (1000 * 60 * 60 * 24);
    if (diffDays < 7) {
      goalStatus.textContent = `※ 目標はあと${Math.ceil(7 - diffDays)}日間変更できません。`;
      return;
    }
  }
  localStorage.setItem("calorieGoal", newGoal);
  localStorage.setItem("goalSetDate", now.toISOString());
  goalStatus.textContent = `目標カロリー（${newGoal} kcal）を設定しました。`;
  updateChart();
});

// ---------- Chart 更新（目標 vs 今日） ----------
function updateChart() {
  if (!chartCanvas) return;
  const goal = parseFloat(localStorage.getItem("calorieGoal")) || 0;

  // 合計実績を今日のレコードから計算
  if (!currentUID) {
    chartCanvas.style.display = "none";
    return;
  }

  const dbRef = ref(db, `calorieRecords/${currentUID}`);
  onValue(dbRef, snapshot => {
    const val = snapshot.val();
    let todayTotal = 0;
    if (val) {
      const today = new Date().toISOString().slice(0,10);
      Object.values(val).forEach(r => {
        if (r.date === today) todayTotal += (r.total || 0);
      });
    }

    // Chart.js 表示
    chartCanvas.style.display = "block";
    const labels = ["Goal", "Today"];
    const data = [goal, Math.round(todayTotal)];

    if (chart) {
      chart.data.datasets[0].data = data;
      chart.update();
    } else {
      chart = new Chart(chartCanvas.getContext("2d"), {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "kcal",
            data,
            backgroundColor: ["#cccccc", "#4caf50"]
          }]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  }, { onlyOnce: false });
}

// ---------- CSV ダウンロード（英語ヘッダー・BOM付き） ----------
csvBtn?.addEventListener("click", async () => {
  if (!currentUID) {
    alert("CSVをダウンロードするにはログインしてください（別タブでログイン済みならページを再読み込みしてください）。");
    return;
  }
  const snapRef = ref(db, `calorieRecords/${currentUID}`);
  onValue(snapRef, snapshot => {
    const val = snapshot.val();
    if (!val) return alert("データがありません");

    const rows = [["userId","date","category","type","time_min","calories","isWeekend"]];
    Object.values(val).forEach(rec => {
      (rec.activities || []).forEach(act => {
        rows.push([
          rec.userId || currentUID,
          rec.date || "",
          act.category || "",
          act.type || act.name || "",
          String(act.time_min || ""),
          String(act.kcal || ""),
          rec.isWeekend ? "Yes" : "No"
        ]);
      });
    });

    const bom = "\uFEFF";
    const csv = rows.map(r => r.map(cell => {
      // カンマや改行を含む可能性があるセルはダブルクオートで囲む
      const s = String(cell).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(",")).join("\r\n");

    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "calorie_history.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, { onlyOnce: true });
});

// ---------- 認証状態の監視 ----------
onAuthStateChanged(auth, user => {
  if (user) {
    currentUID = user.uid;
    // 履歴を読み込む
    loadHistory();
    // グラフ更新
    updateChart();
  } else {
    currentUID = null;
    // 履歴表示を促す
    historyList.innerHTML = `<li class="list-group-item">ログインしてください（履歴は表示されません）。</li>`;
    chartCanvas.style.display = "none";
  }
});

// ページ読み込み時に、既に auth.currentUser が存在すれば処理
if (auth.currentUser) {
  currentUID = auth.currentUser.uid;
  loadHistory();
  updateChart();
}
