// Firebase 初期化（設定は自分のプロジェクトに合わせて調整）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, push, onValue, remove, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAqrTNSA-E-fq_63oS3cNjgeC7WYr3l-bQ",
  authDomain: "bmi-app-a99f3.firebaseapp.com",
  databaseURL: "https://bmi-app-a99f3-default-rtdb.firebaseio.com",
  projectId: "bmi-app-a99f3",
  storageBucket: "bmi-app-a99f3.appspot.com",
  messagingSenderId: "1067116934038",
  appId: "1:1067116934038:web:dc18293f708f30a7f0536a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getDatabase(app);

let currentUid = null;
let deletedEntry = null;

onAuthStateChanged(auth, user => {
  if (user) {
    currentUid = user.uid;
    loadHistory();
  } else {
    alert("ログインしてください。");
  }
});

document.getElementById("recordBtn").addEventListener("click", () => {
  const sleepTime = document.getElementById("sleepTime").value;
  const wakeTime = document.getElementById("wakeTime").value;
  const quality = parseInt(document.querySelector('input[name="quality"]:checked')?.value || 0);
  const isWeekend = document.getElementById("isWeekend").checked;

  if (!sleepTime || !wakeTime || quality === 0) {
    alert("全ての項目を入力してください。");
    return;
  }

  const date = new Date().toISOString().split("T")[0];
  const sleepDate = new Date(`${date}T${sleepTime}`);
  const wakeDate = new Date(`${date}T${wakeTime}`);
  if (wakeDate <= sleepDate) wakeDate.setDate(wakeDate.getDate() + 1);

  const diffMs = wakeDate - sleepDate;
  const sleepMinutes = Math.round(diffMs / (1000 * 60));
  const chronotype = getChronotype(sleepTime, wakeTime);
  const comment = generateComment(sleepMinutes);

  document.getElementById("result").innerHTML = `
    <p>睡眠時間: ${sleepMinutes} 分</p>
    <p>クロノタイプ: ${chronotype}</p>
    <p>コメント: ${comment}</p>
  `;

  const record = {
    date,
    sleepTime,
    wakeTime,
    sleepMinutes,
    quality,
    isWeekend,
    chronotype,
    comment,
    timestamp: Date.now()
  };

  const userRef = ref(db, `sleep_history/${currentUid}`);
  push(userRef, record);
});

function getChronotype(sleep, wake) {
  const [sH, sM] = sleep.split(":").map(Number);
  const [wH, wM] = wake.split(":").map(Number);
  const sleepTotal = sH * 60 + sM;
  const wakeTotal = wH * 60 + wM;
  const midpoint = ((wakeTotal < sleepTotal ? wakeTotal + 1440 : wakeTotal) + sleepTotal) / 2 % 1440;

  if (midpoint < 270) return "超朝型";
  if (midpoint < 330) return "朝型";
  if (midpoint < 390) return "中間型";
  if (midpoint < 450) return "夜型";
  return "超夜型";
}

function generateComment(min) {
  if (min < 360) return "睡眠時間が短いです。";
  if (min < 420) return "やや短い睡眠です。";
  if (min < 540) return "十分な睡眠がとれています。";
  return "寝すぎかもしれません。";
}

function loadHistory() {
  const userRef = ref(db, `sleep_history/${currentUid}`);
  onValue(userRef, snapshot => {
    const historyArea = document.getElementById("history");
    historyArea.innerHTML = "";
    const records = [];

    snapshot.forEach(child => {
      records.push({ key: child.key, ...child.val() });
    });

    records.sort((a, b) => b.timestamp - a.timestamp);
    const recent = records.slice(0, 30);

    const chronoCounts = {};
    recent.forEach(r => {
      const type = r.chronotype;
      chronoCounts[type] = (chronoCounts[type] || 0) + 1;
    });

    const mostCommon = Object.entries(chronoCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "データ不足";

    recent.forEach(r => {
      const div = document.createElement("div");
      div.innerHTML = `
        <p>${r.date} - 睡眠時間: ${r.sleepMinutes}分 / クロノタイプ: ${r.chronotype}</p>
        <button onclick="deleteRecord('${r.key}')">削除</button>
      `;
      historyArea.appendChild(div);
    });

    document.getElementById("commonChronotype").textContent = `直近30件の最頻クロノタイプ：${mostCommon}`;
  });
}

window.deleteRecord = function (key) {
  const refPath = ref(db, `sleep_history/${currentUid}/${key}`);
  onValue(refPath, snapshot => {
    deletedEntry = snapshot.val();
    deletedEntry._key = key;
  }, { onlyOnce: true });

  remove(refPath);
};

document.getElementById("undoBtn").addEventListener("click", () => {
  if (deletedEntry) {
    const { _key, ...rest } = deletedEntry;
    set(ref(db, `sleep_history/${currentUid}/${_key}`), rest);
    deletedEntry = null;
  } else {
    alert("Undoできる削除履歴がありません。");
  }
});

document.getElementById("downloadCSV").addEventListener("click", () => {
  const userRef = ref(db, `sleep_history/${currentUid}`);
  onValue(userRef, snapshot => {
    const records = [];
    snapshot.forEach(child => {
      records.push(child.val());
    });

    const headers = ["ID", "Date", "SleepTime", "WakeTime", "TST(min)", "SleepQuality", "IsWeekend"];
    const rows = records.map(r => [
      currentUid,
      r.date,
      r.sleepTime,
      r.wakeTime,
      r.sleepMinutes,
      r.quality,
      r.isWeekend ? "週末" : "平日"
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sleep_history.csv";
    a.click();
  }, { onlyOnce: true });
});
