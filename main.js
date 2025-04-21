// アクティブな入力欄を管理
let activeInput = null;

// DOM取得
const heightInput = document.getElementById('height-input');
const weightInput = document.getElementById('weight-input');
const heightButton = document.getElementById('focus-height');
const weightButton = document.getElementById('focus-weight');
const keypadButtons = document.querySelectorAll('.keypad-btn');

// 入力欄をボタンクリックで切り替え
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

// テンキーでの入力処理
keypadButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    if (!activeInput) return; // 入力先が選ばれていない
    const val = btn.textContent;

    if (val === '⌫') {
      activeInput.value = activeInput.value.slice(0, -1);
    } else {
      activeInput.value += val;
    }
  });
});

// 計算実行
document.getElementById('button-submit').addEventListener('click', () => {
  const height = parseFloat(heightInput.value);
  const weight = parseFloat(weightInput.value);

  if (isNaN(height) || isNaN(weight) || height <= 0 || weight <= 0) {
    alert('正しい数値を入力してください。');
    return;
  }

  const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
  document.getElementById('bmi-output').textContent = bmi;

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
  document.getElementById('message').textContent = message;

  saveBMIHistory(bmi);
  displayHistory();
});

// リセット処理
document.getElementById('button-reset').addEventListener('click', () => {
  heightInput.value = '';
  weightInput.value = '';
  document.getElementById('bmi-output').textContent = '';
  document.getElementById('message').textContent = '';
});

// ユーザーごとにCookieからユーザー名を取得
function getCurrentUsername() {
  const params = new URLSearchParams(window.location.search);
  return params.get('user') || '';
}

// BMI履歴保存
function saveBMIHistory(bmi) {
  const username = getCurrentUsername();
  if (!username) return;

  const key = `bmi_history_${username}`;
  let history = JSON.parse(localStorage.getItem(key)) || [];

  history.unshift({ date: new Date().toISOString(), value: bmi });
  if (history.length > 30) history = history.slice(0, 30);

  localStorage.setItem(key, JSON.stringify(history));
}

// BMI履歴表示
function displayHistory() {
  const username = getCurrentUsername();
  if (!username) return;

  const key = `bmi_history_${username}`;
  const history = JSON.parse(localStorage.getItem(key)) || [];

  const list = document.getElementById('bmi-history');
  list.innerHTML = '';
  history.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    const date = new Date(entry.date).toLocaleString();
    li.textContent = `${date} - ${entry.value}`;
    list.appendChild(li);
  });
}
