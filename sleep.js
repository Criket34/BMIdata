// Firebase初期化
const firebaseConfig = {
  apiKey: "AIzaSyAqrTNSA-E-fq_63oS3cNjgeC7WYr3l-bQ",
  authDomain: "bmi-app-a99f3.firebaseapp.com",
  databaseURL: "https://bmi-app-a99f3-default-rtdb.firebaseio.com",
  projectId: "bmi-app-a99f3",
  storageBucket: "bmi-app-a99f3.appspot.com",
  messagingSenderId: "1018688729509",
  appId: "1:1018688729509:web:ea3d2e1f71741e8cb80549"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let exportText = ""; // テキスト出力用
let lastDeleted = null; // Undo用に削除データを保持

// ユーザー認証状態を監視し、履歴を読み込み
auth.onAuthStateChanged(user => {
  if (user) {
    loadSleepHistory(user.uid);
  } else {
    window.location.href = "index.html"; // ログインページにリダイレクト
  }
});

function loadSleepHistory(uid) {
  const ref = db.ref(`sleep_history/${uid}`);
  ref.once("value").then(snapshot => {
    const list = document.getElementById("sleep-history");
    const textOutput = document.getElementById("text-output");
    list.innerHTML = "";
    exportText = "";
    textOutput.textContent = "";

    const data = snapshot.val();
    if (!data) return;

    const entries = Object.entries(data)
      .sort((a, b) => new Date(b[1].date) - new Date(a[1].date))
      .slice(0, 30); // 直近30件

    const typeCounter = {};

    entries.forEach(([key, entry]) => {
      const line = `${entry.date}：${entry.sleepStart}～${entry.sleepEnd}（${entry.duration}時間）[${entry.chronotype}]`;

      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";

      const span = document.createElement("span");
      span.textContent = line;
      li.appendChild(span);

      const delBtn = document.createElement("button");
      delBtn.textContent = "削除";
      delBtn.className = "btn btn-sm btn-danger";
      delBtn.addEventListener("click", () => {
        if (confirm("この記録を削除しますか？")) {
          lastDeleted = { key, entry };
          db.ref(`sleep_history/${uid}/${key}`).remove().then(() => {
            loadSleepHistory(uid);
            showUndoButton(uid);
          });
        }
      });

      li.appendChild(delBtn);
      list.appendChild(li);

      exportText += line + "\n";

      const type = entry.chronotype;
      if (!typeCounter[type]) typeCounter[type] = 0;
      typeCounter[type]++;
    });

    textOutput.textContent = exportText;

    const mostFrequent = Object.entries(typeCounter).sort((a, b) => b[1] - a[1])[0];
    if (mostFrequent) {
      const freqBox = document.getElementById("frequent-type");
      freqBox.textContent = `直近30件で最も多いクロノタイプ：${mostFrequent[0]}（${mostFrequent[1]}回）`;
    }
  });
}

function showUndoButton(uid) {
  const undoBox = document.getElementById("undo-box");
  undoBox.innerHTML = "";

  const undoBtn = document.createElement("button");
  undoBtn.textContent = "削除を取り消す";
  undoBtn.className = "btn btn-warning mt-2";
  undoBtn.addEventListener("click", () => {
    if (lastDeleted) {
      const { key, entry } = lastDeleted;
      db.ref(`sleep_history/${uid}/${key}`).set(entry).then(() => {
        lastDeleted = null;
        undoBox.innerHTML = "";
        loadSleepHistory(uid);
      });
    }
  });

  undoBox.appendChild(undoBtn);
}

// 「記録する」ボタンのイベントリスナー
document.addEventListener("DOMContentLoaded", () => {
  const recordBtn = document.getElementById("record-btn");
  const sleepStartInput = document.getElementById("sleep-start");
  const sleepEndInput = document.getElementById("sleep-end");
  const resultBox = document.getElementById("result-box");
  const sleepResult = document.getElementById("sleep-result");
  const sleepComment = document.getElementById("sleep-comment");

  recordBtn.addEventListener("click", () => {
    const sleepStart = sleepStartInput.value;
    const sleepEnd = sleepEndInput.value;

    if (!sleepStart || !sleepEnd) {
      alert("就寝時刻と起床時刻を入力してください。");
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    // 時間計算
    const [sh, sm] = sleepStart.split(":").map(Number);
    const [eh, em] = sleepEnd.split(":").map(Number);

    const start = new Date(now);
    start.setHours(sh, sm, 0, 0);

    const end = new Date(now);
    end.setHours(eh, em, 0, 0);
    if (end <= start) end.setDate(end.getDate() + 1); // 翌日

    const durationMs = end - start;
    const duration = (durationMs / (1000 * 60 * 60)).toFixed(2);

    // クロノタイプ判定
    let chronotype = "";
    if (sh < 22) {
      chronotype = "朝型";
    } else if (sh < 1) {
      chronotype = "中間型";
    } else {
      chronotype = "夜型";
    }

    // コメント生成
    let comment = "";
    const h = parseInt(duration);
    if (h < 5) {
      comment = "睡眠時間が非常に短いです。健康に注意してください。";
    } else if (h < 6.5) {
      comment = "やや短めの睡眠です。できるだけ早めに寝ましょう。";
    } else if (h <= 8) {
      comment = "適切な睡眠時間です。";
    } else {
      comment = "長めの睡眠です。生活リズムを意識しましょう。";
    }

    if (sh >= 3 || sh < 5) {
      comment += " 就寝時刻が遅すぎます。生活習慣が乱れている可能性があります。";
    }

    // 表示
    sleepResult.textContent = `睡眠時間：${duration} 時間`;
    sleepComment.textContent = `クロノタイプ：${chronotype}。${comment}`;
    resultBox.style.display = "block";

    // Firebaseに保存
    const user = auth.currentUser;
    if (user) {
      const newRef = db.ref(`sleep_history/${user.uid}`).push();
      newRef.set({
        date: dateStr,
        sleepStart,
        sleepEnd,
        duration,
        chronotype
      }).then(() => {
        loadSleepHistory(user.uid);
      });
    }
  });
});