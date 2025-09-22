import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase設定（完全な構成）
const firebaseConfig = {
  apiKey: "AIzaSyAqrTNSA-E-fq_63oS3cNjgeC7WYr3l-bQ",
  authDomain: "bmi-app-a99f3.firebaseapp.com",
  databaseURL: "https://bmi-app-a99f3-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

let currentUID = null;
let undoData = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUID = user.uid;
    loadHistory();
  } else {
    signInAnonymously(auth);
  }
});

// ユーザーID保存と読込
const userIdInput = document.getElementById("user-id");
userIdInput.value = localStorage.getItem("userId") || "";
userIdInput.addEventListener("input", () => {
  localStorage.setItem("userId", userIdInput.value);
});

document.getElementById("record-button").addEventListener("click", () => {
  const sleepTime = document.getElementById("sleepTime").value;
  const wakeTime = document.getElementById("wakeTime").value;
  const recordDate = document.getElementById("record-date")?.value;
  const date = recordDate || new Date().toISOString().split("T")[0];
  const qualityRadio = document.querySelector('input[name="quality"]:checked');

  if (!sleepTime || !wakeTime) {
    alert("就寝時刻と起床時刻を入力してください");
    return;
  }
  if (!qualityRadio) {
    alert("睡眠の質を選択してください。");
    return;
  }

  const quality = qualityRadio.value;
  const isWeekend = document.getElementById("isWeekend").checked;
  const userId = userIdInput.value || "unknown";

  const sleepDate = new Date(`${date}T${sleepTime}`);
  const wakeDate = new Date(`${date}T${wakeTime}`);
  if (wakeDate <= sleepDate) wakeDate.setDate(wakeDate.getDate() + 1);
  const durationMin = Math.round((wakeDate - sleepDate) / 60000);
  const chronotype = getChronotype(sleepDate);
  const comment = generateComment(durationMin, quality);
  displayResult(durationMin, chronotype, comment);

  const data = {
    userId,
    date,
    sleepTime,
    wakeTime,
    durationMin,
    chronotype,
    comment,
    quality,
    isWeekend,
    timestamp: Date.now(),
  };

  const historyRef = ref(db, `sleep_history/${currentUID}`);
  push(historyRef, data);
});

function getChronotype(sleepDate) {
  const hour = sleepDate.getHours();
  if (hour >= 5 && hour < 8) return "朝型";
  if (hour >= 8 && hour < 11) return "やや朝型";
  if (hour >= 11 && hour < 15) return "中間型";
  if (hour >= 15 && hour < 20) return "やや夜型";
  return "夜型";
}

function generateComment(duration, quality) {
  const q = parseInt(quality);
  if (duration < 240 || q <= 1) return "睡眠が不足しています。早めの就寝を心がけましょう。";
  if (duration >= 480 && q >= 3) return "質の良い睡眠が取れています。";
  return "睡眠の改善余地があります。";
}

function displayResult(duration, chronotype, comment) {
  document.getElementById("sleep-result").textContent = `睡眠時間: ${duration}分 / クロノタイプ: ${chronotype}`;
  document.getElementById("sleep-comment").textContent = comment;
  document.getElementById("result").style.display = "block";
}

function loadHistory() {
  const historyRef = ref(db, `sleep_history/${currentUID}`);
  onValue(historyRef, (snapshot) => {
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = "";
    const data = snapshot.val();
    if (!data) return;

    const entries = Object.entries(data)
      .map(([key, value]) => ({
        key,
        ...value,
        dateObj: new Date(value.date)
      }))
      // 日付の新しい順に並べ替え
      .sort((a, b) => b.dateObj - a.dateObj || b.timestamp - a.timestamp)
      .slice(0, 30);

    for (const entry of entries) {
      const li = document.createElement("li");
      li.className = "list-group-item";
      li.innerHTML = `
        <strong>${entry.date}</strong><br>
        就寝: ${entry.sleepTime} / 起床: ${entry.wakeTime}<br>
        時間: ${entry.durationMin}分 / クロノタイプ: ${entry.chronotype}<br>
        質: ${entry.quality} / 休日: ${entry.isWeekend ? "はい" : "いいえ"}
        <button class="btn btn-sm btn-danger float-right delete-btn">削除</button>
      `;
      li.querySelector(".delete-btn").addEventListener("click", () => {
        const entryRef = ref(db, `sleep_history/${currentUID}/${entry.key}`);
        remove(entryRef);
        undoData = entry;
        document.getElementById("undo-box").classList.remove("d-none");
      });
      historyList.appendChild(li);
    }

    updateMostCommonChronotype(entries);
  });
}

function updateMostCommonChronotype(entries) {
  const counts = {};
  for (const e of entries) {
    counts[e.chronotype] = (counts[e.chronotype] || 0) + 1;
  }
  const most = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const label = document.getElementById("most-common-chronotype");
  label.textContent = most ? `最も多いクロノタイプ: ${most[0]}` : "";
}

document.getElementById("undo-button").addEventListener("click", () => {
  if (!undoData || !currentUID) return;
  const refPath = ref(db, `sleep_history/${currentUID}`);
  const { key, ...data } = undoData;
  push(refPath, data);
  undoData = null;
  document.getElementById("undo-box").classList.add("d-none");
});

document.getElementById("download-csv").addEventListener("click", () => {
  const list = document.querySelectorAll("#history-list .list-group-item");
  if (!list.length) return;

  const rows = [["ID", "Date", "SleepTime", "WakeTime", "TST(min)", "SleepQuality", "IsWeekend"]];
  list.forEach((li) => {
    const text = li.innerText;
    const id = document.getElementById("user-id").value || "unknown";
    const date = text.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || "";
    const sleepTime = text.match(/就寝: (\d{2}:\d{2})/)?.[1] || "";
    const wakeTime = text.match(/起床: (\d{2}:\d{2})/)?.[1] || "";
    const duration = text.match(/時間: (\d+)分/)?.[1] || "";
    const quality = text.match(/質: (\d)/)?.[1] || "";
    const isWeekend = text.includes("休日: はい") ? "はい" : "いいえ";
    rows.push([id, date, sleepTime, wakeTime, duration, quality, isWeekend]);
  });

  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sleep_data.csv";
  a.click();
  URL.revokeObjectURL(url);
});
