var height = document.getElementById('height-input');
var weight = document.getElementById('weight-input');
var button = document.getElementById('button-submit');
var resetButton = document.getElementById('button-reset');
var output = document.getElementById('bmi-output');
var message = document.getElementById('message');
var historyList = document.getElementById('bmi-history');

// 入力対象切り替え用
var selectedInput = height;
var selectHeightBtn = document.getElementById('select-height');
var selectWeightBtn = document.getElementById('select-weight');

function isNumericInput(value) {
  return /^[0-9.]+$/.test(value);
}

function toHalfWidth(str) {
  return str.replace(/[０-９．。]/g, function (s) {
    return (s === '．' || s === '。') ? '.' : String.fromCharCode(s.charCodeAt(0) - 65248);
  });
}

function setCookie(name, value, days) {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/`;
}

function getCookie(name) {
  const cookies = document.cookie.split('; ');
  for (let c of cookies) {
    const [key, val] = c.split('=');
    if (key === name) return decodeURIComponent(val);
  }
  return null;
}

// クエリパラメータからユーザー名取得
function getCurrentUsername() {
  const params = new URLSearchParams(window.location.search);
  return params.get('user') || 'guest';
}

// ユーザーごとの履歴保存
function saveBmiHistory(bmi) {
  const now = new Date();
  const entry = {
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    bmi: bmi
  };

  const username = getCurrentUsername();
  const key = `bmiHistory_${username}`;
  let history = JSON.parse(getCookie(key) || '[]');
  history.unshift(entry);
  if (history.length > 30) history = history.slice(0, 30);
  setCookie(key, JSON.stringify(history), 30);
  displayBmiHistory(history);
}

function displayBmiHistory(history) {
  historyList.innerHTML = '';
  history.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.textContent = `${entry.date} ${entry.time} - BMI: ${entry.bmi}`;
    historyList.appendChild(li);
  });
}

var calcBmi = function () {
  var h_value = toHalfWidth(height.value.trim());
  var w_value = toHalfWidth(weight.value.trim());

  if (!isNumericInput(h_value) || !isNumericInput(w_value)) {
    output.innerHTML = '';
    message.innerHTML = '<span class="text-danger">※ 数値のみを入力してください（例: 170, 65.5）</span>';
    return;
  }

  var h = parseFloat(h_value) / 100;
  var w = parseFloat(w_value);
  var bmi = Math.round((w / (h * h)) * 10) / 10;

  output.innerHTML = bmi;

  let category = '';
  if (bmi < 18.5) category = 'やせ型';
  else if (bmi < 25) category = '普通体重';
  else if (bmi < 30) category = '肥満（1度）';
  else if (bmi < 35) category = '肥満（2度）';
  else if (bmi < 40) category = '肥満（3度）';
  else category = '肥満（4度）';

  message.innerHTML = `<span class="text-success">あなたは「${category}」です。</span>`;

  saveBmiHistory(bmi);
};

var resetForm = function () {
  height.value = '';
  weight.value = '';
  output.innerHTML = '';
  message.innerHTML = '';
};

button.addEventListener('click', calcBmi);
resetButton.addEventListener('click', resetForm);

// 入力対象の切り替え処理
selectHeightBtn.addEventListener('click', function () {
  selectedInput = height;
  selectHeightBtn.classList.add('selected');
  selectWeightBtn.classList.remove('selected');
});

selectWeightBtn.addEventListener('click', function () {
  selectedInput = weight;
  selectWeightBtn.classList.add('selected');
  selectHeightBtn.classList.remove('selected');
});

// テンキー入力処理
document.querySelectorAll('.keypad-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    if (!selectedInput) return;
    const val = btn.textContent;
    if (val === '⌫') {
      selectedInput.value = selectedInput.value.slice(0, -1);
    } else {
      selectedInput.value += val;
    }
  });
});

// 初期化時に履歴を読み込む
window.addEventListener('load', () => {
  const username = getCurrentUsername();
  const key = `bmiHistory_${username}`;
  const saved = getCookie(key);
  if (saved) displayBmiHistory(JSON.parse(saved));

  // 初期選択を身長に設定
  selectHeightBtn.classList.add('selected');
  selectedInput = height;
});