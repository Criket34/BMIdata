// main.js

// Firebase 初期化（Realtime Database を使用）
const firebaseConfig = {
  apiKey: "AIzaSyAqrTNSA-E-fq_63oS3cNjgeC7WYr3l-bQ",
  authDomain: "bmi-app-a99f3.firebaseapp.com",
  projectId: "bmi-app-a99f3",
  storageBucket: "bmi-app-a99f3.appspot.com",
  databaseURL: "https://bmi-app-a99f3-default-rtdb.firebaseio.com"
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();

let activeInput = null;

const heightInput = document.getElementById('height-input');
const weightInput = document.getElementById('weight-input');
const heightButton = document.getElementById('focus-height');
const weightButton = document.getElementById('focus-weight');
const keypadButtons = document.querySelectorAll('.keypad-btn');
const errorMessage = document.getElementById('error-message');
const bmiOutput = document.getElementById('bmi-output');
const messageOutput = document.getElementById('message');
const bmiHistoryList = document.getElementById('bmi-history');

// 入力欄切り替え
heightButton && heightButton.addEventListener('click', () => {
  activeInput = heightInput;
  heightInput.classList.add('border-primary');
  weightInput.classList.remove('border-primary');
  heightInput.focus();
});

weightButton && weightButton.addEventListener('click', () => {
  activeInput = weightInput;
  weightInput.classList.add('border-primary');
  heightInput.classList.remove('border-primary');
  weightInput.focus();
});

// テンキー入力処理（主にモバイル）
keypadButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    if (!activeInput) return;
    const val = btn.textContent.trim();
    if (val === '⌫') {
      activeInput.value = activeInput.value.slice(0, -1);
    } else {
      activeInput.value += val;
    }
  });
});

// 全角→半角変換
function toHalfWidth(str) {
  if (!str) return str;
  return str.replace(/[！-～]/g, tmpStr =>
    String.fromCharCode(tmpStr.charCodeAt(0) - 0xFEE0)
  ).replace(/　/g, " ");
}

// BMI計算と保存
document.getElementById('button-submit').addEventListener('click', async () => {
  const height = parseFloat(toHalfWidth(heightInput.value));
  const weight = parseFloat(toHalfWidth(weightInput.value));
  const recordDate = document.getElementById("record-date").value; // YYYY-MM-DD or empty

  if (isNaN(height) || isNaN(weight) || height <= 0 || weight <= 0) {
    bmiOutput.textContent = '';
    errorMessage.textContent = '正しい数値を入力してください。';
    messageOutput.textContent = '';
    return;
  }

  errorMessage.textContent = '';
  const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
  bmiOutput.textContent = bmi;

  let message = '';
  const bmiNum = parseFloat(bmi);
if (bmiNum < 18.5) {
  message = '低体重（やせ）です。';
} else if (bmiNum < 25) {
  message = '普通体重です。';
} else if (bmiNum < 30) {
  message = '肥満（1度）です。';
} else if (bmiNum < 35) {
  message = '肥満（2度）です。';
} else if (bmiNum < 40) {
  message = '肥満（3度）です。';
} else if (bmiNum < 45) {
  message = '肥満（4度）です。';
} else {
  message = '高度肥満です。';
}
  messageOutput.textContent = message;

  const user = auth.currentUser;
  if (user) {
    // 日付は YYYY-MM-DD のみ（未指定なら今日）
    const date = recordDate || new Date().toISOString().split("T")[0];

    // 保存1：従来の履歴（bmi_history）
    const ref1 = db.ref(`bmi_history/${user.uid}`);
    const entry1 = {
      date: date,
      value: bmi
    };

    // 保存2：グラフ用履歴（users/UID/history）
    const ref2 = db.ref(`users/${user.uid}/history`);
    const entry2 = {
      date: date,
      height: height,
      weight: weight,
      bmi: bmi
    };

    try {
      // 並行して保存
      await Promise.all([
        ref1.push(entry1),
        ref2.push(entry2)
      ]);
      // 保存後は履歴表示更新
      displayHistory();
    } catch (err) {
      console.error("保存エラー:", err);
      errorMessage.textContent = "保存に失敗しました。リトライしてください。";
    }
  } else {
    // 認証されていない場合の振る舞い（元コードに合わせて遷移）
    alert('ログイン情報が無効です。ログインページに戻ります。');
    window.location.href = 'index.html';
  }
});

// リセット
document.getElementById('button-reset').addEventListener('click', () => {
  heightInput.value = '';
  weightInput.value = '';
  document.getElementById('record-date').value = '';
  bmiOutput.textContent = '';
  messageOutput.textContent = '';
  errorMessage.textContent = '';
});

// 履歴の表示（新しい順にソート）
function displayHistory() {
  const user = auth.currentUser;
  if (!user) return;

  const ref = db.ref(`bmi_history/${user.uid}`);
  ref.once('value').then(snapshot => {
    const data = snapshot.val();
    // data は { key: {date, value}, ... }
    const history = data ? Object.values(data).map(item => ({
      date: item.date,
      value: item.value
    })) : [];

    // date は "YYYY-MM-DD" 形式（あるいは ISO 時刻文字列が混在する場合を考慮）
    history.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const dbt = new Date(b.date).getTime();
      return dbt - da;
    });

    const recent = history.slice(0, 30);
    bmiHistoryList.innerHTML = '';
    recent.forEach(entry => {
      // 表示は基本 YYYY-MM-DD（もし ISO 時刻が入っていればローカル表示に切替）
      const dateStr = (typeof entry.date === 'string' && entry.date.includes('T'))
        ? new Date(entry.date).toLocaleString()
        : entry.date;
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.textContent = `${dateStr} - ${entry.value}`;
      bmiHistoryList.appendChild(li);
    });
  }).catch(err => {
    console.error("履歴取得エラー:", err);
  });
}

// 認証確認して履歴読み込み + グラフボタン処理
auth.onAuthStateChanged(user => {
  if (!user) {
    // 元の実装では未ログインなら index.html に戻す挙動でした。
    // アプリの方針で匿名ログインを使いたい場合はここで signInAnonymously(auth) を呼ぶ実装に変更できます。
    alert('ログイン情報が無効です。ログインページに戻ります。');
    window.location.href = 'index.html';
  } else {
    displayHistory();

    const graphButton = document.getElementById('view-graph-btn');
    if (graphButton) {
      graphButton.addEventListener('click', () => {
        window.location.href = `BMI-graph.html?user=${encodeURIComponent(user.uid)}`;
      });
    }
  }
});

