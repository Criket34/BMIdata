// Firebase初期化
const firebaseConfig = {
  apiKey: "AIzaSyAqrTNSA-E-fq_63oS3cNjgeC7WYr3l-bQ",
  authDomain: "bmi-app-a99f3.firebaseapp.com",
  projectId: "bmi-app-a99f3",
  databaseURL: "https://bmi-app-a99f3-default-rtdb.firebaseio.com"
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();

auth.onAuthStateChanged(user => {
  if (!user) {
    alert("ログインしていません。ログインページに戻ります。");
    window.location.href = "index.html";
  } else {
    // ボタンIDを修正（record-btn → record-sleep-btn）
    document.getElementById("record-sleep-btn").addEventListener("click", () => {
      const start = document.getElementById("sleep-start").value;
      const end = document.getElementById("sleep-end").value;

      if (!start || !end) {
        alert("時刻を両方入力してください。");
        return;
      }

      const duration = calculateDuration(start, end);
      const entry = {
        date: new Date().toISOString().split("T")[0],
        sleepStart: start,
        sleepEnd: end,
        duration: duration
      };

      db.ref(`sleep_history/${user.uid}`).push(entry).then(() => {
        loadSleepHistory(user.uid);
        showSleepResult(duration);
      });
    });

    // ダウンロードボタン
    const downloadBtn = document.getElementById("download-btn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => {
        downloadTextFile(exportText);
      });
    }

    loadSleepHistory(user.uid);
  }
});

function calculateDuration(start, end) {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  let startMin = startH * 60 + startM;
  let endMin = endH * 60 + endM;
  if (endMin <= startMin) endMin += 24 * 60;

  return ((endMin - startMin) / 60).toFixed(1);
}

let exportText = "";

function loadSleepHistory(uid) {
  const ref = db.ref(`sleep_history/${uid}`);
  ref.once("value").then(snapshot => {
    const list = document.getElementById("sleep-history");
    list.innerHTML = "";
    exportText = "";
    const data = snapshot.val();
    if (!data) return;

    const entries = Object.values(data).sort((a, b) => new Date(b.date) - new Date(a.date));

    entries.forEach(entry => {
      const line = `${entry.date}：${entry.sleepStart}～${entry.sleepEnd}（${entry.duration}時間）`;
      const li = document.createElement("li");
      li.className = "list-group-item";
      li.textContent = line;
      list.appendChild(li);
      exportText += line + "\n";
    });
  });
}

// コメント表示
function showSleepResult(duration) {
  const resultBox = document.getElementById("result-box");
  const resultText = document.getElementById("sleep-result");
  const commentText = document.getElementById("sleep-comment");

  resultBox.style.display = "block";
  resultText.textContent = `睡眠時間：${duration} 時間`;

  let comment = "";
  const dur = parseFloat(duration);
  if (dur < 4) {
    comment = "睡眠時間が非常に短いです。体調に注意してください。";
  } else if (dur < 6) {
    comment = "やや短めの睡眠です。もう少し眠れると理想的です。";
  } else if (dur <= 8) {
    comment = "理想的な睡眠時間です。よく休めていますね！";
  } else if (dur <= 10) {
    comment = "長めの睡眠です。疲労回復には良いですが寝すぎには注意。";
  } else {
    comment = "かなり長い睡眠時間です。昼夜逆転や過眠に注意しましょう。";
  }

  commentText.textContent = comment;
}

function downloadTextFile(content) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sleep-history.txt";
  a.click();
  URL.revokeObjectURL(url);
}