// Firebaseの初期化
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAqrTNSA-E-fq_63oS3cNjgeC7WYr3l-bQ",
  authDomain: "bmi-app-66f17.firebaseapp.com",
  databaseURL: "https://bmi-app-66f17-default-rtdb.firebaseio.com",
  projectId: "bmi-app-66f17",
  storageBucket: "bmi-app-66f17.appspot.com",
  messagingSenderId: "62015875801",
  appId: "1:62015875801:web:4e2be71cddc041ea2ed87c",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadCalorieHistory();
  } else {
    window.location.href = "login.html"; // ログインしていない場合はリダイレクト
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  });
});

// カロリー計算のロジック（MET値使用）
const exerciseData = {
  "ウォーキング": {
    "速歩き": 4.3,
    "ゆっくり歩く": 2.8,
  },
  "ランニング": {
    "ジョギング": 7.0,
    "ランニング": 9.8,
  },
  "サイクリング": {
    "ゆっくり": 4.0,
    "速く": 8.5,
  },
  "筋トレ（自重）": {
    "腕立て伏せ": 3.8,
    "スクワット": 5.0,
  },
  "ストレッチ・軽運動": {
    "ストレッチ": 2.3,
    "ヨガ": 2.5,
  },
  "その他運動": {
    "縄跳び": 11.0,
    "水泳": 8.0,
  },
};

// カテゴリと種目の動的生成
const categorySelect = document.getElementById("category");
const exerciseSelect = document.getElementById("exercise");
const exerciseInfoDiv = document.getElementById("exerciseInfo"); // MET表示用

for (const category in exerciseData) {
  const option = document.createElement("option");
  option.value = category;
  option.textContent = category;
  categorySelect.appendChild(option);
}

categorySelect.addEventListener("change", () => {
  const selectedCategory = categorySelect.value;
  exerciseSelect.innerHTML = "<option value=''>選択してください</option>";
  exerciseInfoDiv.textContent = "";

  if (exerciseData[selectedCategory]) {
    for (const exercise in exerciseData[selectedCategory]) {
      const option = document.createElement("option");
      option.value = exercise;
      option.textContent = exercise;
      exerciseSelect.appendChild(option);
    }
  }
});

exerciseSelect.addEventListener("change", () => {
  const selectedCategory = categorySelect.value;
  const selectedExercise = exerciseSelect.value;

  if (exerciseData[selectedCategory] && exerciseData[selectedCategory][selectedExercise]) {
    const metValue = exerciseData[selectedCategory][selectedExercise];
    exerciseInfoDiv.textContent = `この運動のMET値は ${metValue} です。`;
  } else {
    exerciseInfoDiv.textContent = "";
  }
});

// 記録ボタン
document.getElementById("recordBtn").addEventListener("click", () => {
  const category = categorySelect.value;
  const exercise = exerciseSelect.value;
  const duration = parseFloat(document.getElementById("duration").value);
  const weight = parseFloat(document.getElementById("weight").value);

  if (!category || !exercise || isNaN(duration) || isNaN(weight)) {
    alert("すべての項目を正しく入力してください。");
    return;
  }

  const met = exerciseData[category][exercise];
  const calories = (met * weight * duration) / 60;

  const newRecord = {
    category,
    exercise,
    duration,
    weight,
    met,
    calories: Math.round(calories * 10) / 10,
    timestamp: Date.now(),
  };

  const userCaloriesRef = ref(database, `users/${currentUser.uid}/calories`);
  push(userCaloriesRef, newRecord);

  document.getElementById("duration").value = "";
  document.getElementById("weight").value = "";
  exerciseInfoDiv.textContent = "";
  exerciseSelect.innerHTML = "<option value=''>選択してください</option>";
});

// 履歴の読み込み
function loadCalorieHistory() {
  const userCaloriesRef = ref(database, `users/${currentUser.uid}/calories`);
  const list = document.getElementById("historyList");
  list.innerHTML = "";

  onValue(userCaloriesRef, (snapshot) => {
    list.innerHTML = "";
    const data = snapshot.val();

    if (!data) {
      list.innerHTML = "<p>記録がありません。</p>";
      return;
    }

    const records = Object.entries(data).sort((a, b) => {
      return b[1].timestamp - a[1].timestamp;
    });

    records.forEach(([key, record]) => {
      const li = document.createElement("li");
      li.textContent = `${record.exercise}（${record.duration}分, ${record.calories} kcal）`;
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "削除";
      deleteBtn.addEventListener("click", () => {
        const recordRef = ref(database, `users/${currentUser.uid}/calories/${key}`);
        remove(recordRef);
      });
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  });
}
