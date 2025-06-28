// Firebase 初期化
const firebaseConfig = {
  apiKey: "AIzaSyAqrTNSA-E-fq_63oS3cNjgeC7WYr3l-bQ",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let lastGoalSetDate = null;
const calorieData = {
  "ウォーキング": {
    "普通歩行": 4,
    "速歩き": 5,
  },
  "ランニング": {
    "軽いランニング": 10,
    "全力疾走": 16,
  },
  "サイクリング": {
    "ゆっくりサイクリング": 6,
    "速いサイクリング": 10,
  },
  "筋トレ（自重）": {
    "腕立て伏せ": 8,
    "スクワット": 7,
  },
  "ストレッチ・軽運動": {
    "ストレッチ": 2.5,
    "ヨガ": 3,
  },
  "その他運動": {
    "ダンス": 7,
    "縄跳び": 12,
  }
};

document.addEventListener("DOMContentLoaded", () => {
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      loadHistory();
      loadCalorieGoal();
    } else {
      // ログインしていなければログインページにリダイレクト
      window.location.href = "login.html";
    }
  });

  document.getElementById("add-entry-btn").addEventListener("click", addEntry);
  document.getElementById("calculate-btn").addEventListener("click", calculateTotalCalories);
  document.getElementById("set-goal-btn").addEventListener("click", setCalorieGoal);

  addEntry(); // 初期表示
});

function addEntry() {
  const entryDiv = document.createElement("div");
  entryDiv.className = "entry-group";

  const categorySelect = document.createElement("select");
  categorySelect.className = "form-control mb-2";
  categorySelect.innerHTML = `<option disabled selected>運動カテゴリーを選択</option>`;
  for (let category in calorieData) {
    categorySelect.innerHTML += `<option value="${category}">${category}</option>`;
  }

  const activitySelect = document.createElement("select");
  activitySelect.className = "form-control mb-2";
  activitySelect.disabled = true;

  categorySelect.addEventListener("change", () => {
    const selectedCategory = categorySelect.value;
    activitySelect.innerHTML = "";
    for (let activity in calorieData[selectedCategory]) {
      activitySelect.innerHTML += `<option value="${activity}">${activity}</option>`;
    }
    activitySelect.disabled = false;
    updateCalorieResult();
  });

  const timeInput = document.createElement("input");
  timeInput.type = "number";
  timeInput.placeholder = "運動時間（分）";
  timeInput.className = "form-control mb-2";

  const kcalDiv = document.createElement("div");
  kcalDiv.className = "kcal-result";

  activitySelect.addEventListener("change", updateCalorieResult);
  timeInput.addEventListener("input", updateCalorieResult);

  function updateCalorieResult() {
    const category = categorySelect.value;
    const activity = activitySelect.value;
    const time = parseFloat(timeInput.value);

    if (category && activity && !isNaN(time)) {
      const kcalPerMin = calorieData[category][activity];
      const totalKcal = kcalPerMin * time;
      kcalDiv.textContent = `消費カロリー：${totalKcal.toFixed(1)} kcal`;
    } else {
      kcalDiv.textContent = "";
    }
  }

  entryDiv.appendChild(categorySelect);
  entryDiv.appendChild(activitySelect);
  entryDiv.appendChild(timeInput);
  entryDiv.appendChild(kcalDiv);
  document.getElementById("entries").appendChild(entryDiv);
}

function calculateTotalCalories() {
  const weight = parseFloat(document.getElementById("user-weight").value);
  if (isNaN(weight) || weight <= 0) {
    alert("体重を正しく入力してください。");
    return;
  }

  const entries = document.querySelectorAll(".entry-group");
  let totalCalories = 0;
  let activityList = [];

  entries.forEach(entry => {
    const selects = entry.getElementsByTagName("select");
    const input = entry.getElementsByTagName("input")[0];
    const category = selects[0].value;
    const activity = selects[1].value;
    const time = parseFloat(input.value);

    if (category && activity && !isNaN(time)) {
      const kcalPerMin = calorieData[category][activity];
      const calories = kcalPerMin * time;
      totalCalories += calories;
      activityList.push({ category, activity, time, calories });
    }
  });

  if (activityList.length === 0) {
    alert("少なくとも1つの運動項目を正しく入力してください。");
    return;
  }

  const resultDiv = document.getElementById("result");
  resultDiv.style.display = "block";
  resultDiv.textContent = `合計消費カロリー：${totalCalories.toFixed(1)} kcal`;
  saveHistory(totalCalories, activityList);
  showComparisonChart(totalCalories);
}

function saveHistory(totalCalories, activityList) {
  if (!currentUser) return;
  const uid = currentUser.uid;
  db.collection("calorieHistory").add({
    uid,
    timestamp: new Date(),
    totalCalories,
    activityList
  }).then(() => {
    loadHistory();
  });
}

function loadHistory() {
  if (!currentUser) return;
  const uid = currentUser.uid;
  db.collection("calorieHistory")
    .where("uid", "==", uid)
    .orderBy("timestamp", "desc")
    .limit(30)
    .get()
    .then(snapshot => {
      const list = document.getElementById("history-list");
      list.innerHTML = "";
      snapshot.forEach(doc => {
        const data = doc.data();
        const li = document.createElement("li");
        li.className = "list-group-item";
        const date = data.timestamp.toDate().toLocaleString();
        li.textContent = `${date} - ${data.totalCalories.toFixed(1)} kcal`;
        list.appendChild(li);
      });
    });
}

function setCalorieGoal() {
  const goal = parseFloat(document.getElementById("calorie-goal").value);
  if (isNaN(goal) || goal <= 0) {
    alert("有効な目標カロリーを入力してください。");
    return;
  }

  const now = new Date();
  if (lastGoalSetDate && (now - lastGoalSetDate < 7 * 24 * 60 * 60 * 1000)) {
    alert("目標は週に1回のみ変更できます。");
    return;
  }

  const uid = currentUser.uid;
  db.collection("calorieGoals").doc(uid).set({
    goal,
    updatedAt: firebase.firestore.Timestamp.fromDate(now)
  }).then(() => {
    lastGoalSetDate = now;
    document.getElementById("goal-status").textContent = `現在の目標：${goal} kcal`;
  });
}

function loadCalorieGoal() {
  const uid = currentUser.uid;
  db.collection("calorieGoals").doc(uid).get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      const goal = data.goal;
      const updatedAt = data.updatedAt.toDate();
      lastGoalSetDate = updatedAt;
      document.getElementById("goal-status").textContent = `現在の目標：${goal} kcal`;
    }
  });
}

function showComparisonChart(todayCalories) {
  const uid = currentUser.uid;
  db.collection("calorieGoals").doc(uid).get().then(doc => {
    if (doc.exists) {
      const goal = doc.data().goal;
      const ctx = document.getElementById("comparisonChart").getContext("2d");
      document.getElementById("comparisonChart").style.display = "block";

      if (window.myChart) {
        window.myChart.destroy();
      }

      window.myChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["目標", "今日の消費"],
          datasets: [{
            label: "カロリー（kcal）",
            data: [goal, todayCalories],
            backgroundColor: ["#28a745", "#007bff"]
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
  });
}
