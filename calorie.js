// calorie.js - Firebase v10 module version
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  set,
  remove
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

// ---------- DOM ----------
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
const dateInput = document.getElementById("record-date");

let currentUID = null;
let chart = null;
const DEFAULT_WEIGHT = 60;

// ---------- CATEGORIES & METs ----------
const CATEGORIES = {
  "ウォーキング": { "時速4km（ゆっくり）": 3.5, "時速6km（やや速め）": 4.5 },
  "ランニング": { "時速8km程度": 7.0, "時速10km": 10.0, "時速12km": 12.5, "時速14km以上": 14.0 },
  "サイクリング": { "ゆっくり（時速15km未満）": 4.5, "普通（時速15〜20km）": 6.0, "速い（時速20〜25km）": 9.0 },
  "筋トレ（自重）": { "腕立て伏せ": 5.0, "スクワット": 5.0, "ランジ": 6.0, "プランク": 3.5, "クランチ（腹筋）": 5.0, "レッグレイズ": 4.0, "サイドプランク": 3.5, "ヒップリフト": 4.0 },
  "ストレッチ・軽運動": { "ラジオ体操第一": 4.0, "軽いストレッチ": 2.0, "壁腕立て": 2.0, "足踏み": 2.0 },
  "その他運動": { "バーピージャンプ": 10.0, "マウンテンクライマー": 8.0, "ジャンピングジャック": 8.0, "ハイニー（もも上げ）": 7.0, "ニートゥチェスト": 5.0, "ステップ昇降": 6.0, "カーフレイズ": 3.0, "クライマーもどき": 5.0 },
  "水泳": { "平泳ぎ": 8.0, "背泳ぎ": 8.0, "クロール（中強度）": 10.0, "クロール（高速）": 12.0, "バタフライ": 13.0 }
};

// ---------- ヘルパー ----------
function createCategorySelect() {
  const sel = document.createElement("select");
  sel.className = "form-control category-select mb-2";
  const opts = ['<option value="" disabled selected>運動カテゴリ</option>']
    .concat(Object.keys(CATEGORIES).map(c => `<option value="${c}">${c}</option>`))
    .join("");
  sel.innerHTML = opts;
  return sel;
}

function createActivitySelect(disabled = true) {
  const sel = document.createElement("select");
  sel.className = "form-control activity-select mb-2";
  sel.disabled = disabled;
  sel.innerHTML = `<option value="" disabled selected>運動種類</option>`;
  return sel;
}

function createDurationInput() {
  const inp = document.createElement("input");
  inp.type = "number";
  inp.min = "0";
  inp.className = "form-control duration-input mb-2";
  inp.placeholder = "分";
  return inp;
}

function createKcalDisplay() {
  const d = document.createElement("div");
  d.className = "kcal-result";
  return d;
}

function populateActivityOptions(category, activitySelect) {
  const items = CATEGORIES[category];
  activitySelect.innerHTML = `<option value="" disabled selected>運動種類</option>` +
    Object.keys(items).map(name => `<option value="${name}">${name}</option>`).join("");
  activitySelect.disabled = false;
}

