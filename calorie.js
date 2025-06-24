// Firebase初期化
const firebaseConfig = {
  apiKey: "AIzaSyAqrTNSA-E-fq_63oS3cNjgeC7WYr3l-bQ",
  authDomain: "bmi-app-4f43e.firebaseapp.com",
  projectId: "bmi-app-4f43e",
  storageBucket: "bmi-app-4f43e.appspot.com",
  messagingSenderId: "456396663253",
  appId: "1:456396663253:web:07a2e25f65d429bc656e44"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let currentUser;

firebase.auth().signInAnonymously().then(userCredential => {
  currentUser = userCredential.user;
  loadHistoryFromFirestore();
});

document.addEventListener("DOMContentLoaded", () => {
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

  const DEFAULT_WEIGHT = 60;

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

  calculateBtn.addEventListener("click", async () => {
    const entries = entriesContainer.querySelectorAll(".entry-group");
    const weight = parseFloat(weightInput.value) || DEFAULT_WEIGHT;
    let totalCalories = 0;

    entries.forEach(entry => {
      const category = entry.querySelectorAll("select")[0].value;
      const activity = entry.querySelectorAll("select")[1].value;
      const minutes = parseFloat(entry.querySelector("input").value);
      if (!category || !activity || isNaN(minutes) || minutes <= 0) return;
      const met = CATEGORIES[category][activity];
      totalCalories += met * weight * minutes / 60;
    });

    resultBox.textContent = `合計消費カロリー：${totalCalories.toFixed(2)} kcal`;
    resultBox.style.display = "block";

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

    const now = new Date();
    const entry = {
      kcal: totalCalories,
      timestamp: firebase.firestore.Timestamp.fromDate(now)
    };

    if (currentUser) {
      const docRef = await db.collection("calorieRecords").add({
        uid: currentUser.uid,
        ...entry
      });
      addHistoryItem(docRef.id, now.toLocaleString(), totalCalories.toFixed(1));
    }
  });

  const addHistoryItem = (docId, timeStr, kcalStr) => {
    const historyItem = document.createElement("li");
    historyItem.className = "list-group-item d-flex justify-content-between align-items-center";
    historyItem.textContent = `${timeStr}：${kcalStr} kcal`;

    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.className = "btn btn-sm btn-outline-danger";
    delBtn.addEventListener("click", async () => {
      if (confirm("この記録を削除しますか？")) {
        await db.collection("calorieRecords").doc(docId).delete();
        historyList.removeChild(historyItem);
      }
    });

    historyItem.appendChild(delBtn);
    historyList.prepend(historyItem);
  };

  async function loadHistoryFromFirestore() {
    if (!currentUser) return;

    const snapshot = await db.collection("calorieRecords")
      .where("uid", "==", currentUser.uid)
      .orderBy("timestamp", "desc")
      .limit(30)
      .get();

    snapshot.forEach(doc => {
      const data = doc.data();
      const timeStr = data.timestamp.toDate().toLocaleString();
      const kcalStr = data.kcal.toFixed(1);
      addHistoryItem(doc.id, timeStr, kcalStr);
    });
  }

  setGoalBtn.addEventListener("click", () => {
    const newGoal = parseFloat(goalInput.value);
    if (isNaN(newGoal) || newGoal <= 0) {
      alert("有効なカロリー数を入力してください。");
      return;
    }

    const lastSetDate = localStorage.getItem("goalSetDate");
    const now = new Date();
    if (lastSetDate) {
      const diffDays = (now - new Date(lastSetDate)) / (1000 * 60 * 60 * 24);
      if (diffDays < 7) {
        const remaining = Math.ceil(7 - diffDays);
        goalStatus.textContent = `※ 目標はあと${remaining}日間変更できません。`;
        return;
      }
    }

    localStorage.setItem("calorieGoal", newGoal);
    localStorage.setItem("goalSetDate", now.toISOString());
    goalStatus.textContent = `目標カロリー（${newGoal} kcal）を設定しました。`;
  });

  createEntry(); // 初期項目

  const goal = localStorage.getItem("calorieGoal");
  if (goal) {
    goalStatus.textContent = `現在の目標：${goal} kcal`;
  }
});