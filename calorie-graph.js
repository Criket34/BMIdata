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

  const historyRef = ref(db, `calorie_history/${currentUID}`);

  onValue(historyRef, (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      alert("消費カロリー履歴がありません。");
      return;
    }

    // 最新順でソート → 30件に制限
    const entries = Object.entries(data)
      .map(([key, value]) => ({ key, ...value, dateObj: new Date(value.date) }))
      .sort((a, b) => b.dateObj - a.dateObj)
      .slice(0, 30);

    drawCalorieChart(entries);
  });
}

// ======================
// グラフ描画
// ======================
let calorieChart = null;

function drawCalorieChart(entries) {
  const ctx = document.getElementById("calorieChart").getContext("2d");

  // 古い順に並べ替え（見やすい）
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));

  const labels = sorted.map(e => e.date);
  const actualCalories = sorted.map(e => e.totalCalories ?? 0);
  const goalCalories = sorted.map(e => e.goalCalories ?? 0);

  if (calorieChart) calorieChart.destroy();

  calorieChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "実際の消費カロリー (kcal)",
          data: actualCalories,
        },
        {
          label: "目標消費カロリー (kcal)",
          data: goalCalories,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "目標 vs 実際の消費カロリー（30件）"
        },
        tooltip: {
          mode: "index",
          intersect: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "kcal" }
        }
      }
    }
  });
}
