import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAqrTNSA-E-fq_63oS3cNjgeC7WYr3l-bQ",
  authDomain: "bmi-app-a99f3.firebaseapp.com",
  databaseURL: "https://bmi-app-a99f3-default-rtdb.firebaseio.com",
  projectId: "bmi-app-a99f3",
  storageBucket: "bmi-app-a99f3.appspot.com",
  messagingSenderId: "147791535337",
  appId: "1:147791535337:web:9cb5cbfcddf72efb3c6aef"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
let currentUser;
let undoStack = [];

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadHistory();
  } else {
    alert("ログインが必要です。");
  }
});

function parseTimeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function getChronotype(hour) {
  if (hour >= 5 && hour < 8) return "朝型";
  if (hour >= 8 && hour < 11) return "やや朝型";
  if (hour >= 11 && hour < 14) return "やや夜型";
  return "夜型";
}

function getComment(tst) {
  if (tst >= 420) return "十分な睡眠がとれています。";
  if (tst >= 360) return "まあまあの睡眠時間です。";
  if (tst >= 300) return "少し睡眠不足気味です。";
  return "睡眠時間がかなり短いです。";
}

function loadHistory() {
  const historyRef = ref(db, `sleep_history/${currentUser.uid}`);
  onValue(historyRef, (snapshot) => {
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = "";
    const records = [];

    snapshot.forEach((child) => {
      records.push({ key: child.key, ...child.val() });
    });

    records.reverse().slice(0, 30).forEach((record) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `
        <span>${record.date} - クロノタイプ: ${record.chronotype}, 睡眠時間: ${record.sleepDuration}分, 睡眠の質: ${record.sleepQuality}</span>
        <button class="btn btn-sm btn-danger">削除</button>
      `;
      li.querySelector("button").addEventListener("click", () => {
        undoStack.push(record);
        remove(ref(db, `sleep_history/${currentUser.uid}/${record.key}`));
      });
      historyList.appendChild(li);
    });

    // クロノタイプ統計
    const typeCounts = {};
    records.slice(0, 30).forEach(r => {
      typeCounts[r.chronotype] = (typeCounts[r.chronotype] || 0) + 1;
    });
    const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("most-common-chronotype").textContent = mostCommonType
      ? `最も多いクロノタイプ：${mostCommonType[0]}（${mostCommonType[1]}回）`
      : "クロノタイプの統計はまだありません。";
  });
}

document.getElementById("record-button").addEventListener("click", () => {
  const sleepTime = document.getElementById("sleepTime").value;
  const wakeTime = document.getElementById("wakeTime").value;
  const sleepQuality = document.querySelector("input[name='quality']:checked")?.value;
  const isWeekend = document.getElementById("isWeekend").checked;
  const userId = document.getElementById("user-id").value.trim() || "unknown";

  if (!sleepTime || !wakeTime || !sleepQuality) {
    alert("すべての項目を入力してください。");
    return;
  }

  const sleepMin = parseTimeToMinutes(sleepTime);
  const wakeMin = parseTimeToMinutes(wakeTime);
  let duration = wakeMin - sleepMin;
  if (duration <= 0) duration += 1440;

  const date = formatDate(new Date());
  const chronotype = getChronotype(wakeMin / 60);
  const comment = getComment(duration);

  const record = {
    userId,
    date,
    sleepTime,
    wakeTime,
    sleepDuration: duration,
    chronotype,
    comment,
    sleepQuality,
    isWeekend: isWeekend ? "休日" : "平日"
  };

  push(ref(db, `sleep_history/${currentUser.uid}`), record);
  localStorage.setItem("userId", userId);

  document.getElementById("sleep-result").textContent = `クロノタイプ：${chronotype} / 睡眠時間：${duration}分`;
  document.getElementById("sleep-comment").textContent = comment;
  document.getElementById("result").style.display = "block";
});

document.getElementById("undo-button").addEventListener("click", () => {
  if (undoStack.length === 0) {
    alert("取り消す履歴がありません。");
    return;
  }
  const last = undoStack.pop();
  push(ref(db, `sleep_history/${currentUser.uid}`), last);
});

document.getElementById("download-csv").addEventListener("click", () => {
  const historyRef = ref(db, `sleep_history/${currentUser.uid}`);
  onValue(historyRef, (snapshot) => {
    const rows = [["ID", "Date", "SleepTime", "WakeTime", "TST(min)", "SleepQuality", "IsWeekend"]];
    snapshot.forEach((child) => {
      const v = child.val();
      rows.push([v.userId, v.date, v.sleepTime, v.wakeTime, v.sleepDuration, v.sleepQuality, v.isWeekend]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sleep_records.csv";
    a.click();
  }, { onlyOnce: true });
});

window.addEventListener("load", () => {
  const storedId = localStorage.getItem("userId");
  if (storedId) {
    document.getElementById("user-id").value = storedId;
  }
});
