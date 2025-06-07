// ...（Firebase初期化とauth処理は省略）

let lastDeleted = null; // Undo用に削除データを保持

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

      // list item
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";

      const span = document.createElement("span");
      span.textContent = line;
      li.appendChild(span);

      // 削除ボタン
      const delBtn = document.createElement("button");
      delBtn.textContent = "削除";
      delBtn.className = "btn btn-sm btn-danger";
      delBtn.addEventListener("click", () => {
        if (confirm("この記録を削除しますか？")) {
          // 削除前データ保存
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

      // クロノタイプ集計
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