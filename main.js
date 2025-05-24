// Firebase 初期化
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
heightButton.addEventListener('click', () => {
  activeInput = heightInput;
  heightInput.classList.add('border-primary');
  weightInput.classList.remove('border-primary');
});

weightButton.addEventListener('click', () => {
  activeInput = weightInput;
  weightInput.classList.add('border-primary');
  heightInput.classList.remove('border-primary');
});

// テンキー入力処理
keypadButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    if (!activeInput) return;
    const val = btn.textContent;
    if (val === '⌫') {
      activeInput.value = activeInput.value.slice(0, -1);
    } else {
      activeInput.value += val;
    }
  });
});

// 全角→半角変換
function toHalfWidth(str) {
  return str.replace(/[！-～]/g, tmpStr =>
    String.fromCharCode(tmpStr.charCodeAt(0) - 0xFEE0)
  ).replace(/　/g, " ");
}

// BMI計算と保存
document.getElementById('button-submit').addEventListener('click', async () => {
  const height = parseFloat(toHalfWidth(heightInput.value));
  const weight = parseFloat(toHalfWidth(weightInput.value));

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
  if (bmi < 18.5) {
    message = '低体重です。';
  } else if (bmi < 25) {
    message = '普通体重です。';
  } else if (bmi < 30) {
    message = '肥満（1度）です。';
  } else {
    message = '高度肥満です。';
  }
  messageOutput.textContent = message;

  const user = auth.currentUser;
  if (user) {
    const timestamp = new Date().toISOString();

    // 保存1：従来の履歴（bmi_history）
    const ref1 = db.ref(`bmi_history/${user.uid}`);
    const entry1 = {
      date: timestamp,
      value: bmi
    };

    // 保存2：グラフ用履歴（users/UID/history）
    const ref2 = db.ref(`users/${user.uid}/history`);
    const entry2 = {
      date: timestamp,
      height: height,
      weight: weight,
      bmi: bmi
    };

    // 並行して保存
    await Promise.all([
      ref1.push(entry1),
      ref2.push(entry2)
    ]);

    displayHistory();
  }
});

// リセット
document.getElementById('button-reset').addEventListener('click', () => {
  heightInput.value = '';
  weightInput.value = '';
  bmiOutput.textContent = '';
  messageOutput.textContent = '';
  errorMessage.textContent = '';
});

// 履歴の表示
function displayHistory() {
  const user = auth.currentUser;
  if (!user) return;

  const ref = db.ref(`bmi_history/${user.uid}`);
  ref.once('value').then(snapshot => {
    const data = snapshot.val();
    const history = data ? Object.values(data) : [];

    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = history.slice(0, 30);

    bmiHistoryList.innerHTML = '';
    recent.forEach(entry => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      const date = new Date(entry.date).toLocaleString();
      li.textContent = `${date} - ${entry.value}`;
      bmiHistoryList.appendChild(li);
    });
  });
}

// 認証確認して履歴読み込み + グラフボタン処理
auth.onAuthStateChanged(user => {
  if (!user) {
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