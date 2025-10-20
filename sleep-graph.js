import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ==========================
// Firebase 設定
// ==========================
const firebaseConfig = {
  apiKey: "AIzaSyAqrTNSA-E-fq_63oS3cNjgeC7WYr3l-bQ",
  authDomain: "bmi-app-a99f3.firebaseapp.com",
  databaseURL: "https://bmi-app-a99f3-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

let currentUID = null;

// ==========================
// 認証処理
// ==========================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUID = user.uid;
    loadSleepData();
  } else {
    signInAnonymously(auth);
  }
});

// ==========================
// 履歴取得 + グラフ描画
// ==========================
function loadSleepData() {
  if (!currentUID) return;

  const historyRef = ref(db, `sleep_history/${currentUID}`);
  onValue(historyRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      alert("睡眠データが存在しません。");
      return;
    }

    const entries = Object.entries(data)
      .map(([key, value]) => ({ key, ...value, dateObj: new Date(value.date) }))
      .sort((a, b) => b.dateObj - a.dateObj || b.timestamp - a.timestamp)
      .slice(0, 30); // 最新30件

    drawSleepChart(entries);
  });
}

// ==========================
// グラフ描画
// ==========================
let sleepChart = null;

function drawSleepChart(entries) {
  const ctx = document.getElementById("sleepChart").getContext("2d");

  // 日付順に並べ替え（古い→新しい）
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const labels = sorted.map(e => e.date);
  const durations = sorted.map(e => e.durationMin);
  const sleepTimes = sorted.map(e => timeToDecimal(e.sleepTime));
  const wakeTimes = sorted.map(e => timeToDecimal(e.wakeTime));

  if (sleepChart) sleepChart.destroy();

  sleepChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          type: "bar",
          label: "睡眠時間（分）",
          data: durations,
          backgroundColor: "rgba(0,123,255,0.5)",
          borderColor: "rgba(0,123,255,1)",
          borderWidth: 1,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "就寝時刻",
          data: sleepTimes,
          borderColor: "orange",
          backgroundColor: "rgba(255,165,0,0.3)",
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0 // ✅ カーブを無効化
        },
        {
          type: "line",
          label: "起床時刻",
          data: wakeTimes,
          borderColor: "green",
          backgroundColor: "rgba(0,128,0,0.3)",
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0 // ✅ カーブを無効化
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { 
          display: true, 
          text: "睡眠時間と就寝・起床時刻の推移" 
        },
        tooltip: { mode: "index", intersect: false }
      },
      scales: {
        y: {
          type: "linear",
          position: "left",
          title: { display: true, text: "睡眠時間（分）" },
          beginAtZero: true
        },
        y1: {
          type: "linear",
          position: "right",
          title: { display: true, text: "時刻（時）" },
          min: 0,
          max: 24,
          ticks: { 
            stepSize: 2, 
            callback: v => `${Math.floor(v)}:00` 
          }
        }
      }
    }
  });
}

// ==========================
// 時刻（HH:MM）→小数時間に変換
// ==========================
function timeToDecimal(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}
