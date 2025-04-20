// 入力欄とボタンの取得
var height = document.getElementById('height-input');
var weight = document.getElementById('weight-input');
var button = document.getElementById('button-submit');
var resetButton = document.getElementById('button-reset');

// 表示エリア
var output = document.getElementById('bmi-output');
var message = document.getElementById('message');
var historyList = document.getElementById('bmi-history');

// 入力のチェックと変換
function isNumericInput(value) {
  return /^[0-9.]+$/.test(value);
}

function toHalfWidth(str) {
  return str.replace(/[０-９．。]/g, function (s) {
    return (s === '．' || s === '。') ? '.' : String.fromCharCode(s.charCodeAt(0) - 65248);
  });
}

// Cookieの保存と取得
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

// ユーザー識別付きCookieキーを生成
function getUserCookieKey(baseKey) {
  const params = new URLSearchParams(window.location.search);
  const username = params.get('user') || 'guest';
  return `${baseKey}_${username}`;
}

// 履歴保存用
function saveBmiHistory(bmi) {
  const now = new Date();
  const entry = {
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    bmi: bmi
  };

  const key = getUserCookieKey('bmiHistory');
  let history = JSON.parse(getCookie(key) || '[]');
  history.unshift(entry);
  if (history.length > 30) history = history.slice(0, 30); // 最大30件
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

// 計算機能
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
  if (bmi < 18.5) {
    category = 'やせ型';
  } else if (bmi < 25) {
    category = '普通体重';
  } else if (bmi < 30) {
    category = '肥満（1度）';
  } else if (bmi < 35) {
    category = '肥満（2度）';
  } else if (bmi < 40) {
    category = '肥満（3度）';
  } else {
    category = '肥満（4度）';
  }

  message.innerHTML = `<span class="text-success">あなたは「${category}」です。</span>`;

  saveBmiHistory(bmi);
};

// リセット機能
var resetForm = function () {
  height.value = '';
  weight.value = '';
  output.innerHTML = '';
  message.innerHTML = '';
};

// イベント登録
button.addEventListener('click', calcBmi);
resetButton.addEventListener('click', resetForm);

// スマホテンキー機能
var focusedInput = null;
height.addEventListener('focus', function () { focusedInput = height; });
weight.addEventListener('focus', function () { focusedInput = weight; });

var keypadButtons = document.querySelectorAll('.keypad-btn');
keypadButtons.forEach(function (btn) {
  btn.addEventListener('click', function () {
    if (!focusedInput) return;
    const val = btn.textContent;
    if (val === '⌫') {
      focusedInput.value = focusedInput.value.slice(0, -1);
    } else {
      focusedInput.value += val;
    }
  });
});

// 初期化：履歴とユーザー名の表示
window.addEventListener('load', () => {
  const params = new URLSearchParams(window.location.search);
  const username = params.get('user') || 'ゲスト';

  const key = getUserCookieKey('bmiHistory');
  const saved = getCookie(key);
  if (saved) {
    displayBmiHistory(JSON.parse(saved));
  }

  const userDisplay = document.getElementById('user-display');
  if (userDisplay) {
    userDisplay.textContent = `（こんにちは、${username}さん）`;
  }
});
