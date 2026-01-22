import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase設定
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

// 匿名ログイン
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUID = user.uid;
    loadHistory();
  } else {
    signInAnonymously(auth);
  }
});

// ユーザーID保存
const userIdInput = document.getElementById("user-id");
userIdInput.value = localStorage.getItem("userId") || "";
userIdInput.addEventListener("input", () => {
  localStorage.setItem("userId", userIdInput.value);
});

// 記録ボタン
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

  const quality = parseInt(qualityRadio.value);
  const isWeekend = document.getElementById("isWeekend").checked;
  const userId = userIdInput.value || "unknown";

  const sleepDate = new Date(`${date}T${sleepTime}`);
  const wakeDate = new Date(`${date}T${wakeTime}`);
  if (wakeDate <= sleepDate) wakeDate.setDate(wakeDate.getDate() + 1);

  const durationMin = Math.round((wakeDate - sleepDate) / 60000);
  const chronotype = getChronotype(sleepDate);
  const { comment, score } = generateComment(durationMin, quality, sleepDate);

  displayResult(durationMin, chronotype, comment, score);

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
    score,
    timestamp: Date.now(),
  };

  const historyRef = ref(db, `sleep_history/${currentUID}`);
  push(historyRef, data);
});

// クロノタイプ判定
function getChronotype(sleepDate) {
  const hour = sleepDate.getHours();
  if (hour >= 5 && hour < 8) return "朝型";
  if (hour >= 8 && hour < 11) return "やや朝型";
  if (hour >= 11 && hour < 15) return "中間型";
  if (hour >= 15 && hour < 20) return "やや夜型";
  return "夜型";
}

// コメント生成
function generateComment(duration, quality, sleepDate) {
  let messages = [];
  let score = 0;
  const sleepHour = sleepDate.getHours();

  if (duration < 240) {
    messages.push("極端に短い睡眠です。体調に注意してください。");
  } else if (duration < 360) {
    messages.push("もう少し長く睡眠をとれると良いでしょう。");
    score += 1;
  } else if (duration <= 540) {
    messages.push("十分な睡眠時間が確保できています。");
    score += 2;
  } else {
    messages.push("やや長めの睡眠です。生活リズムに注意してください。");
    score += 1;
  }

  if (quality <= 1) {
    messages.push("睡眠の質が低いようです。");
  } else if (quality === 2) {
    messages.push("やや浅い眠りです。");
    score += 1;
  } else if (quality === 3) {
    messages.push("まずまず良い睡眠です。");
    score += 2;
  } else if (quality >= 4) {
    messages.push("理想的な睡眠です。");
    score += 3;
  }

// 就寝時間による評価
if (sleepHour >= 19 && sleepHour < 23) {
  messages.push("理想的な就寝時間です。生活リズムが整っています。");
  score += 3;
} else if (
  (sleepHour >= 23 && sleepHour < 24) ||
  (sleepHour >= 0 && sleepHour < 1)
) {
  messages.push("やや遅めの就寝時間です。可能であればもう少し早めましょう。");
  score += 1;
} else {
  messages.push("就寝時間が遅めです。生活リズムの見直しをおすすめします。");
}


  let summary = "";
  if (score <= 3) summary = "改善の余地あり。";
  else if (score <= 6) summary = "おおむね良好。";
  else summary = "とても良好！";

  messages.push(`【総評】${summary}`);

  return { comment: messages.join("\n"), score };
}

// 結果表示
function displayResult(duration, chronotype, comment, score) {
  document.getElementById("sleep-result").textContent =
    `睡眠時間: ${duration}分 / クロノタイプ: ${chronotype} / スコア: ${score}/8`;
  document.getElementById("sleep-comment").textContent = comment;
  document.getElementById("result").style.display = "block";
}

// 履歴表示（日付順 書き換え版）
function loadHistory() {
  const historyRef = ref(db, `sleep_history/${currentUID}`);
  onValue(historyRef, (snapshot) => {
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = "";
    const data = snapshot.val();
    if (!data) return;

    // ▼ 日付でソート（YYYY-MM-DD → 日付としてソート）
    const entries = Object.entries(data)
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))  // ★ 修正ポイント
      .slice(0, 30);

    for (const entry of entries) {
      const li = document.createElement("li");
      li.className = "list-group-item";
      li.dataset.date = entry.date;

      if (entry.score <= 3) li.style.backgroundColor = "#f8d7da";
      else if (entry.score <= 6) li.style.backgroundColor = "#fff3cd";
      else li.style.backgroundColor = "#d4edda";

      li.innerHTML = `
        <strong>${entry.date}</strong><br>
        就寝: ${entry.sleepTime} / 起床: ${entry.wakeTime}<br>
        時間: ${entry.durationMin}分 / クロノタイプ: ${entry.chronotype}<br>
        質: ${entry.quality} / 休日: ${entry.isWeekend ? "はい" : "いいえ"}
        <button class="btn btn-sm btn-danger float-right delete-btn">削除</button>
      `;

      li.querySelector(".delete-btn").addEventListener("click", () => {
        remove(ref(db, `sleep_history/${currentUID}/${entry.key}`));
        undoData = entry;
        document.getElementById("undo-box").classList.remove("d-none");
      });

      historyList.appendChild(li);
    }
  });
}

// CSVダウンロード（Excel文字化け対策）
document.getElementById("download-csv").addEventListener("click", async () => {
  const list = document.querySelectorAll("#history-list .list-group-item");
  if (!list.length) return alert("履歴がありません");

  const rows = [["ID", "Date", "SleepTime", "WakeTime", "TST(min)", "SleepQuality", "IsWeekend"]];

  list.forEach((li) => {
    let idRaw = document.getElementById("user-id").value || "unknown";
    let id = idRaw.replace(/[^\x00-\x7F]/g, ""); // 日本語を削除

    const date = li.dataset.date || "";
    const text = li.innerText;
    const sleepTime = text.match(/就寝: (\d{2}:\d{2})/)?.[1] || "";
    const wakeTime = text.match(/起床: (\d{2}:\d{2})/)?.[1] || "";
    const duration = text.match(/時間: (\d+)分/)?.[1] || "";
    const quality = text.match(/質: (\d)/)?.[1] || "";
    const isWeekend = text.includes("休日: はい") ? 1 : 0;

    rows.push([id, date, sleepTime, wakeTime, duration, quality, isWeekend]);
  });

  const utf8BOM = "\uFEFF";
  const csv = rows.map(r => r.join(",")).join("\r\n");
  const blob = new Blob([utf8BOM + csv], { type: "text/csv;charset=utf-8" });

  if (window.showSaveFilePicker) {
    try {
      const handle = await showSaveFilePicker({
        suggestedName: "sleep_data.csv",
        types: [{ description: "CSV file", accept: { "text/csv": [".csv"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      alert("CSVファイルを保存しました。");
    } catch (e) {
      console.warn("保存キャンセルまたは失敗:", e);
    }
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sleep_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
});

