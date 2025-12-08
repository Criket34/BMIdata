import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ======================
// Firebase 設定
// ======================
const firebaseConfig = {
  apiKey: "AIzaSyAqrTNSA-E-fq_63oS3cNjgeC7WYr3l-bQ",
  authDomain: "bmi-app-a99f3.firebaseapp.com",
  databaseURL: "https://bmi-app-a99f3-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

let currentUID = null;

// ======================
// 認証
// ======================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUID = user.uid;
    loadCalorieData();
  } else {
    signInAnonymously(auth);
  }
});

// ======================
// カロリー履歴の取得
// ======================
function loadCalorieData() {
  if (!currentUID) return;

  // 実際の保存場所に合わせて修正
  const historyRef = ref(db, `calorieRecords/${currentUID}`);

  onValue(historyRef, (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      document.getElementById("data-count").textContent = "データなし";
      return;
    }

    const entries = Object.entries(data)
      .map(([key, value]) => ({
        key,
        date: value.date,
        goal: value.goal ?? 0,
        total: value.total ?? 0,
        timestamp: value.timestamp ?? 0
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 30);

    document.getElementById("data-count").textContent =
      `読み込んだデータ数：${entries.length}件`;

    drawCalorieChart(entries);
  });
}

// ======================
// グラフ描画
// ======================
let calorieChart = null;

function drawCalorieChart(entries) {
  const ctx = document.getElementById("calorieChart").getContext("2d");

  // 古い順に並べ替え
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));

  const labels = sorted.map(e => e.date);
  const actualCalories = sorted.map(e => e.total);
  const goalCalories = sorted.map(e => e.goal);

  if (calorieChart) calorieChart.destroy();

  calorieChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "実際の消費カロリー (kcal)",
          data: actualCalories
        },
        {
          label: "目標消費カロリー (kcal)",
          data: goalCalories
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "目標 vs 実際の消費カロリー（最新30件）"
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "kcal"
          }
        }
      }
    }
  });
}
