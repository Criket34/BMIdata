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
const db = firebase.database();
const auth = firebase.auth();
let currentUser;

document.addEventListener("DOMContentLoaded", () => {
  // DOM要素取得
  const entriesContainer = document.getElementById("entries");
  const addEntryBtn = document.getElementById("add-entry-btn");
  const calculateBtn = document.getElementById("calculate-btn");
  const resultBox = document.getElementById("result");
  const goalInput = document.getElementById("calorie-goal");
  const setGoalBtn = document.getElementById("set-goal-btn");
  const goalStatus = document.getElementById("goal-status");
  const chartCanvas = document.getElementById("comparisonChart");
  const weightInput = document.getElementById("user-weight");
  const historyList = document.getElementById("history-list");
  const loginBtn = document.getElementById("login-btn"); // may be null in your HTML

  // ★ logout-btn は完全削除したため取得しない ★

  const DEFAULT_WEIGHT = 60;

  // 運動カテゴリとMET値
  const CATEGORIES = {
    "ウォーキング": { "時速4km（ゆっくり）": 3.5, "時速6km（やや速め）": 4.5 },
    "ランニング": { "時速8km程度": 7.0, "時速10km": 10.0, "時速12km": 12.5, "時速14km以上": 14.0 },
    "サイクリング": { "ゆっくり（時速15km未満）": 4.5, "普通（時速15〜20km）": 6.0, "速い（時速20〜25km）": 9.0 },
    "筋トレ（自重）": {
      "腕立て伏せ": 5.0, "スクワット": 5.0, "ランジ": 6.0, "プランク": 3.5,
      "クランチ（腹筋）": 5.0, "レッグレイズ": 4.0, "サイドプランク": 3.5,
      "ヒップリフト": 4.0
    },
    "ストレッチ・軽運動": {
      "ラジオ体操第一": 4.0, "軽いストレッチ": 2.0, "壁腕立て": 2.0,
      "足踏み": 2.0
    },
    "その他運動": {
      "バーピージャンプ": 10.0, "マウンテンクライマー": 8.0,
      "ジャンピングジャック": 8.0, "ハイニー（もも上げ）": 7.0,
      "ニートゥチェスト": 5.0, "ステップ昇降": 6.0,
      "カーフレイズ": 3.0, "クライマーもどき": 5.0
    },
    "水泳": {
      "平泳ぎ": 8.0, "背泳ぎ": 8.0, "クロール（中強度）": 10.0,
      "クロール（高速）": 12.0, "バタフライ": 13.0
    }
  };

  let chart;

  // エントリ追加
  const createEntry = () => {
    const div = document.createElement("div");
    div.className = "entry-group";

    const categorySelect = document.createElement("select");
    categorySelect.className = "form-control mb-2";
    categorySelect.innerHTML = `<option disabled selected>運動カテゴリーを選択</option>` +
      Object.keys(CATEGORIES).map(cat => `<option value="${cat}">${cat}</option>`).join("");

    const activitySelect = document.createElement("select");
    activitySelect.className = "form-control mb-2";
    activitySelect.disabled = true;

    const durationInput = document.createElement("input");
    durationInput.type = "number";
    durationInput.placeholder = "運動時間（分）";
    durationInput.className = "form-control mb-2";

    const kcalDisplay = document.createElement("div");
    kcalDisplay.className = "kcal-result";

    categorySelect.addEventListener("change", () => {
      const selectedCategory = categorySelect.value;
      const activities = CATEGORIES[selectedCategory];
      activitySelect.innerHTML = `<option disabled selected>運動名を選択</option>` +
        Object.entries(activities).map(([name]) => `<option value="${name}">${name}</option>`).join("");
      activitySelect.disabled = false;
      kcalDisplay.textContent = "";
    });

    const updateKcalDisplay = () => {
      const category = categorySelect.value;
      const activity = activitySelect.value;
      const minutes = parseFloat(durationInput.value);
      const weight = parseFloat(weightInput.value) || DEFAULT_WEIGHT;
      if (category && activity && !isNaN(minutes) && minutes > 0) {
        const met = CATEGORIES[category][activity];
        const kcal = met * weight * minutes / 60;
        kcalDisplay.textContent = `この運動の消費カロリー：約 ${kcal.toFixed(1)} kcal`;
      } else {
        kcalDisplay.textContent = "";
      }
    };

    activitySelect.addEventListener("change", updateKcalDisplay);
    durationInput.addEventListener("input", updateKcalDisplay);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "削除";
    deleteBtn.className = "btn btn-sm btn-danger";
    deleteBtn.addEventListener("click", () => entriesContainer.removeChild(div));

    div.appendChild(categorySelect);
    div.appendChild(activitySelect);
    div.appendChild(durationInput);
    div.appendChild(kcalDisplay);
    div.appendChild(deleteBtn);
    entriesContainer.appendChild(div);
  };

  addEntryBtn.addEventListener("click", createEntry);

  // カロリー計算
  calculateBtn.addEventListener("click", async () => {
    const entries = entriesContainer.querySelectorAll(".entry-group");
    const weight = parseFloat(weightInput.value) || DEFAULT_WEIGHT;
    let totalCalories = 0;

    entries.forEach(entry => {
      const [categorySelect, activitySelect] = entry.querySelectorAll("select");
      const minutes = parseFloat(entry.querySelector("input").value);
      if (!categorySelect || !activitySelect || isNaN(minutes) || minutes <= 0) return;
      const met = CATEGORIES[categorySelect.value]?.[activitySelect.value];
      if (met) {
        totalCalories += met * weight * minutes / 60;
      }
    });

    resultBox.textContent = `合計消費カロリー：${totalCalories.toFixed(2)} kcal`;
    resultBox.style.display = "block";

    // 目標グラフ
    const goal = parseFloat(localStorage.getItem("calorieGoal")) || 0;
    if (goal > 0) {
      if (chart) chart.destroy();
      chartCanvas.style.display = "block";
      chart = new Chart(chartCanvas, {
        type: 'bar',
        data: {
          labels: ['目標', '本日'],
          datasets: [{
            label: 'kcal',
            backgroundColor: ['#ccc', '#4caf50'],
            data: [goal, totalCalories]
          }]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // 履歴保存
    const now = new Date();
    const entry = {
      kcal: totalCalories,
      timestamp: now.toISOString()
    };

    if (currentUser) {
      const newRef = db.ref(`calorieRecords/${currentUser.uid}`).push();
      newRef.set(entry);
      addHistoryItem(newRef.key, now.toLocaleString(), totalCalories.toFixed(1));
    } else {
      // currentUserが無ければログインを促す（別ページでログインする運用なら不要だが念のため）
      console.warn("ユーザー未ログイン。履歴は保存されません。");
      alert("履歴を保存するにはログインしてください（別タブでログイン済みであればページを再読み込みしてください）。");
    }
  });

  const addHistoryItem = (id, timeStr, kcalStr) => {
    const item = document.createElement("li");
    item.className = "list-group-item d-flex justify-content-between align-items-center";
    item.innerHTML = `<span>${timeStr}：${kcalStr} kcal</span>`;

    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.className = "btn btn-sm btn-outline-danger";
    delBtn.addEventListener("click", () => {
      if (confirm("この記録を削除しますか？")) {
        db.ref(`calorieRecords/${currentUser.uid}/${id}`).remove().then(() => {
          historyList.removeChild(item);
        });
      }
    });

    item.appendChild(delBtn);
    historyList.prepend(item);
  };

  // 履歴読み込み
  const loadHistoryFromRealtimeDB = () => {
    if (!currentUser) return;
    const refDb = db.ref(`calorieRecords/${currentUser.uid}`);
    refDb.orderByChild("timestamp").limitToLast(30).once("value", snapshot => {
      historyList.innerHTML = ""; // 表示をリセットして重複を防ぐ
      const records = [];
      snapshot.forEach(child => {
        records.push({ id: child.key, ...child.val() });
      });
      records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      records.forEach(record => {
        const timeStr = new Date(record.timestamp).toLocaleString();
        const kcalStr = parseFloat(record.kcal).toFixed(1);
        addHistoryItem(record.id, timeStr, kcalStr);
      });
    });
  };

  // 目標設定
  setGoalBtn.addEventListener("click", () => {
    const newGoal = parseFloat(goalInput.value);
    if (isNaN(newGoal) || newGoal <= 0) {
      alert("有効なカロリー数を入力してください。");
      return;
    }
    const lastSet = localStorage.getItem("goalSetDate");
    const now = new Date();
    if (lastSet) {
      const diffDays = (now - new Date(lastSet)) / (1000 * 60 * 60 * 24);
      if (diffDays < 7) {
        goalStatus.textContent = `※ 目標はあと${Math.ceil(7 - diffDays)}日間変更できません。`;
        return;
      }
    }
    localStorage.setItem("calorieGoal", newGoal);
    localStorage.setItem("goalSetDate", now.toISOString());
    goalStatus.textContent = `目標カロリー（${newGoal} kcal）を設定しました。`;
  });

  // ログイン（HTMLにlogin-btnがあれば設定）
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      auth.signInWithPopup(provider).catch(e => alert("ログイン失敗: " + e.message));
    });
  }

  // 認証状態 - loginBtnが無くても問題なく動くように安全に処理
  auth.onAuthStateChanged(user => {
    currentUser = user || null;
    if (loginBtn) {
      loginBtn.style.display = user ? "none" : "inline-block";
    }
    if (currentUser) {
      // 履歴を読み込む（ログイン済みなら）
      loadHistoryFromRealtimeDB();
    }
  });

  // ページロード時に既にログイン済みなら履歴を読み込む（別タブでログイン済みの場合に対応）
  if (auth.currentUser) {
    currentUser = auth.currentUser;
    loadHistoryFromRealtimeDB();
    if (loginBtn) loginBtn.style.display = "none";
  }

  // 最低1つのエントリは常に表示する
  createEntry();

  const storedGoal = localStorage.getItem("calorieGoal");
  if (storedGoal) {
    goalStatus.textContent = `現在の目標：${storedGoal} kcal`;
  }
});

