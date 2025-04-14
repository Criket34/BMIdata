// 入力欄とボタンの取得
var height = document.getElementById('height-input'); // 身長入力
var weight = document.getElementById('weight-input'); // 体重入力
var button = document.getElementById('button-submit'); // 計測ボタン
var resetButton = document.getElementById('button-reset'); // リセットボタン

// 結果出力エリア
var output = document.getElementById('bmi-output'); // BMI表示
var message = document.getElementById('message');   // メッセージ表示（分類・エラー等）

// ▼ 入力チェックと変換 ▼

// 半角数字および小数点のみ許可（全角はNG）
function isNumericInput(value) {
  return /^[0-9.]+$/.test(value);
}

// 全角数字および句点（．、。）を半角へ変換
function toHalfWidth(str) {
  return str.replace(/[０-９．。]/g, function (s) {
    if (s === '．' || s === '。') {
      return '.';
    }
    return String.fromCharCode(s.charCodeAt(0) - 65248);
  });
}

// ▼ BMI計算ロジック ▼

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
  var bmi = w / (h * h);
  bmi = Math.round(bmi * 10) / 10;

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

  message.innerHTML = '<span class="text-success">あなたは「' + category + '」です。</span>';
};

// ▼ リセット機能 ▼

var resetForm = function () {
  height.value = '';
  weight.value = '';
  output.innerHTML = '';
  message.innerHTML = '';
};

// ▼ イベント登録 ▼

button.addEventListener('click', calcBmi);
resetButton.addEventListener('click', resetForm);

// ▼ スマホ用テンキー入力サポート ▼

// 現在フォーカスされている入力欄を追跡
var focusedInput = null;
height.addEventListener('focus', function () {
  focusedInput = height;
});
weight.addEventListener('focus', function () {
  focusedInput = weight;
});

// テンキーの各ボタンに入力動作を割り当てる
var keypadButtons = document.querySelectorAll('.keypad-btn');
keypadButtons.forEach(function (btn) {
  btn.addEventListener('click', function () {
    if (!focusedInput) return;

    const val = btn.textContent;

    if (val === '⌫') {
      focusedInput.value = focusedInput.value.slice(0, -1); // バックスペース
    } else {
      focusedInput.value += val; // 数字や . を追加
    }
  });
});