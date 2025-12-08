// ============================================
// Firebase 設定ロード
// ============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  get,
  remove,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// あなたの Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyAqrTNSA-E-fq_63oS3cNjgeC7WYr3l-bQ",
  authDomain: "bmi-app-a99f3.firebaseapp.com",
  databaseURL: "https://bmi-app-a99f3-default-rtdb.firebaseio.com",
  projectId: "bmi-app-a99f3",
  storageBucket: "bmi-app-a99f3.appspot.com",
  messagingSenderId: "1098638759855",
  appId: "1:1098638759855:web:aaa",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

// ============================================
// HTML 要素
// ============================================
const userIdInput = document.getElementById("userId");
const weightInput = document.getElementById("weight");
const goalInput = document.getElementById("goal");
const dateInput = document.getElementById("date");
const addEntryBtn = document.getElementById("add-entry");
const entryContainer = document.getElementById("entry-container");
const calcBtn = document.getElementById("calc-btn");
const saveBtn = document.getElementById("save-btn");
const resultDiv = document.getElementById("result");
const historyDiv = document.getElementById("history-list");


// ============================================
// 運動項目テンプレ（MET）
// ============================================
const MET_TABLE = {
  "walking_slow": { name: "ウォーキング（ゆっくり）", met: 2.0 },
  "walking_normal": { name: "ウォーキング（普通）", met: 3.0 },
  "jogging": { name: "ジョギング", met: 7.0 },
  "running": { name: "ランニング", met: 10.0 },
  "bicycle": { name: "自転車（軽め）", met: 4.0 },
  "rope": { name: "なわとび", met: 8.0 }
};


// ============================================
// ページロード時の初期設定
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  // 今日の日付を自動設定
  dateInput.value = new Date().toISOString().slice(0, 10);

  // userId を localStorage から復元
  const savedUserId = localStorage.getItem("calorieUserId");
  if (savedUserId) userIdInput.value = savedUserId;

  // 入力変更で localStorage に保存
  userIdInput.addEventListener("input", () => {
    localStorage.setItem("calorieUserId", userIdInput.value);
  });

  // 最初の1件を追加
  addEntry();

  // 履歴読み込み
  loadHistory();
});


// ============================================
// 運動項目の追加
// ============================================
function addEntry(defaultValue = null) {
  const div = document.createElement("div");
  div.className = "entry-item";

  div.innerHTML = `
    <select class="form-control entry-type">
      ${Object.entries(MET_TABLE)
        .map(([key, v]) => `<option value="${key}">${v.name}</option>`)
        .join("")}
    </select>
    <input type="number" class="form-control entry-min" placeholder="分">
    <button class="btn btn-danger remove-entry">削除</button>
  `;

  entryContainer.appendChild(div);

  // 削除ボタン処理
  div.querySelector(".remove-entry").addEventListener("click", () => {
    div.remove();
  });

  // 値を初期設定したい場合（履歴復元時用）
  if (defaultValue) {
    div.querySelector(".entry-type").value = defaultValue.type;
    div.querySelector(".entry-min").value = defaultValue.min;
  }
}

addEntryBtn.addEventListener("click", () => addEntry());


// ============================================
// 消費カロリー計算
// ============================================
function calculateCalories() {
  const weight = parseFloat(weightInput.value);
  if (!weight) return null;

  const entries = Array.from(document.querySelectorAll(".entry-item")).map(div => {
    return {
      type: div.querySelector(".entry-type").value,
      min: parseFloat(div.querySelector(".entry-min").value) || 0
    }
  });

  let total = 0;

  entries.forEach(e => {
    const met = MET_TABLE[e.type].met;
    const kcal = (met * weight * e.min) / 60;
    total += kcal;
  });

  return { total, entries };
}


// ============================================
// 計算ボタン
// ============================================
calcBtn.addEventListener("click", () => {
  const result = calculateCalories();
  if (!result) return;

  resultDiv.innerHTML = `
    <h4>計算結果</h4>
    <p>合計：<strong>${result.total.toFixed(2)}</strong> kcal</p>
  `;
});


// ============================================
// 保存ボタン（重要：履歴に entries を保存）
// ============================================
saveBtn.addEventListener("click", () => {
  const uid = userIdInput.value;
  if (!uid) {
    alert("UserID を入力してください。");
    return;
  }

  const calc = calculateCalories();
  if (!calc) {
    alert("計算を先に実行してください。");
    return;
  }

  const rec = {
    userId: uid,
    date: dateInput.value,
    goal: parseFloat(goalInput.value) || 0,
    total: calc.total,
    entries: calc.entries,   // 🔥 ここが今回重要ポイント
    timestamp: Date.now()
  };

  const rootRef = ref(db, `calorieRecords`);
  const newRef = push(rootRef);

  set(newRef, rec)
    .then(() => {
      alert("保存しました！");
      loadHistory();
    })
    .catch(err => {
      console.error(err);
      alert("保存に失敗しました");
    });
});


// ============================================
// 履歴の読み込み
// ============================================
function loadHistory() {
  const uid = userIdInput.value;
  if (!uid) return;

  const rootRef = ref(db, "calorieRecords");

  onValue(rootRef, snapshot => {
    const data = snapshot.val() || {};
    const list = Object.entries(data)
      .filter(([key, v]) => v.userId === uid)
      .sort((a, b) => (a[1].timestamp > b[1].timestamp ? -1 : 1));

    historyDiv.innerHTML = "";

    if (list.length === 0) {
      historyDiv.innerHTML = "<p>履歴はまだありません。</p>";
      return;
    }

    list.forEach(([key, v]) => {
      const item = document.createElement("div");
      item.className = "history-item border p-2 mb-2";

      item.innerHTML = `
        <strong>${v.date}</strong><br>
        消費：${v.total.toFixed(2)} kcal
        <button class="btn btn-sm btn-info detail-btn" data-key="${key}">詳細</button>
        <button class="btn btn-sm btn-danger del-btn" data-key="${key}">削除</button>
      `;

      historyDiv.appendChild(item);
    });

    // 詳細ボタン
    document.querySelectorAll(".detail-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        const key = e.target.dataset.key;
        showDetail(key);
      });
    });

    // 削除ボタン
    document.querySelectorAll(".del-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        const key = e.target.dataset.key;
        remove(ref(db, `calorieRecords/${key}`));
      });
    });
  });
}


// ============================================
// 履歴の詳細表示（entries を表示）
// ============================================
function showDetail(key) {
  get(ref(db, `calorieRecords/${key}`)).then(snapshot => {
    const v = snapshot.val();
    if (!v) return;

    const list = v.entries
      .map(e => `${MET_TABLE[e.type].name}：${e.min}分`)
      .join("<br>");

    alert(
      `${v.date}\n\n合計：${v.total.toFixed(2)} kcal\n\n【内訳】\n${list}`
    );
  });
}
