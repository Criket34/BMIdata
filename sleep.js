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
    document.getElementById("record-btn").addEventListener("click", () => {
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
      });
    });

    loadSleepHistory(user.uid);
  }
});

// 睡眠時間の計算（翌日またぎ対応）
function calculateDuration(start, end) {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  let startMin = startH * 60 + startM;
  let endMin = endH * 60 + endM;

  if (endMin <= startMin) endMin += 24 * 60; // 翌日またぎ

  return ((endMin - startMin) / 60).toFixed(1);
}

// 履歴読み込み
function loadSleepHistory(uid) {
  const ref = db.ref(`sleep_history/${uid}`);
  ref.once("value").then(snapshot => {
    const list = document.getElementById("sleep-history");
    list.innerHTML = "";

    const data = snapshot.val();
    if (!data) return;

    const entries = Object.values(data).sort((a, b) => new Date(b.date) - new Date(a.date));

    entries.forEach(entry => {
      const li = document.createElement("li");
      li.className = "list-group-item";
      li.textContent = `${entry.date}：${entry.sleepStart}～${entry.sleepEnd}（${entry.duration}時間）`;
      list.appendChild(li);
    });
  });
}