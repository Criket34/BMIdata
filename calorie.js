// Firebase v10 モジュール版
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyAqrTNSA-E-fq_63oS3cNjgeC7WYr3l-bQ",
  authDomain: "bmi-app-a99f3.firebaseapp.com",
  databaseURL: "https://bmi-app-a99f3-default-rtdb.firebaseio.com",
  projectId: "bmi-app-a99f3",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM
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

// ------------- 初期エントリーを必ず1つ表示 --------------
function addEntry(type = "", time = "") {
  const div = document.createElement("div");
  div.className = "entry-group";

  div.innerHTML = `
    <div class="form-group">
      <label>運動名</label>
      <input type="text" class="form-control activity-name" value="${type}">
    </div>

    <div class="form-group">
      <label>時間（分）</label>
      <input type="number" class="form-control activity-time" value="${time}">
    </div>
  `;

  entriesDiv.appendChild(div);
}

addEntry(); // ← 初期表示1つ

// 追加ボタン
addEntryBtn.addEventListener("click", () => addEntry());

// -------------- カロリー計算 --------------
function calculateCalories() {
  const weight = parseFloat(userWeightInput.value);
  if (!weight) {
    alert("体重を入力してください");
    return;
  }

  let totalKcal = 0;
  const activities = [];
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);

  document.querySelectorAll(".entry-group").forEach(group => {
    const name = group.querySelector(".activity-name").value;
    const time = parseFloat(group.querySelector(".activity-time").value);

    if (!name || !time) return;

    const met = 4.0; // 仮のMET値（後で拡張可能）

    const kcal = met * weight * (time / 60);
    totalKcal += kcal;

    activities.push({
      name,
      time,
      kcal: Math.round(kcal)
    });
  });

  resultBox.style.display = "block";
  resultBox.textContent = `本日の消費カロリー：${Math.round(totalKcal)} kcal`;

  saveRecord(dateKey, activities, totalKcal);
}

// クリックで計算
calculateBtn.addEventListener("click", calculateCalories);

// -------------- 履歴保存 --------------
function saveRecord(dateKey, activities, total) {
  const userId = "default_user"; // ログインを別で済ませている前提

  const data = {
    date: dateKey,
    activities,
    total,
    holiday: false // 日本語を使わない → Excel文字化け対策
  };

  const recordRef = push(ref(db, `calorie/${userId}`));
  set(recordRef, data);
}

// -------------- 履歴読み込み（新しい順） --------------
function loadHistory() {
  const userId = "default_user";
  const dbRef = ref(db, `calorie/${userId}`);

  onValue(dbRef, snapshot => {
    historyList.innerHTML = "";

    if (!snapshot.exists()) return;

    const records = Object.entries(snapshot.val());

    // 日付の降順に並べる
    records.sort((a, b) => (a[1].date < b[1].date ? 1 : -1));

    records.forEach(([key, record]) => {
      const li = document.createElement("li");
      li.className = "list-group-item";

      li.textContent = `${record.date}：${record.total} kcal`;

      historyList.appendChild(li);
    });
  });
}

loadHistory();

// -------------- 目標設定 --------------
setGoalBtn.addEventListener("click", () => {
  const goal = goalInput.value;
  if (!goal) return;

  goalStatus.textContent = `設定した目標：${goal} kcal`;
});

// -------------- CSV 出力 --------------
csvBtn.addEventListener("click", () => {
  const userId = "default_user";
  const dbRef = ref(db, `calorie/${userId}`);

  onValue(dbRef, snapshot => {
    if (!snapshot.exists()) {
      alert("データがありません");
      return;
    }

    const rows = [["Date", "Activity", "Time(min)", "Kcal", "Holiday"]];

    Object.values(snapshot.val()).forEach(record => {
      record.activities.forEach(act => {
        rows.push([
          record.date,
          act.name,
          act.time,
          act.kcal,
          record.holiday ? "Yes" : "No"
        ]);
      });
    });

    // CSVに変換
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "calorie_history.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, { onlyOnce: true });
});