function calcKcal(met, weight, minutes) {
  return met * weight * (minutes / 60);
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- エントリ生成 ----------
function addEntry(initial = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "entry-group";

  const categorySelect = createCategorySelect();
  const activitySelect = createActivitySelect();
  const durationInput = createDurationInput();
  const kcalDisplay = createKcalDisplay();
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-sm btn-danger mt-2";
  deleteBtn.textContent = "削除";

  if (initial.category) {
    categorySelect.value = initial.category;
    populateActivityOptions(initial.category, activitySelect);
  }
  if (initial.activity) activitySelect.value = initial.activity;
  if (initial.minutes) durationInput.value = initial.minutes;

  categorySelect.addEventListener("change", () => {
    populateActivityOptions(categorySelect.value, activitySelect);
    kcalDisplay.textContent = "";
  });

  const updateKcal = () => {
    const cat = categorySelect.value;
    const act = activitySelect.value;
    const minutes = parseFloat(durationInput.value);
    const weight = parseFloat(userWeightInput.value) || DEFAULT_WEIGHT;
    if (cat && act && !isNaN(minutes) && minutes > 0) {
      const met = CATEGORIES[cat][act];
      const kcal = calcKcal(met, weight, minutes);
      kcalDisplay.textContent = `≈ ${kcal.toFixed(1)} kcal`;
    } else {
      kcalDisplay.textContent = "";
    }
  };

  activitySelect.addEventListener("change", updateKcal);
  durationInput.addEventListener("input", updateKcal);
  userWeightInput.addEventListener("input", updateKcal);

  deleteBtn.addEventListener("click", () => {
    wrapper.remove();
    if (entriesDiv.querySelectorAll(".entry-group").length === 0) addEntry();
  });

  wrapper.appendChild(categorySelect);
  wrapper.appendChild(activitySelect);
  wrapper.appendChild(durationInput);
  wrapper.appendChild(kcalDisplay);
  wrapper.appendChild(deleteBtn);
  entriesDiv.appendChild(wrapper);
  return wrapper;
}

addEntry();
addEntryBtn?.addEventListener("click", () => addEntry());

// ---------- 計算と保存 ----------
async function calculateAndSave() {
  const groups = Array.from(entriesDiv.querySelectorAll(".entry-group"));
  const weight = parseFloat(userWeightInput.value) || DEFAULT_WEIGHT;
  const dateValue = dateInput.value || todayISODate();
  let total = 0;
  const activities = [];

  for (const g of groups) {
    const cat = g.querySelector(".category-select")?.value;
    const act = g.querySelector(".activity-select")?.value;
    const minutes = parseFloat(g.querySelector(".duration-input")?.value);
    if (!cat || !act || isNaN(minutes) || minutes <= 0) continue;
    const met = CATEGORIES[cat][act];
    const kcal = calcKcal(met, weight, minutes);
    total += kcal;
    activities.push({
      category: cat,
      type: act,
      time_min: minutes,
      kcal: Math.round(kcal)
    });
  }

  resultBox.style.display = "block";
  resultBox.textContent = `消費カロリー合計: ${Math.round(total)} kcal (${dateValue})`;

  if (!currentUID) {
    alert("ログインしてください。");
    return;
  }

  const goalValue = parseFloat(localStorage.getItem("calorieGoal")) || 0;

  const now = new Date();
  const rec = {
    userId: currentUID,
    date: dateValue,
    timestamp: now.getTime(),
    activities,
    total: Math.round(total),
    goal: goalValue,
    isWeekend: (new Date(dateValue).getDay() === 0 || new Date(dateValue).getDay() === 6) ? 1 : 0
  };

  const r = push(ref(db, `calorieRecords/${currentUID}`));
  await set(r, rec);

  updateChartForDate(dateValue);
}

calculateBtn?.addEventListener("click", calculateAndSave);

// ---------- 履歴 ----------
function loadHistory() {
  if (!currentUID) {
    historyList.innerHTML = `<li class="list-group-item">ログインしてください。</li>`;
    chartCanvas.style.display = "none";
    return;
  }
  const dbRef = ref(db, `calorieRecords/${currentUID}`);
  onValue(dbRef, snapshot => {
    historyList.innerHTML = "";
    const val = snapshot.val();
    if (!val) return;

    const records = Object.entries(val).map(([key, v]) => ({ key, ...v }));
    records.sort((a, b) => b.timestamp - a.timestamp);

    for (const rec of records) {
      const li = document.createElement("li");
      li.className = "list-group-item";
      const d = new Date(rec.timestamp);
      const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      const activitiesText = (rec.activities || []).map(a => `${a.type}(${a.time_min}分=${a.kcal}kcal)`).join(" / ");

      li.innerHTML = `<div><strong>${rec.date}</strong> (${dateStr}) — ${rec.total} kcal</div>
      <div class="small text-muted">${activitiesText}</div>
      <div class="small">目標: ${rec.goal || 0} kcal</div>`;

      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-sm btn-outline-danger float-end";
      delBtn.textContent = "削除";
      delBtn.addEventListener("click", async () => {
        if (!confirm("この記録を削除しますか？")) return;
        await remove(ref(db, `calorieRecords/${currentUID}/${rec.key}`));
      });

      li.appendChild(delBtn);
      historyList.appendChild(li);
    }

    const currentDate = dateInput.value || todayISODate();
    updateChartForDate(currentDate);
  });
}

// ---------- 目標設定 ----------
setGoalBtn?.addEventListener("click", () => {
  const newGoal = parseFloat(goalInput.value);
  if (!newGoal || newGoal <= 0) {
    alert("有効な目標を入力してください。");
    return;
  }
  localStorage.setItem("calorieGoal", newGoal);
  goalStatus.textContent = `目標設定: ${newGoal} kcal`;
  const selDate = dateInput.value || todayISODate();
  updateChartForDate(selDate);
});

// ---------- Chart ----------
function updateChartForDate(targetDate) {
  if (!currentUID) {
    chartCanvas.style.display = "none";
    return;
  }
  const goal = parseFloat(localStorage.getItem("calorieGoal")) || 0;
  const dbRef = ref(db, `calorieRecords/${currentUID}`);
  onValue(dbRef, snapshot => {
    const val = snapshot.val();
    if (!val) {
      renderChart(goal, 0);
      return;
    }
    const recs = Object.values(val).filter(r => r.date === targetDate);
    if (recs.length === 0) {
      renderChart(goal, 0);
      return;
    }
    recs.sort((a, b) => b.timestamp - a.timestamp);
    const latest = recs[0];
    renderChart(goal, latest.total || 0);
  }, { onlyOnce: true });
}

function renderChart(goal, todayTotal) {
  chartCanvas.style.display = "block";
  const labels = ["目標", "今日"];
  const data = [goal, todayTotal];

  if (chart) {
    chart.data.datasets[0].data = data;
    chart.update();
    return;
  }

  chart = new Chart(chartCanvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "kcal", data, backgroundColor: ["#999", "#4caf50"] }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

// ---------- CSVダウンロード ----------
csvBtn?.addEventListener("click", () => {
  if (!currentUID) {
    alert("ログインしてください。");
    return;
  }
  const dbRef = ref(db, `calorieRecords/${currentUID}`);
  onValue(dbRef, snapshot => {
    const val = snapshot.val();
    if (!val) return alert("データがありません。");

    const rows = [["ユーザーID","日付","運動カテゴリ","運動種類","時間(分)","消費カロリー","週末"]];
    Object.values(val).forEach(rec => {
      (rec.activities || []).forEach(act => {
        rows.push([
          rec.userId || currentUID,
          rec.date || "",
          act.category || "",
          act.type || "",
          String(act.time_min || ""),
          String(act.kcal || ""),
          rec.isWeekend ? "はい" : "いいえ"
        ]);
      });
    });

    const bom = "\uFEFF";
    const csv = rows.map(r => r.map(cell => {
      const s = String(cell).replace(/"/g,'""');
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

// ---------- Auth ----------
onAuthStateChanged(auth, user => {
  if (user) {
    currentUID = user.uid;
    loadHistory();
  } else {
    currentUID = null;
    historyList.innerHTML = `<li class="list-group-item">ログインしてください。</li>`;
    chartCanvas.style.display = "none";
  }
});

// ---------- ページロード時 ----------
if (!dateInput.value) dateInput.value = todayISODate();
