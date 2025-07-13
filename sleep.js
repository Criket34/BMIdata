import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

function parseTimeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function loadHistory() {
  const historyRef = ref(db, `sleep_history/${currentUser.uid}`);
  onValue(historyRef, (snapshot) => {
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = "";
    const records = [];

    snapshot.forEach((childSnapshot) => {
      records.push({ key: childSnapshot.key, ...childSnapshot.val() });
    });

    records.reverse().slice(0, 30).forEach((record) => {
      const li = document.createElement("li");
      li.innerHTML = `
        ${record.date} - クロノタイプ: ${record.chronotype}, 睡眠時間: ${record.sleepDuration}分, 睡眠の質: ${record.sleepQuality}
        <button data-key="${record.key}">削除</button>
      `;
      historyList.appendChild(li);

      li.querySelector("button").addEventListener("click", () => {
        undoStack.push(record);
        remove(ref(db, `sleep_history/${currentUser.uid}/${record.key}`));
        loadHistory();
      });
    });

    // クロノタイプ統計
    const typeCounts = {};
    records.slice(0, 30).forEach((r) => {
      typeCounts[r.chronotype] = (typeCounts[r.chronotype] || 0) + 1;
    });

    const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("most-common-chronotype").textContent = mostCommonType
      ? `最も多いクロノタイプ：${mostCommonType[0]}（${mostCommonType[1]}回）`
      : "クロノタイプの統計はまだありません。";
  });
}

document.getElementById("record-button").addEventListener("click", () => {
  const sleepTime = document.getElementById("sleep-time").value;
  const wakeTime = document.getElementById("wake-time").value;
  const sleepQuality = document.querySelector("input[name='quality']:checked")?.value;
  const isWeekend = document.getElementById("weekend").checked;
  const userId = document.getElementById("user-id").value || "unknown";

  if (!sleepTime || !wakeTime || !sleepQuality) {
    alert("すべての項目を入力してください。");
    return;
  }

  const sleepMinutes = parseTimeToMinutes(sleepTime);
  const wakeMinutes = parseTimeToMinutes(wakeTime);
  let duration = wakeMinutes - sleepMinutes;
  if (duration <= 0) duration += 1440;

  const date = formatDate(new Date());
  const chronotype = getChronotype(parseTimeToMinutes(wakeTime) / 60);
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

  document.getElementById("result").innerHTML = `
    クロノタイプ：${chronotype}<br>
    睡眠時間：${duration}分<br>
    コメント：${comment}
  `;
});

document.getElementById("undo-button").addEventListener("click", () => {
  if (undoStack.length === 0) {
    alert("取り消す履歴がありません。");
    return;
  }

  const lastDeleted = undoStack.pop();
  push(ref(db, `sleep_history/${currentUser.uid}`), lastDeleted);
});

document.getElementById("download-csv").addEventListener("click", () => {
  const historyRef = ref(db, `sleep_history/${currentUser.uid}`);
  onValue(historyRef, (snapshot) => {
    const rows = [["ID", "Date", "SleepTime", "WakeTime", "TST(min)", "SleepQuality", "IsWeekend"]];
    snapshot.forEach((child) => {
      const v = child.val();
      rows.push([
        v.userId || "",
        v.date,
        v.sleepTime,
        v.wakeTime,
        v.sleepDuration,
        v.sleepQuality,
        v.isWeekend
      ]);
    });

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sleep_records.csv";
    link.click();
  }, { onlyOnce: true });
});

// ページ読み込み時にIDを復元
window.addEventListener("load", () => {
  const storedId = localStorage.getItem("userId");
  if (storedId) {
    document.getElementById("user-id").value = storedId;
  }
});
